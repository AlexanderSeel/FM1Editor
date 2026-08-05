import { describe, expect, it } from 'vitest'
import { createInitializedSequence } from '../domain/sequence'
import { buildSequenceEvents } from './sequenceScheduler'

describe('sequence scheduler', () => {
  it('builds transport and note events at deterministic timestamps', () => {
    const sequence = createInitializedSequence()
    const events = buildSequenceEvents(sequence, 1_000)

    expect(events[0]?.kind).toBe('start')
    expect(events.at(-1)?.kind).toBe('stop')
    expect(events.filter((event) => event.kind === 'note-on')).toHaveLength(4)
    expect(Array.from(events.find((event) => event.kind === 'note-on')?.data ?? [])).toEqual([0x90, 60, 100])
  })
})
