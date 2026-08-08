import type { Dx7Operator, Dx7Voice } from '../domain/voice'
import { encodeSingleVoiceMessage } from '../sysex/dx7'

export type Dx7SemanticValue = string | number | boolean

export interface Dx7VoiceSemanticDifference {
  readonly path: string
  readonly label: string
  readonly before: Dx7SemanticValue
  readonly after: Dx7SemanticValue
}

export interface Dx7VoiceSyxArtifact {
  readonly filename: string
  readonly mimeType: 'application/octet-stream'
  readonly bytes: Uint8Array
}

function safeFilename(name: string): string {
  const normalized = name.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized || 'DX7-VOICE'
}

function pushDifference(
  output: Dx7VoiceSemanticDifference[],
  path: string,
  label: string,
  before: Dx7SemanticValue,
  after: Dx7SemanticValue,
): void {
  if (before === after) return
  output.push({ path, label, before, after })
}

function compareFour(
  output: Dx7VoiceSemanticDifference[],
  path: string,
  label: string,
  before: readonly [number, number, number, number],
  after: readonly [number, number, number, number],
): void {
  for (let index = 0; index < 4; index += 1) {
    pushDifference(output, `${path}.${index}`, `${label} ${index + 1}`, before[index], after[index])
  }
}

function compareOperator(
  output: Dx7VoiceSemanticDifference[],
  index: number,
  before: Dx7Operator,
  after: Dx7Operator,
): void {
  const prefix = `operators.${index}`
  const label = `OP${index + 1}`
  compareFour(output, `${prefix}.envelope.rates`, `${label} EG rate`, before.envelope.rates, after.envelope.rates)
  compareFour(output, `${prefix}.envelope.levels`, `${label} EG level`, before.envelope.levels, after.envelope.levels)
  pushDifference(output, `${prefix}.keyboardScaling.breakPoint`, `${label} breakpoint`, before.keyboardScaling.breakPoint, after.keyboardScaling.breakPoint)
  pushDifference(output, `${prefix}.keyboardScaling.leftDepth`, `${label} left depth`, before.keyboardScaling.leftDepth, after.keyboardScaling.leftDepth)
  pushDifference(output, `${prefix}.keyboardScaling.rightDepth`, `${label} right depth`, before.keyboardScaling.rightDepth, after.keyboardScaling.rightDepth)
  pushDifference(output, `${prefix}.keyboardScaling.leftCurve`, `${label} left curve`, before.keyboardScaling.leftCurve, after.keyboardScaling.leftCurve)
  pushDifference(output, `${prefix}.keyboardScaling.rightCurve`, `${label} right curve`, before.keyboardScaling.rightCurve, after.keyboardScaling.rightCurve)
  pushDifference(output, `${prefix}.keyboardScaling.rateScaling`, `${label} rate scaling`, before.keyboardScaling.rateScaling, after.keyboardScaling.rateScaling)
  pushDifference(output, `${prefix}.amplitudeModulationSensitivity`, `${label} AMS`, before.amplitudeModulationSensitivity, after.amplitudeModulationSensitivity)
  pushDifference(output, `${prefix}.keyVelocitySensitivity`, `${label} velocity sensitivity`, before.keyVelocitySensitivity, after.keyVelocitySensitivity)
  pushDifference(output, `${prefix}.outputLevel`, `${label} output level`, before.outputLevel, after.outputLevel)
  pushDifference(output, `${prefix}.oscillatorMode`, `${label} oscillator mode`, before.oscillatorMode, after.oscillatorMode)
  pushDifference(output, `${prefix}.frequencyCoarse`, `${label} frequency coarse`, before.frequencyCoarse, after.frequencyCoarse)
  pushDifference(output, `${prefix}.frequencyFine`, `${label} frequency fine`, before.frequencyFine, after.frequencyFine)
  pushDifference(output, `${prefix}.detune`, `${label} detune`, before.detune, after.detune)
}

/** Compare only semantic voice state. Raw packed/unpacked provenance bytes are intentionally ignored. */
export function createDx7VoiceSemanticDiff(before: Dx7Voice, after: Dx7Voice): readonly Dx7VoiceSemanticDifference[] {
  const output: Dx7VoiceSemanticDifference[] = []
  pushDifference(output, 'name', 'Name', before.name, after.name)
  for (let index = 0; index < 6; index += 1) {
    const left = before.operators[index]
    const right = after.operators[index]
    if (!left || !right) throw new Error('DX7 semantic diff requires exactly six operators.')
    compareOperator(output, index, left, right)
  }
  compareFour(output, 'pitchEnvelope.rates', 'Pitch EG rate', before.pitchEnvelope.rates, after.pitchEnvelope.rates)
  compareFour(output, 'pitchEnvelope.levels', 'Pitch EG level', before.pitchEnvelope.levels, after.pitchEnvelope.levels)
  pushDifference(output, 'algorithm', 'Algorithm', before.algorithm, after.algorithm)
  pushDifference(output, 'feedback', 'Feedback', before.feedback, after.feedback)
  pushDifference(output, 'oscillatorKeySync', 'Oscillator key sync', before.oscillatorKeySync, after.oscillatorKeySync)
  pushDifference(output, 'lfo.speed', 'LFO speed', before.lfo.speed, after.lfo.speed)
  pushDifference(output, 'lfo.delay', 'LFO delay', before.lfo.delay, after.lfo.delay)
  pushDifference(output, 'lfo.pitchModulationDepth', 'LFO pitch modulation depth', before.lfo.pitchModulationDepth, after.lfo.pitchModulationDepth)
  pushDifference(output, 'lfo.amplitudeModulationDepth', 'LFO amplitude modulation depth', before.lfo.amplitudeModulationDepth, after.lfo.amplitudeModulationDepth)
  pushDifference(output, 'lfo.keySync', 'LFO key sync', before.lfo.keySync, after.lfo.keySync)
  pushDifference(output, 'lfo.waveform', 'LFO waveform', before.lfo.waveform, after.lfo.waveform)
  pushDifference(output, 'lfo.pitchModulationSensitivity', 'LFO pitch modulation sensitivity', before.lfo.pitchModulationSensitivity, after.lfo.pitchModulationSensitivity)
  pushDifference(output, 'transpose', 'Transpose', before.transpose, after.transpose)
  return output
}

/** Build a standard Yamaha DX7 single-voice SysEx file. This only returns bytes; it never opens MIDI or sends hardware data. */
export function createDx7VoiceSyxArtifact(voice: Dx7Voice, channel = 0): Dx7VoiceSyxArtifact {
  return {
    filename: `${safeFilename(voice.name)}.syx`,
    mimeType: 'application/octet-stream',
    bytes: encodeSingleVoiceMessage(voice, channel),
  }
}
