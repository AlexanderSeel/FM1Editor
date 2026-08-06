import {
  CURRENT_PATTERN_ID,
  MAX_SAVED_PATTERNS,
  getSequenceDirection,
  getStepNotes,
  type Fm1Sequence,
  type SequenceDirection,
  type SequencePattern,
  type SequenceStep,
} from './sequence'

export type SequencePresetId =
  | 'single-note'
  | 'bassline'
  | 'major-arpeggio'
  | 'minor-arpeggio'
  | 'major-progression'
  | 'minor-progression'

export interface PlaybackStep {
  timelineIndex: number
  sourceStepIndex: number
  patternId: string
  patternName: string
  arrangementIndex: number
  repeatIndex: number
  step: SequenceStep
}

function cloneStep(step: SequenceStep): SequenceStep {
  return {
    ...step,
    ...(step.notes ? { notes: [...step.notes] } : {}),
  }
}

function cloneSteps(steps: readonly SequenceStep[]): readonly SequenceStep[] {
  return steps.map(cloneStep)
}

function clampNote(note: number): number {
  return Math.max(0, Math.min(127, Math.round(note)))
}

function createPresetStep(note: number, enabled: boolean, notes?: readonly number[]): SequenceStep {
  const normalizedNotes = notes?.map(clampNote)
  return {
    enabled,
    note: clampNote(note),
    ...(normalizedNotes && normalizedNotes.length > 1 ? { notes: normalizedNotes } : {}),
    velocity: 100,
    gate: 80,
    tie: false,
  }
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

export function createCurrentPattern(sequence: Fm1Sequence): SequencePattern {
  return {
    id: CURRENT_PATTERN_ID,
    name: sequence.name || 'CURRENT',
    direction: getSequenceDirection(sequence),
    length: sequence.length,
    steps: cloneSteps(sequence.steps),
  }
}

export function createSavedPattern(sequence: Fm1Sequence, id: string, name: string): SequencePattern {
  if (!id || id === CURRENT_PATTERN_ID) throw new Error('Saved pattern id is invalid.')
  return {
    ...createCurrentPattern(sequence),
    id,
    name: name.trim().slice(0, 32) || `PATTERN ${(sequence.patterns?.length ?? 0) + 1}`,
  }
}

export function saveCurrentPattern(sequence: Fm1Sequence, pattern: SequencePattern): Fm1Sequence {
  const patterns = [...(sequence.patterns ?? [])]
  const existingIndex = patterns.findIndex((candidate) => candidate.id === pattern.id)
  if (existingIndex >= 0) patterns[existingIndex] = { ...pattern, steps: cloneSteps(pattern.steps) }
  else {
    if (patterns.length >= MAX_SAVED_PATTERNS) throw new Error(`At most ${MAX_SAVED_PATTERNS} saved patterns are supported.`)
    patterns.push({ ...pattern, steps: cloneSteps(pattern.steps) })
  }
  return { ...sequence, patterns }
}

export function loadSavedPattern(sequence: Fm1Sequence, patternId: string): Fm1Sequence {
  const pattern = (sequence.patterns ?? []).find((candidate) => candidate.id === patternId)
  if (!pattern) throw new Error(`Pattern ${patternId} was not found.`)
  return {
    ...sequence,
    length: pattern.length,
    direction: pattern.direction,
    steps: cloneSteps(pattern.steps),
  }
}

export function deleteSavedPattern(sequence: Fm1Sequence, patternId: string): Fm1Sequence {
  return {
    ...sequence,
    patterns: (sequence.patterns ?? []).filter((pattern) => pattern.id !== patternId),
    arrangement: (sequence.arrangement ?? []).filter((entry) => entry.patternId !== patternId),
  }
}

export function rotatePattern(sequence: Fm1Sequence, amount: number): Fm1Sequence {
  const length = sequence.length
  const normalized = ((amount % length) + length) % length
  if (normalized === 0) return { ...sequence, steps: cloneSteps(sequence.steps) }
  const active = sequence.steps.slice(0, length)
  const rotated = [...active.slice(length - normalized), ...active.slice(0, length - normalized)]
  return {
    ...sequence,
    steps: sequence.steps.map((step, index) => index < length ? cloneStep(rotated[index] ?? step) : cloneStep(step)),
  }
}

export function randomizePattern(sequence: Fm1Sequence, rootNote: number, seed: number): Fm1Sequence {
  const random = createSeededRandom(seed)
  const root = clampNote(rootNote)
  const scale = [0, 2, 3, 5, 7, 10, 12, 14, 15, 17, 19, 22]
  const steps = sequence.steps.map((step, index) => {
    if (index >= sequence.length) return cloneStep(step)
    const note = clampNote(root + (scale[Math.floor(random() * scale.length)] ?? 0))
    return {
      enabled: random() > 0.28,
      note,
      velocity: 72 + Math.floor(random() * 56),
      gate: 45 + Math.floor(random() * 56),
      tie: random() > 0.9,
    }
  })
  return { ...sequence, steps }
}

export function applySequencePreset(sequence: Fm1Sequence, preset: SequencePresetId, rootNote: number): Fm1Sequence {
  const root = clampNote(rootNote)
  const steps = Array.from({ length: 16 }, () => createPresetStep(root, false))
  const setSingle = (index: number, note: number, velocity = 100, gate = 80) => {
    steps[index] = { ...createPresetStep(note, true), velocity, gate }
  }
  const setChord = (index: number, notes: readonly number[]) => {
    const normalized = notes.map(clampNote)
    steps[index] = createPresetStep(normalized[0] ?? root, true, normalized)
  }

  switch (preset) {
    case 'single-note':
      for (const index of [0, 4, 8, 12]) setSingle(index, root)
      break
    case 'bassline': {
      const notes = [root, root, root + 7, root + 10, root, root + 12, root + 10, root + 7]
      notes.forEach((note, phraseIndex) => setSingle(phraseIndex * 2, note, phraseIndex % 4 === 0 ? 116 : 92, 65))
      break
    }
    case 'major-arpeggio': {
      const notes = [root, root + 4, root + 7, root + 12]
      for (let index = 0; index < 16; index += 1) setSingle(index, notes[index % notes.length] ?? root, index % 4 === 0 ? 112 : 94, 72)
      break
    }
    case 'minor-arpeggio': {
      const notes = [root, root + 3, root + 7, root + 12]
      for (let index = 0; index < 16; index += 1) setSingle(index, notes[index % notes.length] ?? root, index % 4 === 0 ? 112 : 94, 72)
      break
    }
    case 'major-progression':
      setChord(0, [root, root + 4, root + 7])
      setChord(4, [root + 7, root + 11, root + 14])
      setChord(8, [root + 9, root + 12, root + 16])
      setChord(12, [root + 5, root + 9, root + 12])
      break
    case 'minor-progression':
      setChord(0, [root, root + 3, root + 7])
      setChord(4, [root + 8, root + 12, root + 15])
      setChord(8, [root + 3, root + 7, root + 10])
      setChord(12, [root + 10, root + 14, root + 17])
      break
  }

  return { ...sequence, steps }
}

export function buildStepOrder(length: number, direction: SequenceDirection, seed = 0): readonly number[] {
  const forward = Array.from({ length }, (_, index) => index)
  if (direction === 'forward' || length <= 1) return forward
  if (direction === 'reverse') return forward.reverse()
  if (direction === 'ping-pong') return [...forward, ...forward.slice(1, -1).reverse()]

  const random = createSeededRandom(seed)
  const shuffled = [...forward]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const value = shuffled[index]
    shuffled[index] = shuffled[swapIndex] ?? index
    shuffled[swapIndex] = value ?? swapIndex
  }
  return shuffled
}

export function buildPlaybackSteps(sequence: Fm1Sequence, seed = 0): readonly PlaybackStep[] {
  const current = createCurrentPattern(sequence)
  const patterns = new Map<string, SequencePattern>([
    [CURRENT_PATTERN_ID, current],
    ...(sequence.patterns ?? []).map((pattern) => [pattern.id, pattern] as const),
  ])
  const arrangement = sequence.arrangement && sequence.arrangement.length > 0
    ? sequence.arrangement
    : [{ patternId: CURRENT_PATTERN_ID, repeats: 1 }]
  const playback: PlaybackStep[] = []

  arrangement.forEach((entry, arrangementIndex) => {
    const pattern = patterns.get(entry.patternId)
    if (!pattern) return
    for (let repeatIndex = 0; repeatIndex < entry.repeats; repeatIndex += 1) {
      const order = buildStepOrder(pattern.length, pattern.direction, seed + arrangementIndex * 101 + repeatIndex * 17)
      order.forEach((sourceStepIndex) => {
        const step = pattern.steps[sourceStepIndex]
        if (!step) return
        playback.push({
          timelineIndex: playback.length,
          sourceStepIndex,
          patternId: pattern.id,
          patternName: pattern.name,
          arrangementIndex,
          repeatIndex,
          step: cloneStep(step),
        })
      })
    }
  })

  return playback
}

export function updateStepNotes(step: SequenceStep, note: number, additive: boolean): SequenceStep {
  const normalized = clampNote(note)
  const withoutNotes: Omit<SequenceStep, 'notes'> = {
    enabled: step.enabled,
    note: step.note,
    velocity: step.velocity,
    gate: step.gate,
    tie: step.tie,
  }
  if (!additive) return { ...withoutNotes, enabled: true, note: normalized }
  const current = [...getStepNotes(step)]
  const existingIndex = current.indexOf(normalized)
  if (existingIndex >= 0) current.splice(existingIndex, 1)
  else if (current.length < 6) current.push(normalized)
  current.sort((left, right) => left - right)
  if (current.length === 0) return { ...withoutNotes, enabled: false }
  return {
    ...withoutNotes,
    enabled: true,
    note: current[0] ?? normalized,
    ...(current.length > 1 ? { notes: current } : {}),
  }
}
