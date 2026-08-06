export type SequenceDirection = 'forward' | 'reverse' | 'ping-pong' | 'random'
export type SequenceClockMode = 'internal' | 'external'

export interface SequenceStep {
  enabled: boolean
  note: number
  /** Optional polyphonic note set. `note` remains the primary/backward-compatible note. */
  notes?: readonly number[]
  velocity: number
  gate: number
  tie: boolean
}

export interface SequencePattern {
  id: string
  name: string
  direction: SequenceDirection
  length: number
  steps: readonly SequenceStep[]
}

export interface SequenceArrangementEntry {
  patternId: string
  repeats: number
}

export interface Fm1Sequence {
  version: 1
  name: string
  bpm: number
  swing: number
  length: number
  midiChannel: number
  steps: readonly SequenceStep[]
  /** Missing values in older projects are interpreted as `forward`. */
  direction?: SequenceDirection
  /** Missing values in older projects are interpreted as `internal`. */
  clockMode?: SequenceClockMode
  /** Internal mode emits 24-PPQN clock; external mode forwards received clock when enabled. */
  sendMidiClock?: boolean
  /** Saved pattern snapshots. The current editable pattern remains in `steps`. */
  patterns?: readonly SequencePattern[]
  /** Empty means play the current pattern once. Use `current` to reference it explicitly. */
  arrangement?: readonly SequenceArrangementEntry[]
}

export const CURRENT_PATTERN_ID = 'current'
export const MAX_SAVED_PATTERNS = 8
export const MAX_ARRANGEMENT_ENTRIES = 32
export const MAX_PATTERN_REPEATS = 16
export const MAX_POLYPHONY = 6

const directions: readonly SequenceDirection[] = ['forward', 'reverse', 'ping-pong', 'random']
const clockModes: readonly SequenceClockMode[] = ['internal', 'external']

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
    direction: 'forward',
    clockMode: 'internal',
    sendMidiClock: true,
    patterns: [],
    arrangement: [],
  }
}

export function getSequenceDirection(sequence: Fm1Sequence): SequenceDirection {
  return sequence.direction ?? 'forward'
}

export function getSequenceClockMode(sequence: Fm1Sequence): SequenceClockMode {
  return sequence.clockMode ?? 'internal'
}

export function getStepNotes(step: SequenceStep): readonly number[] {
  return step.notes && step.notes.length > 0 ? step.notes : [step.note]
}

function assertIntegerRange(label: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}.`)
  }
}

function validateStep(step: SequenceStep, label: string): void {
  if (typeof step.enabled !== 'boolean') throw new Error(`${label} enabled must be boolean.`)
  if (typeof step.tie !== 'boolean') throw new Error(`${label} tie must be boolean.`)
  assertIntegerRange(`${label} note`, step.note, 0, 127)
  assertIntegerRange(`${label} velocity`, step.velocity, 1, 127)
  assertIntegerRange(`${label} gate`, step.gate, 1, 100)

  const notes = getStepNotes(step)
  if (notes.length < 1 || notes.length > MAX_POLYPHONY) {
    throw new Error(`${label} must contain 1 to ${MAX_POLYPHONY} notes.`)
  }
  const unique = new Set(notes)
  if (unique.size !== notes.length) throw new Error(`${label} contains duplicate notes.`)
  notes.forEach((note, noteIndex) => assertIntegerRange(`${label} poly note ${noteIndex + 1}`, note, 0, 127))
}

function validatePattern(pattern: SequencePattern, index: number): void {
  if (!pattern.id || pattern.id.length > 40) throw new Error(`Pattern ${index + 1} has an invalid id.`)
  if (!pattern.name || pattern.name.length > 32) throw new Error(`Pattern ${index + 1} has an invalid name.`)
  if (!directions.includes(pattern.direction)) throw new Error(`Pattern ${index + 1} has an invalid direction.`)
  assertIntegerRange(`Pattern ${index + 1} length`, pattern.length, 1, 16)
  if (pattern.steps.length !== 16) throw new Error(`Pattern ${index + 1} must contain exactly 16 steps.`)
  pattern.steps.forEach((step, stepIndex) => validateStep(step, `Pattern ${index + 1} step ${stepIndex + 1}`))
}

export function validateSequence(sequence: Fm1Sequence): void {
  if (sequence.version !== 1) throw new Error(`Unsupported sequence version ${sequence.version}.`)
  if (typeof sequence.name !== 'string' || sequence.name.length > 32) throw new Error('Sequence name must contain at most 32 characters.')
  if (!Number.isFinite(sequence.bpm) || sequence.bpm < 20 || sequence.bpm > 300) throw new Error('BPM must be between 20 and 300.')
  assertIntegerRange('Swing', sequence.swing, 0, 75)
  assertIntegerRange('Sequence length', sequence.length, 1, 16)
  assertIntegerRange('MIDI channel', sequence.midiChannel, 1, 16)
  if (sequence.steps.length !== 16) throw new Error('A sequence project must contain exactly 16 steps.')
  sequence.steps.forEach((step, index) => validateStep(step, `Step ${index + 1}`))

  const direction = getSequenceDirection(sequence)
  if (!directions.includes(direction)) throw new Error(`Unsupported sequence direction ${direction}.`)
  const clockMode = getSequenceClockMode(sequence)
  if (!clockModes.includes(clockMode)) throw new Error(`Unsupported sequence clock mode ${clockMode}.`)
  if (sequence.sendMidiClock !== undefined && typeof sequence.sendMidiClock !== 'boolean') {
    throw new Error('sendMidiClock must be boolean.')
  }

  const patterns = sequence.patterns ?? []
  if (patterns.length > MAX_SAVED_PATTERNS) throw new Error(`At most ${MAX_SAVED_PATTERNS} saved patterns are supported.`)
  patterns.forEach(validatePattern)
  const patternIds = new Set(patterns.map((pattern) => pattern.id))
  if (patternIds.size !== patterns.length || patternIds.has(CURRENT_PATTERN_ID)) {
    throw new Error('Saved pattern ids must be unique and may not use the reserved current id.')
  }

  const arrangement = sequence.arrangement ?? []
  if (arrangement.length > MAX_ARRANGEMENT_ENTRIES) {
    throw new Error(`At most ${MAX_ARRANGEMENT_ENTRIES} arrangement entries are supported.`)
  }
  arrangement.forEach((entry, index) => {
    if (entry.patternId !== CURRENT_PATTERN_ID && !patternIds.has(entry.patternId)) {
      throw new Error(`Arrangement entry ${index + 1} references an unknown pattern.`)
    }
    assertIntegerRange(`Arrangement entry ${index + 1} repeats`, entry.repeats, 1, MAX_PATTERN_REPEATS)
  })
}

function normalizeStep(value: unknown, fallback: SequenceStep): SequenceStep {
  const step = value && typeof value === 'object' ? value as Partial<SequenceStep> : {}
  const notes = Array.isArray(step.notes)
    ? [...new Set(step.notes.filter((note): note is number => Number.isInteger(note) && note >= 0 && note <= 127))].slice(0, MAX_POLYPHONY)
    : undefined
  const note = Number.isInteger(step.note) ? Number(step.note) : fallback.note
  return {
    enabled: typeof step.enabled === 'boolean' ? step.enabled : fallback.enabled,
    note,
    ...(notes && notes.length > 0 ? { notes: notes.includes(note) ? notes : [note, ...notes].slice(0, MAX_POLYPHONY) } : {}),
    velocity: Number.isInteger(step.velocity) ? Number(step.velocity) : fallback.velocity,
    gate: Number.isInteger(step.gate) ? Number(step.gate) : fallback.gate,
    tie: typeof step.tie === 'boolean' ? step.tie : fallback.tie,
  }
}

function normalizeSteps(value: unknown): readonly SequenceStep[] {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length: 16 }, (_, index) => normalizeStep(source[index], createStep(index)))
}

function normalizePattern(value: unknown, index: number): SequencePattern {
  const pattern = value && typeof value === 'object' ? value as Partial<SequencePattern> : {}
  return {
    id: typeof pattern.id === 'string' && pattern.id && pattern.id !== CURRENT_PATTERN_ID ? pattern.id.slice(0, 40) : `pattern-${index + 1}`,
    name: typeof pattern.name === 'string' && pattern.name ? pattern.name.slice(0, 32) : `PATTERN ${index + 1}`,
    direction: directions.includes(pattern.direction as SequenceDirection) ? pattern.direction as SequenceDirection : 'forward',
    length: Number.isInteger(pattern.length) ? Number(pattern.length) : 16,
    steps: normalizeSteps(pattern.steps),
  }
}

export function parseSequenceProject(json: string): Fm1Sequence {
  const parsed: unknown = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object') throw new Error('Sequence project must be a JSON object.')
  const candidate = parsed as Partial<Fm1Sequence>
  const patterns = Array.isArray(candidate.patterns)
    ? candidate.patterns.slice(0, MAX_SAVED_PATTERNS).map(normalizePattern)
    : []
  const knownPatternIds = new Set(patterns.map((pattern) => pattern.id))
  const arrangement = Array.isArray(candidate.arrangement)
    ? candidate.arrangement
      .filter((entry): entry is SequenceArrangementEntry => Boolean(
        entry
        && typeof entry === 'object'
        && typeof (entry as SequenceArrangementEntry).patternId === 'string'
        && Number.isInteger((entry as SequenceArrangementEntry).repeats),
      ))
      .filter((entry) => entry.patternId === CURRENT_PATTERN_ID || knownPatternIds.has(entry.patternId))
      .slice(0, MAX_ARRANGEMENT_ENTRIES)
      .map((entry) => ({ patternId: entry.patternId, repeats: entry.repeats }))
    : []

  const normalized: Fm1Sequence = {
    version: 1,
    name: typeof candidate.name === 'string' ? candidate.name.slice(0, 32) : 'UNTITLED',
    bpm: typeof candidate.bpm === 'number' ? candidate.bpm : 120,
    swing: Number.isInteger(candidate.swing) ? Number(candidate.swing) : 0,
    length: Number.isInteger(candidate.length) ? Number(candidate.length) : 16,
    midiChannel: Number.isInteger(candidate.midiChannel) ? Number(candidate.midiChannel) : 1,
    steps: normalizeSteps(candidate.steps),
    direction: directions.includes(candidate.direction as SequenceDirection) ? candidate.direction as SequenceDirection : 'forward',
    clockMode: clockModes.includes(candidate.clockMode as SequenceClockMode) ? candidate.clockMode as SequenceClockMode : 'internal',
    sendMidiClock: candidate.sendMidiClock !== false,
    patterns,
    arrangement,
  }
  validateSequence(normalized)
  return normalized
}
