export interface SequenceStep {
  enabled: boolean
  note: number
  velocity: number
  gate: number
  tie: boolean
}

export interface Fm1Sequence {
  version: 1
  name: string
  bpm: number
  swing: number
  length: number
  midiChannel: number
  steps: readonly SequenceStep[]
}

const createStep = (index: number): SequenceStep => ({
  enabled: index % 4 === 0,
  note: 60,
  velocity: 100,
  gate: 80,
  tie: false,
})

export function createInitializedSequence(): Fm1Sequence {
  return {
    version: 1,
    name: 'INIT SEQ',
    bpm: 120,
    swing: 0,
    length: 16,
    midiChannel: 1,
    steps: Array.from({ length: 16 }, (_, index) => createStep(index)),
  }
}

export function validateSequence(sequence: Fm1Sequence): void {
  if (sequence.version !== 1) throw new Error(`Unsupported sequence version ${sequence.version}.`)
  if (!Number.isFinite(sequence.bpm) || sequence.bpm < 20 || sequence.bpm > 300) throw new Error('BPM must be between 20 and 300.')
  if (!Number.isInteger(sequence.swing) || sequence.swing < 0 || sequence.swing > 75) throw new Error('Swing must be between 0 and 75.')
  if (!Number.isInteger(sequence.length) || sequence.length < 1 || sequence.length > 16) throw new Error('Sequence length must be between 1 and 16.')
  if (!Number.isInteger(sequence.midiChannel) || sequence.midiChannel < 1 || sequence.midiChannel > 16) throw new Error('MIDI channel must be between 1 and 16.')
  if (sequence.steps.length !== 16) throw new Error('A sequence project must contain exactly 16 steps.')

  sequence.steps.forEach((step, index) => {
    if (!Number.isInteger(step.note) || step.note < 0 || step.note > 127) throw new Error(`Step ${index + 1} note is outside 0..127.`)
    if (!Number.isInteger(step.velocity) || step.velocity < 1 || step.velocity > 127) throw new Error(`Step ${index + 1} velocity is outside 1..127.`)
    if (!Number.isInteger(step.gate) || step.gate < 1 || step.gate > 100) throw new Error(`Step ${index + 1} gate is outside 1..100.`)
  })
}

export function parseSequenceProject(json: string): Fm1Sequence {
  const parsed: unknown = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object') throw new Error('Sequence project must be a JSON object.')
  const candidate = parsed as Fm1Sequence
  validateSequence(candidate)
  return {
    ...candidate,
    name: String(candidate.name).slice(0, 32),
    steps: candidate.steps.map((step) => ({ ...step })),
  }
}
