export type Fm1FxBlockId = 'filter' | 'reverb' | 'delay' | 'distortion' | 'chorus' | 'phaser'

export interface Fm1FxParameterDefinition {
  id: string
  block: Fm1FxBlockId
  label: string
  controller: number
  minimum: number
  maximum: number
  kind: 'switch' | 'enum' | 'continuous'
  values?: readonly string[]
}

export const FM1_FX_PARAMETERS: readonly Fm1FxParameterDefinition[] = [
  { id: 'filter.enabled', block: 'filter', label: 'Filter', controller: 0, minimum: 0, maximum: 1, kind: 'switch' },
  { id: 'filter.type', block: 'filter', label: 'Type', controller: 1, minimum: 0, maximum: 2, kind: 'enum', values: ['LPF', 'BPF', 'HPF'] },
  { id: 'filter.cutoff', block: 'filter', label: 'Cutoff', controller: 2, minimum: 0, maximum: 107, kind: 'continuous' },
  { id: 'filter.q', block: 'filter', label: 'Q', controller: 3, minimum: 0, maximum: 10, kind: 'continuous' },
  { id: 'reverb.enabled', block: 'reverb', label: 'Reverb', controller: 4, minimum: 0, maximum: 1, kind: 'switch' },
  { id: 'reverb.type', block: 'reverb', label: 'Type', controller: 5, minimum: 0, maximum: 2, kind: 'enum', values: ['Room', 'Hall', 'Plate'] },
  { id: 'reverb.decay', block: 'reverb', label: 'Decay', controller: 6, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'reverb.mix', block: 'reverb', label: 'Mix', controller: 7, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'delay.enabled', block: 'delay', label: 'Delay', controller: 8, minimum: 0, maximum: 1, kind: 'switch' },
  { id: 'delay.decay', block: 'delay', label: 'Decay', controller: 9, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'delay.rate', block: 'delay', label: 'Rate', controller: 10, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'delay.mix', block: 'delay', label: 'Mix', controller: 11, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'distortion.enabled', block: 'distortion', label: 'Distortion', controller: 12, minimum: 0, maximum: 1, kind: 'switch' },
  { id: 'distortion.gain', block: 'distortion', label: 'Gain', controller: 13, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'distortion.tone', block: 'distortion', label: 'Tone', controller: 14, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'distortion.level', block: 'distortion', label: 'Level', controller: 15, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'chorus.enabled', block: 'chorus', label: 'Chorus', controller: 16, minimum: 0, maximum: 1, kind: 'switch' },
  { id: 'chorus.frequency', block: 'chorus', label: 'Frequency', controller: 17, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'chorus.depth', block: 'chorus', label: 'Depth', controller: 18, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'chorus.mix', block: 'chorus', label: 'Mix', controller: 19, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'phaser.enabled', block: 'phaser', label: 'Phaser', controller: 20, minimum: 0, maximum: 1, kind: 'switch' },
  { id: 'phaser.frequency', block: 'phaser', label: 'Frequency', controller: 21, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'phaser.depth', block: 'phaser', label: 'Depth', controller: 22, minimum: 0, maximum: 100, kind: 'continuous' },
  { id: 'phaser.mix', block: 'phaser', label: 'Mix', controller: 23, minimum: 0, maximum: 100, kind: 'continuous' },
]

export type Fm1FxValues = Readonly<Record<string, number>>

export interface Fm1FxState {
  midiChannel: number
  values: Fm1FxValues
}

export function createInitializedFxState(): Fm1FxState {
  return {
    midiChannel: 2,
    values: Object.fromEntries(FM1_FX_PARAMETERS.map((parameter) => [parameter.id, parameter.minimum])),
  }
}

export function updateFxValue(state: Fm1FxState, parameterId: string, value: number): Fm1FxState {
  const parameter = FM1_FX_PARAMETERS.find((candidate) => candidate.id === parameterId)
  if (!parameter) throw new Error(`Unknown FM-1 FX parameter ${parameterId}.`)
  if (!Number.isInteger(value) || value < parameter.minimum || value > parameter.maximum) {
    throw new RangeError(`${parameter.label} must be between ${parameter.minimum} and ${parameter.maximum}.`)
  }
  return { ...state, values: { ...state.values, [parameterId]: value } }
}
