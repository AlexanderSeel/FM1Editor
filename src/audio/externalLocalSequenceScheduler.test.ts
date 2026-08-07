import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitializedSequence, type Fm1Sequence, type SequenceStep } from '../domain/sequence'
import { createExternalLocalSequencePlayer } from './externalLocalSequenceScheduler'

function disabledStep(): SequenceStep {
  return { enabled: false, note: 60, velocity: 100, gate: 80, tie: false }
}

function externalSequence(steps: Partial<Record<number, SequenceStep>>, overrides: Partial<Fm1Sequence> = {}): Fm1Sequence {
  const base = createInitializedSequence()
  return {
    ...base,
    clockMode: 'external',
    length: 4,
    steps: Array.from({ length: 16 }, (_, index) => steps[index] ?? disabledStep()),
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('createExternalLocalSequencePlayer', () => {
  it('rejects internal-clock sequences instead of silently changing timing mode', () => {
    const target = { noteOn: vi.fn(), noteOff: vi.fn(), allNotesOff: vi.fn() }
    expect(() => createExternalLocalSequencePlayer(target, createInitializedSequence())).toThrow('clockMode "external"')
  })

  it('uses MIDI Start and Clock only as timing input and emits semantic local notes', async () => {
    vi.useFakeTimers()
    const target = { noteOn: vi.fn(), noteOff: vi.fn(), allNotesOff: vi.fn() }
    const onStep = vi.fn()
    const sequence = externalSequence({
      0: { enabled: true, note: 60, velocity: 111, gate: 50, tie: false },
    }, { length: 1, bpm: 120 })
    const player = createExternalLocalSequencePlayer(target, sequence, { onStep })

    player.handleMidiMessage([0xfa], 0)
    player.handleMidiMessage([0xf8], 20)
    await Promise.resolve()

    expect(player.running).toBe(true)
    expect(target.allNotesOff).toHaveBeenCalledTimes(1)
    expect(target.noteOn).toHaveBeenCalledWith(60, 111)
    expect(onStep).toHaveBeenCalledTimes(1)
    expect(target.noteOn.mock.calls[0]?.[0]).toBeTypeOf('number')

    await vi.advanceTimersByTimeAsync(63)
    expect(target.noteOff).toHaveBeenCalledWith(60)
  })

  it('preserves tied notes across external-clock steps while changing the rest of a chord', async () => {
    vi.useFakeTimers()
    const target = { noteOn: vi.fn(), noteOff: vi.fn(), allNotesOff: vi.fn() }
    const sequence = externalSequence({
      0: { enabled: true, note: 60, notes: [60, 64], velocity: 100, gate: 100, tie: true },
      1: { enabled: true, note: 60, notes: [60, 67], velocity: 96, gate: 100, tie: false },
    }, { length: 2, bpm: 120 })
    const player = createExternalLocalSequencePlayer(target, sequence)

    player.handleMidiMessage([0xfa], 0)
    player.handleMidiMessage([0xf8], 20)
    for (let pulse = 1; pulse <= 6; pulse += 1) player.handleMidiMessage([0xf8], 20 + pulse * 21)
    await Promise.resolve()

    expect(target.noteOn).toHaveBeenCalledWith(60, 100)
    expect(target.noteOn).toHaveBeenCalledWith(64, 100)
    expect(target.noteOn).toHaveBeenCalledWith(67, 96)
    expect(target.noteOn.mock.calls.filter(([note]) => note === 60)).toHaveLength(1)
    expect(target.noteOff).toHaveBeenCalledWith(64)
    expect(target.noteOff).not.toHaveBeenCalledWith(60)
  })

  it('tracks external clock tempo and transport without forwarding MIDI messages to the local target', () => {
    const target = { noteOn: vi.fn(), noteOff: vi.fn(), allNotesOff: vi.fn() }
    const onClock = vi.fn()
    const onTransport = vi.fn()
    const player = createExternalLocalSequencePlayer(target, externalSequence({}), { onClock, onTransport })

    player.handleMidiMessage([0xfa], 1_000)
    player.handleMidiMessage([0xf8], 1_020)
    player.handleMidiMessage([0xf8], 1_041)
    player.handleMidiMessage([0xfb], 1_050)
    player.handleMidiMessage([0xfc], 1_060)

    expect(onClock).toHaveBeenCalledTimes(2)
    const [estimatedBpm, interval] = onClock.mock.calls.at(-1) ?? []
    expect(estimatedBpm).toBeGreaterThan(100)
    expect(estimatedBpm).toBeLessThan(140)
    expect(interval).toBeGreaterThan(20)
    expect(onTransport.mock.calls.map(([state]) => state)).toEqual(['started', 'continued', 'stopped'])
    expect(player.running).toBe(false)
  })

  it('clears pending note releases and sends local all-notes-off on MIDI Stop', async () => {
    vi.useFakeTimers()
    const target = { noteOn: vi.fn(), noteOff: vi.fn(), allNotesOff: vi.fn() }
    const sequence = externalSequence({
      0: { enabled: true, note: 72, velocity: 100, gate: 100, tie: false },
    }, { length: 1 })
    const player = createExternalLocalSequencePlayer(target, sequence)

    player.handleMidiMessage([0xfa], 0)
    player.handleMidiMessage([0xf8], 20)
    await Promise.resolve()
    expect(target.noteOn).toHaveBeenCalledWith(72, 100)

    player.handleMidiMessage([0xfc], 30)
    await vi.advanceTimersByTimeAsync(500)

    expect(player.running).toBe(false)
    expect(target.allNotesOff.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(target.noteOff).not.toHaveBeenCalledWith(72)
  })

  it('fails closed when a local note target rejects a note operation', async () => {
    const failure = new Error('note target failed')
    const target = {
      noteOn: vi.fn(() => Promise.reject(failure)),
      noteOff: vi.fn(),
      allNotesOff: vi.fn(),
    }
    const onError = vi.fn()
    const player = createExternalLocalSequencePlayer(target, externalSequence({
      0: { enabled: true, note: 60, velocity: 100, gate: 80, tie: false },
    }, { length: 1 }), { onError })

    player.handleMidiMessage([0xfa], 0)
    player.handleMidiMessage([0xf8], 20)
    await Promise.resolve()
    await Promise.resolve()

    expect(onError).toHaveBeenCalledWith(failure)
    expect(player.running).toBe(false)
    expect(target.allNotesOff.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
