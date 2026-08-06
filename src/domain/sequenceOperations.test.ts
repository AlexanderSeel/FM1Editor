import { describe, expect, it } from 'vitest'
import {
  CURRENT_PATTERN_ID,
  createInitializedSequence,
  getStepNotes,
  parseSequenceProject,
  validateSequence,
  type Fm1Sequence,
} from './sequence'
import {
  applySequencePreset,
  buildPlaybackSteps,
  buildStepOrder,
  createSavedPattern,
  deleteSavedPattern,
  loadSavedPattern,
  randomizePattern,
  rotatePattern,
  saveCurrentPattern,
  updateStepNotes,
} from './sequenceOperations'

describe('sequence project compatibility', () => {
  it('loads legacy version-1 projects with safe defaults', () => {
    const legacy = createInitializedSequence()
    const json = JSON.stringify({
      version: 1,
      name: legacy.name,
      bpm: legacy.bpm,
      swing: legacy.swing,
      length: legacy.length,
      midiChannel: legacy.midiChannel,
      steps: legacy.steps,
    })
    const parsed = parseSequenceProject(json)

    expect(parsed.direction).toBe('forward')
    expect(parsed.clockMode).toBe('internal')
    expect(parsed.sendMidiClock).toBe(true)
    expect(parsed.patterns).toEqual([])
    expect(parsed.arrangement).toEqual([])
  })

  it('validates polyphonic steps, saved patterns and arrangement references', () => {
    let sequence = applySequencePreset(createInitializedSequence(), 'major-progression', 60)
    sequence = saveCurrentPattern(sequence, createSavedPattern(sequence, 'verse', 'VERSE'))
    sequence = { ...sequence, arrangement: [{ patternId: CURRENT_PATTERN_ID, repeats: 2 }, { patternId: 'verse', repeats: 3 }] }

    expect(() => validateSequence(sequence)).not.toThrow()
    expect(getStepNotes(sequence.steps[0]!)).toEqual([60, 64, 67])
  })
})

describe('sequence pattern operations', () => {
  it('rotates only the active pattern length', () => {
    const source = applySequencePreset(createInitializedSequence(), 'major-arpeggio', 60)
    const rotated = rotatePattern(source, 1)

    expect(rotated.steps[0]?.note).toBe(source.steps[15]?.note)
    expect(rotated.steps[1]?.note).toBe(source.steps[0]?.note)
  })

  it('randomizes deterministically for a supplied seed', () => {
    const source = createInitializedSequence()
    expect(randomizePattern(source, 48, 1234)).toEqual(randomizePattern(source, 48, 1234))
    expect(randomizePattern(source, 48, 1234)).not.toEqual(randomizePattern(source, 48, 1235))
  })

  it('saves, loads and deletes pattern snapshots without shared step references', () => {
    const source = applySequencePreset(createInitializedSequence(), 'minor-arpeggio', 57)
    const saved = createSavedPattern(source, 'pattern-a', 'PATTERN A')
    const withPattern = saveCurrentPattern(source, saved)
    const changed = applySequencePreset(withPattern, 'single-note', 72)
    const loaded = loadSavedPattern(changed, 'pattern-a')
    const deleted = deleteSavedPattern({ ...loaded, arrangement: [{ patternId: 'pattern-a', repeats: 2 }] }, 'pattern-a')

    expect(loaded.steps).toEqual(saved.steps)
    expect(loaded.steps).not.toBe(saved.steps)
    expect(deleted.patterns).toEqual([])
    expect(deleted.arrangement).toEqual([])
  })

  it('supports single-note and additive piano-roll editing', () => {
    const step = createInitializedSequence().steps[0]!
    const single = updateStepNotes(step, 64, false)
    const chord = updateStepNotes(single, 67, true)
    const toggled = updateStepNotes(chord, 64, true)

    expect(getStepNotes(single)).toEqual([64])
    expect(getStepNotes(chord)).toEqual([64, 67])
    expect(getStepNotes(toggled)).toEqual([67])
  })
})

describe('direction and arrangement playback', () => {
  it('builds forward, reverse, ping-pong and deterministic random orders', () => {
    expect(buildStepOrder(4, 'forward')).toEqual([0, 1, 2, 3])
    expect(buildStepOrder(4, 'reverse')).toEqual([3, 2, 1, 0])
    expect(buildStepOrder(4, 'ping-pong')).toEqual([0, 1, 2, 3, 2, 1])
    expect(buildStepOrder(8, 'random', 99)).toEqual(buildStepOrder(8, 'random', 99))
    expect(new Set(buildStepOrder(8, 'random', 99))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]))
  })

  it('flattens current and saved patterns with repeat counts', () => {
    let sequence: Fm1Sequence = { ...createInitializedSequence(), length: 4, direction: 'reverse' }
    const saved = { ...createSavedPattern(sequence, 'chorus', 'CHORUS'), direction: 'ping-pong' as const }
    sequence = saveCurrentPattern(sequence, saved)
    sequence = {
      ...sequence,
      arrangement: [
        { patternId: CURRENT_PATTERN_ID, repeats: 2 },
        { patternId: 'chorus', repeats: 1 },
      ],
    }

    const playback = buildPlaybackSteps(sequence, 42)
    expect(playback).toHaveLength(14)
    expect(playback.slice(0, 4).map((step) => step.sourceStepIndex)).toEqual([3, 2, 1, 0])
    expect(playback.slice(8).map((step) => step.sourceStepIndex)).toEqual([0, 1, 2, 3, 2, 1])
  })
})
