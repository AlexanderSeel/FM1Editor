import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitializedSequence, type Fm1Sequence, type SequenceStep } from '../domain/sequence'
import { buildLocalSequencePlan, createLocalSequencePlayer } from './localSequenceScheduler'

function disabledStep(): SequenceStep {
  return { enabled: false, note: 60, velocity: 100, gate: 80, tie: false }
}

function sequenceWith(steps: Partial<Record<number, SequenceStep>>, overrides: Partial<Fm1Sequence> = {}): Fm1Sequence {
  const base = createInitializedSequence()
  return {
    ...base,
    length: 4,
    steps: Array.from({ length: 16 }, (_, index) => steps[index] ?? disabledStep()),
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('buildLocalSequencePlan', () => {
  it('emits semantic chord events without MIDI bytes', () => {
    const sequence = sequenceWith({
      0: { enabled: true, note: 60, notes: [60, 64, 67], velocity: 110, gate: 80, tie: false },
    }, { length: 1, bpm: 120 })

    const plan = buildLocalSequencePlan(sequence, 42)

    expect(plan.events).toHaveLength(6)
    expect(plan.events.slice(0, 3).map((event) => ({ kind: event.kind, note: event.note, velocity: event.velocity }))).toEqual([
      { kind: 'note-on', note: 60, velocity: 110 },
      { kind: 'note-on', note: 64, velocity: 110 },
      { kind: 'note-on', note: 67, velocity: 110 },
    ])
    expect(plan.events.slice(3).map((event) => ({ kind: event.kind, note: event.note, offsetMs: event.offsetMs }))).toEqual([
      { kind: 'note-off', note: 60, offsetMs: 100 },
      { kind: 'note-off', note: 64, offsetMs: 100 },
      { kind: 'note-off', note: 67, offsetMs: 100 },
    ])
    expect(plan.durationMs).toBe(125)
    expect('data' in plan.events[0]!).toBe(false)
  })

  it('preserves ties and applies swing to odd timeline steps', () => {
    const sequence = sequenceWith({
      0: { enabled: true, note: 60, velocity: 100, gate: 50, tie: true },
      1: { enabled: true, note: 60, velocity: 90, gate: 80, tie: false },
    }, { length: 2, bpm: 120, swing: 20 })

    const plan = buildLocalSequencePlan(sequence)

    expect(plan.events).toEqual([
      expect.objectContaining({ kind: 'note-on', note: 60, offsetMs: 0, velocity: 100 }),
      expect.objectContaining({ kind: 'note-off', note: 60, offsetMs: 237.5 }),
    ])
    expect(plan.durationMs).toBe(262.5)
  })

  it('rejects external MIDI clock instead of silently substituting browser timing', () => {
    const sequence = sequenceWith({}, { clockMode: 'external' })
    expect(() => buildLocalSequencePlan(sequence)).toThrow('internal BPM clock only')
  })
})

describe('createLocalSequencePlayer', () => {
  it('plays and releases semantic notes then sends all-notes-off on completion', async () => {
    vi.useFakeTimers()
    const target = {
      noteOn: vi.fn(),
      noteOff: vi.fn(),
      allNotesOff: vi.fn(),
    }
    const complete = vi.fn()
    const sequence = sequenceWith({
      0: { enabled: true, note: 60, velocity: 101, gate: 50, tie: false },
    }, { length: 1, bpm: 120 })
    const player = createLocalSequencePlayer(target, sequence, { onComplete: complete })

    player.play({ startDelayMs: 0 })
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(1)
    expect(target.allNotesOff).toHaveBeenCalledTimes(1)
    expect(target.noteOn).toHaveBeenCalledWith(60, 101)

    await vi.advanceTimersByTimeAsync(62)
    expect(target.noteOff).toHaveBeenCalledWith(60)

    await vi.advanceTimersByTimeAsync(63)
    expect(target.allNotesOff).toHaveBeenCalledTimes(2)
    expect(complete).toHaveBeenCalledTimes(1)
    expect(player.playing).toBe(false)
  })

  it('cancels pending events and releases all notes on stop', async () => {
    vi.useFakeTimers()
    const target = {
      noteOn: vi.fn(),
      noteOff: vi.fn(),
      allNotesOff: vi.fn(),
    }
    const sequence = sequenceWith({
      0: { enabled: true, note: 60, velocity: 100, gate: 100, tie: false },
      1: { enabled: true, note: 64, velocity: 100, gate: 100, tie: false },
    }, { length: 2, bpm: 120 })
    const player = createLocalSequencePlayer(target, sequence)

    player.play({ startDelayMs: 0 })
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(1)
    expect(target.noteOn).toHaveBeenCalledWith(60, 100)

    player.stop()
    await vi.advanceTimersByTimeAsync(500)

    expect(target.noteOn).not.toHaveBeenCalledWith(64, 100)
    expect(target.allNotesOff.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(player.playing).toBe(false)
  })
})
