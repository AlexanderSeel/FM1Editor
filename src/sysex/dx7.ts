import type {
  Dx7Curve,
  Dx7LfoWaveform,
  Dx7Operator,
  Dx7Voice,
  FourValues,
} from '../domain/voice'

export const DX7_MANUFACTURER_ID = 0x43
export const DX7_SINGLE_FORMAT = 0x00
export const DX7_BANK_FORMAT = 0x09
export const DX7_SINGLE_DATA_LENGTH = 155
export const DX7_PACKED_VOICE_LENGTH = 128
export const DX7_BANK_VOICE_COUNT = 32
export const DX7_BANK_DATA_LENGTH = DX7_PACKED_VOICE_LENGTH * DX7_BANK_VOICE_COUNT
export const DX7_SINGLE_MESSAGE_LENGTH = DX7_SINGLE_DATA_LENGTH + 8
export const DX7_BANK_MESSAGE_LENGTH = DX7_BANK_DATA_LENGTH + 8

const curves: readonly Dx7Curve[] = [
  'negative-linear',
  'negative-exponential',
  'positive-exponential',
  'positive-linear',
]

const waveforms: readonly Dx7LfoWaveform[] = [
  'triangle',
  'saw-down',
  'saw-up',
  'square',
  'sine',
  'sample-and-hold',
]

export class Dx7SysexError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Dx7SysexError'
  }
}

function asFour(data: Uint8Array, offset: number): FourValues {
  return [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0, data[offset + 3] ?? 0]
}

function assertRange(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Dx7SysexError(`${name} must be an integer from ${minimum} to ${maximum}; received ${value}.`)
  }
}

function writeRange(target: Uint8Array, offset: number, values: FourValues, maximum = 99): void {
  values.forEach((value, index) => {
    assertRange(`value at ${offset + index}`, value, 0, maximum)
    target[offset + index] = value
  })
}

function readName(data: Uint8Array, offset: number): string {
  return Array.from(data.slice(offset, offset + 10), (value) => String.fromCharCode(value & 0x7f))
    .join('')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trimEnd()
}

function writeName(target: Uint8Array, offset: number, name: string): void {
  const normalized = name.toUpperCase().replace(/[^\x20-\x7e]/g, ' ').slice(0, 10).padEnd(10, ' ')
  for (let index = 0; index < 10; index += 1) {
    target[offset + index] = normalized.charCodeAt(index) & 0x7f
  }
}

function readCurve(value: number): Dx7Curve {
  return curves[value & 0x03] ?? 'negative-linear'
}

function writeCurve(curve: Dx7Curve): number {
  const index = curves.indexOf(curve)
  if (index < 0) throw new Dx7SysexError(`Unsupported keyboard-scaling curve: ${curve}.`)
  return index
}

function readWaveform(value: number): Dx7LfoWaveform {
  return waveforms[value] ?? 'triangle'
}

function writeWaveform(waveform: Dx7LfoWaveform): number {
  const index = waveforms.indexOf(waveform)
  if (index < 0) throw new Dx7SysexError(`Unsupported LFO waveform: ${waveform}.`)
  return index
}

function decodeUnpackedOperator(data: Uint8Array, offset: number): Dx7Operator {
  return {
    envelope: {
      rates: asFour(data, offset),
      levels: asFour(data, offset + 4),
    },
    keyboardScaling: {
      breakPoint: data[offset + 8] ?? 0,
      leftDepth: data[offset + 9] ?? 0,
      rightDepth: data[offset + 10] ?? 0,
      leftCurve: readCurve(data[offset + 11] ?? 0),
      rightCurve: readCurve(data[offset + 12] ?? 0),
      rateScaling: data[offset + 13] ?? 0,
    },
    amplitudeModulationSensitivity: data[offset + 14] ?? 0,
    keyVelocitySensitivity: data[offset + 15] ?? 0,
    outputLevel: data[offset + 16] ?? 0,
    oscillatorMode: (data[offset + 17] ?? 0) === 0 ? 'ratio' : 'fixed',
    frequencyCoarse: data[offset + 18] ?? 0,
    frequencyFine: data[offset + 19] ?? 0,
    detune: data[offset + 20] ?? 0,
  }
}

function decodePackedOperator(data: Uint8Array, offset: number): Dx7Operator {
  const curvesAndScaling = data[offset + 11] ?? 0
  const modulationAndVelocity = data[offset + 12] ?? 0
  const oscillatorAndCoarse = data[offset + 14] ?? 0

  return {
    envelope: {
      rates: asFour(data, offset),
      levels: asFour(data, offset + 4),
    },
    keyboardScaling: {
      breakPoint: data[offset + 8] ?? 0,
      leftDepth: data[offset + 9] ?? 0,
      rightDepth: data[offset + 10] ?? 0,
      leftCurve: readCurve(curvesAndScaling),
      rightCurve: readCurve(curvesAndScaling >> 2),
      rateScaling: (curvesAndScaling >> 4) & 0x07,
    },
    amplitudeModulationSensitivity: modulationAndVelocity & 0x03,
    keyVelocitySensitivity: (modulationAndVelocity >> 2) & 0x07,
    outputLevel: data[offset + 13] ?? 0,
    oscillatorMode: (oscillatorAndCoarse & 0x01) === 0 ? 'ratio' : 'fixed',
    frequencyCoarse: (oscillatorAndCoarse >> 1) & 0x1f,
    frequencyFine: data[offset + 15] ?? 0,
    detune: data[offset + 16] ?? 0,
  }
}

function validateOperator(operator: Dx7Operator, label: string): void {
  operator.envelope.rates.forEach((value, index) => assertRange(`${label} envelope rate ${index + 1}`, value, 0, 99))
  operator.envelope.levels.forEach((value, index) => assertRange(`${label} envelope level ${index + 1}`, value, 0, 99))
  assertRange(`${label} breakpoint`, operator.keyboardScaling.breakPoint, 0, 99)
  assertRange(`${label} left depth`, operator.keyboardScaling.leftDepth, 0, 99)
  assertRange(`${label} right depth`, operator.keyboardScaling.rightDepth, 0, 99)
  assertRange(`${label} rate scaling`, operator.keyboardScaling.rateScaling, 0, 7)
  assertRange(`${label} amplitude modulation sensitivity`, operator.amplitudeModulationSensitivity, 0, 3)
  assertRange(`${label} key velocity sensitivity`, operator.keyVelocitySensitivity, 0, 7)
  assertRange(`${label} output level`, operator.outputLevel, 0, 99)
  assertRange(`${label} frequency coarse`, operator.frequencyCoarse, 0, 31)
  assertRange(`${label} frequency fine`, operator.frequencyFine, 0, 99)
  assertRange(`${label} detune`, operator.detune, 0, 14)
}

export function validateVoice(voice: Dx7Voice): void {
  if (voice.operators.length !== 6) throw new Dx7SysexError('A DX7 voice must contain exactly six operators.')
  voice.operators.forEach((operator, index) => validateOperator(operator, `OP${index + 1}`))
  voice.pitchEnvelope.rates.forEach((value, index) => assertRange(`pitch envelope rate ${index + 1}`, value, 0, 99))
  voice.pitchEnvelope.levels.forEach((value, index) => assertRange(`pitch envelope level ${index + 1}`, value, 0, 99))
  assertRange('algorithm', voice.algorithm, 1, 32)
  assertRange('feedback', voice.feedback, 0, 7)
  assertRange('LFO speed', voice.lfo.speed, 0, 99)
  assertRange('LFO delay', voice.lfo.delay, 0, 99)
  assertRange('LFO pitch modulation depth', voice.lfo.pitchModulationDepth, 0, 99)
  assertRange('LFO amplitude modulation depth', voice.lfo.amplitudeModulationDepth, 0, 99)
  assertRange('LFO pitch modulation sensitivity', voice.lfo.pitchModulationSensitivity, 0, 7)
  assertRange('transpose', voice.transpose, 0, 48)
}

export function decodeSingleVoiceData(data: Uint8Array): Dx7Voice {
  if (data.length !== DX7_SINGLE_DATA_LENGTH) {
    throw new Dx7SysexError(`Single-voice data must contain ${DX7_SINGLE_DATA_LENGTH} bytes.`)
  }

  const operators = new Array<Dx7Operator>(6) as [
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
  ]
  for (let block = 0; block < 6; block += 1) {
    operators[5 - block] = decodeUnpackedOperator(data, block * 21)
  }

  return {
    name: readName(data, 145),
    operators,
    pitchEnvelope: { rates: asFour(data, 126), levels: asFour(data, 130) },
    algorithm: (data[134] ?? 0) + 1,
    feedback: data[135] ?? 0,
    oscillatorKeySync: (data[136] ?? 0) !== 0,
    lfo: {
      speed: data[137] ?? 0,
      delay: data[138] ?? 0,
      pitchModulationDepth: data[139] ?? 0,
      amplitudeModulationDepth: data[140] ?? 0,
      keySync: (data[141] ?? 0) !== 0,
      waveform: readWaveform(data[142] ?? 0),
      pitchModulationSensitivity: data[143] ?? 0,
    },
    transpose: data[144] ?? 0,
    source: { unpacked: data.slice() },
  }
}

export function encodeSingleVoiceData(voice: Dx7Voice): Uint8Array {
  validateVoice(voice)
  const data = voice.source?.unpacked?.length === DX7_SINGLE_DATA_LENGTH
    ? voice.source.unpacked.slice()
    : new Uint8Array(DX7_SINGLE_DATA_LENGTH)

  for (let block = 0; block < 6; block += 1) {
    const operator = voice.operators[5 - block]
    if (!operator) throw new Dx7SysexError(`Missing OP${6 - block}.`)
    const offset = block * 21
    writeRange(data, offset, operator.envelope.rates)
    writeRange(data, offset + 4, operator.envelope.levels)
    data[offset + 8] = operator.keyboardScaling.breakPoint
    data[offset + 9] = operator.keyboardScaling.leftDepth
    data[offset + 10] = operator.keyboardScaling.rightDepth
    data[offset + 11] = writeCurve(operator.keyboardScaling.leftCurve)
    data[offset + 12] = writeCurve(operator.keyboardScaling.rightCurve)
    data[offset + 13] = operator.keyboardScaling.rateScaling
    data[offset + 14] = operator.amplitudeModulationSensitivity
    data[offset + 15] = operator.keyVelocitySensitivity
    data[offset + 16] = operator.outputLevel
    data[offset + 17] = operator.oscillatorMode === 'fixed' ? 1 : 0
    data[offset + 18] = operator.frequencyCoarse
    data[offset + 19] = operator.frequencyFine
    data[offset + 20] = operator.detune
  }

  writeRange(data, 126, voice.pitchEnvelope.rates)
  writeRange(data, 130, voice.pitchEnvelope.levels)
  data[134] = voice.algorithm - 1
  data[135] = voice.feedback
  data[136] = voice.oscillatorKeySync ? 1 : 0
  data[137] = voice.lfo.speed
  data[138] = voice.lfo.delay
  data[139] = voice.lfo.pitchModulationDepth
  data[140] = voice.lfo.amplitudeModulationDepth
  data[141] = voice.lfo.keySync ? 1 : 0
  data[142] = writeWaveform(voice.lfo.waveform)
  data[143] = voice.lfo.pitchModulationSensitivity
  data[144] = voice.transpose
  writeName(data, 145, voice.name)
  return data
}

export function decodePackedVoice(data: Uint8Array): Dx7Voice {
  if (data.length !== DX7_PACKED_VOICE_LENGTH) {
    throw new Dx7SysexError(`Packed voice data must contain ${DX7_PACKED_VOICE_LENGTH} bytes.`)
  }

  const operators = new Array<Dx7Operator>(6) as [
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
    Dx7Operator,
  ]
  for (let block = 0; block < 6; block += 1) {
    operators[5 - block] = decodePackedOperator(data, block * 17)
  }

  const feedbackAndSync = data[111] ?? 0
  const lfoSettings = data[116] ?? 0

  return {
    name: readName(data, 118),
    operators,
    pitchEnvelope: { rates: asFour(data, 102), levels: asFour(data, 106) },
    algorithm: (data[110] ?? 0) + 1,
    feedback: feedbackAndSync & 0x07,
    oscillatorKeySync: (feedbackAndSync & 0x08) !== 0,
    lfo: {
      speed: data[112] ?? 0,
      delay: data[113] ?? 0,
      pitchModulationDepth: data[114] ?? 0,
      amplitudeModulationDepth: data[115] ?? 0,
      keySync: (lfoSettings & 0x01) !== 0,
      waveform: readWaveform((lfoSettings >> 1) & 0x07),
      pitchModulationSensitivity: (lfoSettings >> 4) & 0x07,
    },
    transpose: data[117] ?? 0,
    source: { packed: data.slice() },
  }
}

export function encodePackedVoice(voice: Dx7Voice): Uint8Array {
  validateVoice(voice)
  const data = voice.source?.packed?.length === DX7_PACKED_VOICE_LENGTH
    ? voice.source.packed.slice()
    : new Uint8Array(DX7_PACKED_VOICE_LENGTH)

  for (let block = 0; block < 6; block += 1) {
    const operator = voice.operators[5 - block]
    if (!operator) throw new Dx7SysexError(`Missing OP${6 - block}.`)
    const offset = block * 17
    writeRange(data, offset, operator.envelope.rates)
    writeRange(data, offset + 4, operator.envelope.levels)
    data[offset + 8] = operator.keyboardScaling.breakPoint
    data[offset + 9] = operator.keyboardScaling.leftDepth
    data[offset + 10] = operator.keyboardScaling.rightDepth
    data[offset + 11] =
      ((data[offset + 11] ?? 0) & 0x80) |
      writeCurve(operator.keyboardScaling.leftCurve) |
      (writeCurve(operator.keyboardScaling.rightCurve) << 2) |
      (operator.keyboardScaling.rateScaling << 4)
    data[offset + 12] =
      ((data[offset + 12] ?? 0) & 0x60) |
      operator.amplitudeModulationSensitivity |
      (operator.keyVelocitySensitivity << 2)
    data[offset + 13] = operator.outputLevel
    data[offset + 14] =
      ((data[offset + 14] ?? 0) & 0x40) |
      (operator.oscillatorMode === 'fixed' ? 1 : 0) |
      (operator.frequencyCoarse << 1)
    data[offset + 15] = operator.frequencyFine
    data[offset + 16] = operator.detune
  }

  writeRange(data, 102, voice.pitchEnvelope.rates)
  writeRange(data, 106, voice.pitchEnvelope.levels)
  data[110] = voice.algorithm - 1
  data[111] = ((data[111] ?? 0) & 0x70) | voice.feedback | (voice.oscillatorKeySync ? 0x08 : 0)
  data[112] = voice.lfo.speed
  data[113] = voice.lfo.delay
  data[114] = voice.lfo.pitchModulationDepth
  data[115] = voice.lfo.amplitudeModulationDepth
  data[116] =
    ((data[116] ?? 0) & 0x80) |
    (voice.lfo.keySync ? 1 : 0) |
    (writeWaveform(voice.lfo.waveform) << 1) |
    (voice.lfo.pitchModulationSensitivity << 4)
  data[117] = voice.transpose
  writeName(data, 118, voice.name)
  return data
}

export function calculateYamahaChecksum(data: Uint8Array): number {
  let sum = 0
  for (const value of data) sum = (sum + value) & 0x7f
  return (-sum) & 0x7f
}

function assertMessageEnvelope(message: Uint8Array, expectedLength: number, format: number, dataLength: number): number {
  if (message.length !== expectedLength) {
    throw new Dx7SysexError(`SysEx message has ${message.length} bytes; expected ${expectedLength}.`)
  }
  if (message[0] !== 0xf0 || message[message.length - 1] !== 0xf7) {
    throw new Dx7SysexError('SysEx message must start with F0 and end with F7.')
  }
  if (message[1] !== DX7_MANUFACTURER_ID) throw new Dx7SysexError('SysEx message is not a Yamaha message.')
  if (message[3] !== format) throw new Dx7SysexError(`Unexpected DX7 format byte ${message[3] ?? -1}.`)
  const declaredLength = ((message[4] ?? 0) << 7) | (message[5] ?? 0)
  if (declaredLength !== dataLength) {
    throw new Dx7SysexError(`DX7 message declares ${declaredLength} data bytes; expected ${dataLength}.`)
  }
  return message[2] ?? 0
}

function assertChecksum(message: Uint8Array, dataStart: number, dataLength: number): void {
  const data = message.slice(dataStart, dataStart + dataLength)
  const expected = calculateYamahaChecksum(data)
  const actual = message[dataStart + dataLength]
  if (actual !== expected) {
    throw new Dx7SysexError(`Invalid Yamaha checksum: expected ${expected}, received ${actual ?? -1}.`)
  }
}

export interface DecodedSingleVoice {
  channel: number
  voice: Dx7Voice
}

export interface DecodedVoiceBank {
  channel: number
  voices: readonly Dx7Voice[]
}

export function decodeSingleVoiceMessage(message: Uint8Array): DecodedSingleVoice {
  const channel = assertMessageEnvelope(message, DX7_SINGLE_MESSAGE_LENGTH, DX7_SINGLE_FORMAT, DX7_SINGLE_DATA_LENGTH) & 0x0f
  assertChecksum(message, 6, DX7_SINGLE_DATA_LENGTH)
  return { channel, voice: decodeSingleVoiceData(message.slice(6, 6 + DX7_SINGLE_DATA_LENGTH)) }
}

export function encodeSingleVoiceMessage(voice: Dx7Voice, channel = 0): Uint8Array {
  assertRange('MIDI channel', channel, 0, 15)
  const data = encodeSingleVoiceData(voice)
  const message = new Uint8Array(DX7_SINGLE_MESSAGE_LENGTH)
  message.set([0xf0, DX7_MANUFACTURER_ID, channel, DX7_SINGLE_FORMAT, 0x01, 0x1b], 0)
  message.set(data, 6)
  message[161] = calculateYamahaChecksum(data)
  message[162] = 0xf7
  return message
}

export function decodeVoiceBankMessage(message: Uint8Array): DecodedVoiceBank {
  const channel = assertMessageEnvelope(message, DX7_BANK_MESSAGE_LENGTH, DX7_BANK_FORMAT, DX7_BANK_DATA_LENGTH) & 0x0f
  assertChecksum(message, 6, DX7_BANK_DATA_LENGTH)
  const voices = Array.from({ length: DX7_BANK_VOICE_COUNT }, (_, index) =>
    decodePackedVoice(message.slice(6 + index * DX7_PACKED_VOICE_LENGTH, 6 + (index + 1) * DX7_PACKED_VOICE_LENGTH)),
  )
  return { channel, voices }
}

export function encodeVoiceBankMessage(voices: readonly Dx7Voice[], channel = 0): Uint8Array {
  if (voices.length !== DX7_BANK_VOICE_COUNT) {
    throw new Dx7SysexError(`A DX7 bank must contain exactly ${DX7_BANK_VOICE_COUNT} voices.`)
  }
  assertRange('MIDI channel', channel, 0, 15)
  const data = new Uint8Array(DX7_BANK_DATA_LENGTH)
  voices.forEach((voice, index) => data.set(encodePackedVoice(voice), index * DX7_PACKED_VOICE_LENGTH))

  const message = new Uint8Array(DX7_BANK_MESSAGE_LENGTH)
  message.set([0xf0, DX7_MANUFACTURER_ID, channel, DX7_BANK_FORMAT, 0x20, 0x00], 0)
  message.set(data, 6)
  message[4102] = calculateYamahaChecksum(data)
  message[4103] = 0xf7
  return message
}
