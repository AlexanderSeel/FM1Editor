import { createInitializedVoice, type Dx7Operator, type Dx7Voice } from '../domain/voice'
import {
  calculateYamahaChecksum,
  encodeSingleVoiceMessage,
  encodeVoiceBankMessage,
} from './dx7'
import type { SysexDiagnosticCode } from './importSysex'

export interface SyntheticSysexFixtureExpectation {
  completeMessageCount: number
  supportedMessageCount: number
  diagnosticCodes: readonly SysexDiagnosticCode[]
}

export interface SyntheticSysexFixture {
  id: string
  description: string
  bytes: Uint8Array
  expectation: SyntheticSysexFixtureExpectation
}

const curves = [
  'negative-linear',
  'negative-exponential',
  'positive-exponential',
  'positive-linear',
] as const

const waveforms = [
  'triangle',
  'saw-down',
  'saw-up',
  'square',
  'sine',
  'sample-and-hold',
] as const

function cloneOperator(operator: Dx7Operator, voiceIndex: number, operatorIndex: number): Dx7Operator {
  const seed = voiceIndex * 17 + operatorIndex * 13
  return {
    envelope: {
      rates: [
        seed % 100,
        (seed + 19) % 100,
        (seed + 47) % 100,
        (seed + 83) % 100,
      ],
      levels: [
        (seed + 99) % 100,
        (seed + 61) % 100,
        (seed + 29) % 100,
        seed % 100,
      ],
    },
    keyboardScaling: {
      breakPoint: (seed * 3) % 100,
      leftDepth: (seed * 5) % 100,
      rightDepth: (seed * 7) % 100,
      leftCurve: curves[(voiceIndex + operatorIndex) % curves.length] ?? 'negative-linear',
      rightCurve: curves[(voiceIndex + operatorIndex + 1) % curves.length] ?? 'negative-linear',
      rateScaling: seed % 8,
    },
    amplitudeModulationSensitivity: seed % 4,
    keyVelocitySensitivity: seed % 8,
    outputLevel: 99 - (seed % 100),
    oscillatorMode: seed % 2 === 0 ? 'ratio' : 'fixed',
    frequencyCoarse: seed % 32,
    frequencyFine: (seed * 11) % 100,
    detune: seed % 15,
  }
}

export function createSyntheticFixtureVoice(index: number): Dx7Voice {
  const initialized = createInitializedVoice(`SYN${String(index + 1).padStart(7, '0')}`)
  const operators = initialized.operators.map((operator, operatorIndex) =>
    cloneOperator(operator, index, operatorIndex),
  ) as [Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator]

  return {
    ...initialized,
    operators,
    pitchEnvelope: {
      rates: [index % 100, (index + 23) % 100, (index + 59) % 100, (index + 97) % 100],
      levels: [(index + 99) % 100, (index + 67) % 100, (index + 31) % 100, index % 100],
    },
    algorithm: (index % 32) + 1,
    feedback: index % 8,
    oscillatorKeySync: index % 2 === 0,
    lfo: {
      speed: (index * 7) % 100,
      delay: (index * 11) % 100,
      pitchModulationDepth: (index * 13) % 100,
      amplitudeModulationDepth: (index * 17) % 100,
      keySync: index % 3 === 0,
      waveform: waveforms[index % waveforms.length] ?? 'triangle',
      pitchModulationSensitivity: index % 8,
    },
    transpose: index % 49,
  }
}

function concatenate(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  parts.forEach((part) => {
    result.set(part, offset)
    offset += part.length
  })
  return result
}

function withSingleChecksum(message: Uint8Array): Uint8Array {
  const copy = message.slice()
  copy[161] = calculateYamahaChecksum(copy.slice(6, 161))
  return copy
}

function withBankChecksum(message: Uint8Array): Uint8Array {
  const copy = message.slice()
  copy[4102] = calculateYamahaChecksum(copy.slice(6, 4102))
  return copy
}

export function buildSyntheticSysexFixtureCorpus(): readonly SyntheticSysexFixture[] {
  const validSingle = encodeSingleVoiceMessage(createSyntheticFixtureVoice(0), 15)
  const validBank = encodeVoiceBankMessage(
    Array.from({ length: 32 }, (_, index) => createSyntheticFixtureVoice(index)),
    8,
  )

  const legacySingle = validSingle.slice()
  legacySingle[6 + 8] = 127
  legacySingle[6 + 20] = 15
  const normalizedLegacySingle = withSingleChecksum(legacySingle)

  const legacyBank = validBank.slice()
  legacyBank[6 + 8] = 127
  legacyBank[6 + 16] = 0x7f
  const normalizedLegacyBank = withBankChecksum(legacyBank)

  const badChecksum = validSingle.slice()
  badChecksum[20] = ((badChecksum[20] ?? 0) + 1) & 0x7f

  const unsupported = Uint8Array.of(0xf0, 0x7d, 0x01, 0x02, 0x03, 0xf7)
  const truncated = validSingle.slice(0, validSingle.length - 1)
  const nestedStart = concatenate(
    Uint8Array.of(0xf0, 0x43, 0x00),
    validSingle,
  )
  const mixed = concatenate(
    Uint8Array.of(0x00, 0x7f, 0xf7),
    validSingle,
    unsupported,
    badChecksum,
    validBank,
    Uint8Array.of(0xf0, 0x43, 0x00),
  )

  return [
    {
      id: 'valid-single-channel-16',
      description: 'Valid 163-byte Yamaha single-voice message on MIDI channel 16.',
      bytes: validSingle,
      expectation: { completeMessageCount: 1, supportedMessageCount: 1, diagnosticCodes: [] },
    },
    {
      id: 'valid-bank-channel-9',
      description: 'Valid 4,104-byte bank with 32 distinct synthetic voices on MIDI channel 9.',
      bytes: validBank,
      expectation: { completeMessageCount: 1, supportedMessageCount: 1, diagnosticCodes: [] },
    },
    {
      id: 'legacy-single-reserved-values',
      description: 'Checksum-valid single voice using reserved breakpoint 127 and detune 15.',
      bytes: normalizedLegacySingle,
      expectation: {
        completeMessageCount: 1,
        supportedMessageCount: 1,
        diagnosticCodes: ['compatibility-normalization', 'compatibility-normalization'],
      },
    },
    {
      id: 'legacy-bank-reserved-values',
      description: 'Checksum-valid bank whose first packed operator uses reserved breakpoint and detune values.',
      bytes: normalizedLegacyBank,
      expectation: {
        completeMessageCount: 1,
        supportedMessageCount: 1,
        diagnosticCodes: ['compatibility-normalization', 'compatibility-normalization'],
      },
    },
    {
      id: 'invalid-single-checksum',
      description: 'Structurally complete single-voice message with a deliberately stale checksum.',
      bytes: badChecksum,
      expectation: { completeMessageCount: 1, supportedMessageCount: 0, diagnosticCodes: ['decode-error'] },
    },
    {
      id: 'unsupported-manufacturer',
      description: 'Complete non-commercial manufacturer message for unsupported-message diagnostics.',
      bytes: unsupported,
      expectation: { completeMessageCount: 1, supportedMessageCount: 0, diagnosticCodes: ['unsupported-message'] },
    },
    {
      id: 'truncated-single',
      description: 'Single-voice message missing its final F7 byte.',
      bytes: truncated,
      expectation: { completeMessageCount: 0, supportedMessageCount: 0, diagnosticCodes: ['incomplete-message'] },
    },
    {
      id: 'nested-start',
      description: 'Incomplete prefix followed by a complete valid single voice, exercising nested-start recovery.',
      bytes: nestedStart,
      expectation: { completeMessageCount: 1, supportedMessageCount: 1, diagnosticCodes: ['nested-start'] },
    },
    {
      id: 'mixed-salvage-file',
      description: 'Padding, stray F7, valid single, unsupported message, checksum failure, valid bank and truncated tail.',
      bytes: mixed,
      expectation: {
        completeMessageCount: 4,
        supportedMessageCount: 2,
        diagnosticCodes: [
          'ignored-bytes',
          'stray-end',
          'incomplete-message',
          'unsupported-message',
          'decode-error',
        ],
      },
    },
  ]
}
