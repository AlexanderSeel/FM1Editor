import { afterEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_PATTERN_ID, createInitializedSequence } from '../domain/sequence'
import { applySequencePreset, createSavedPattern, saveCurrentPattern } from '../domain/sequenceOperations'
import type { MidiOutputTarget } from './output'
import {
  buildSequenceEvents,
  createExternalSequencePlayer,
  describeSequenceTiming,
  scheduleSequence,
} from './sequenceScheduler'

function createOutput() {
  const sent: { data: number[]; timestamp?: number }[] = []
  const output: MidiOutputTarget = {
    id: 'test-output',
    name: 'Test output',
    open: async () => ({} as MIDIPort),
    send: (data, timestamp) => sent.push({ data: Array.from(data), ...(timestamp === undefined ? {} : { timestamp }) }),
    clear: vi.fn(),
  }
  return { output, sent }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('sequence scheduler', () => {
  it('builds transport, 24-PPQN clock and note events at deterministic timestamps', () => {
    const sequence = createInitializedSequence()
    const events = buildSequenceEvents(sequence, 1_000, 7)
    const diagnostics = describeSequenceTiming(events)

    expect(events[0]?.kind).toBe('start')
    expect(events.at(-1)?.kind).toBe('stop')
    expect(events.filter((event) => event.kind === 'note-on')).toHaveLength(4)
    expect(events.filter((event) => event.kind === 'clock')).toHaveLength(16 * 6)
    expect(Array.from(events.find((event) => event.kind === 'note-on')?.data ?? [])).toEqual([0x90, 60, 100])
    expect(diagnostics).toMatchObject({ playbackStepCount: 16, clockPulseCount: 96, noteOnCount: 4 })
  })

  it('schedules polyphonic chord presets with matching note-off events', () => {
    const sequence = applySequencePreset(createInitializedSequence(), 'major-progression', 60)
    const events = buildSequenceEvents(sequence, 0, 1)

    expect(events.filter((event) => event.kind === 'note-on')).toHaveLength(12)
    expect(events.filter((event) => event.kind === 'note-off')).toHaveLength(12)
    expect(events.filter((event) => event.kind === 'note-on' && event.stepIndex === 0).map((event) => event.data[1])).toEqual([60, 64, 67])
  })

  it('flattens saved patterns and arrangement repeats before scheduling', () => {
    let sequence = { ...createInitializedSequence(), length: 4 }
    sequence = saveCurrentPattern(sequence, createSavedPattern(sequence, 'chorus', 'CHORUS'))
    sequence = {
      ...sequence,
      arrangement: [
        { patternId: CURRENT_PATTERN_ID, repeats: 2 },
        { patternId: 'chorus', repeats: 1 },
      ],
    }
    const diagnostics = describeSequenceTiming(buildSequenceEvents(sequence, 0, 3))

    expect(diagnostics.playbackStepCount).toBe(12)
    expect(diagnostics.clockPulseCount).toBe(72)
  })

  it('does not self-schedule in external clock mode', () => {
    const sequence = { ...createInitializedSequence(), clockMode: 'external' as const }
    const { output } = createOutput()

    expect(buildSequenceEvents(sequence, 0)).toEqual([])
    expect(() => scheduleSequence(output, sequence)).toThrow(/external clock/i)
  })

  it('advances one step per six external MIDI clock pulses', () => {
    vi.useFakeTimers()
    const { output, sent } = createOutput()
    const steps: number[] = []
    const sequence = { ...createInitializedSequence(), clockMode: 'external' as const }
    const player = createExternalSequencePlayer(output, sequence, {
      onStep: (step) => steps.push(step.sourceStepIndex),
    })

    player.handleMidiMessage([0xfa], 0)
    for (let pulse = 0; pulse < 12; pulse += 1) player.handleMidiMessage([0xf8], pulse * 20)

    expect(steps).toEqual([0, 1])
    expect(sent.some((message) => message.data[0] === 0x90)).toBe(true)
    expect(sent.filter((message) => message.data[0] === 0xf8)).toHaveLength(12)

    vi.runAllTimers()
    player.handleMidiMessage([0xfc], 260)
    expect(sent.some((message) => message.data[0] === 0xfc)).toBe(true)
  })
})
