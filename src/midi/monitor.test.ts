import { describe, expect, it } from 'vitest'
import {
  compareMidiMonitorEntries,
  createMidiMonitorEntry,
  formatMidiHex,
  latestSameDirectionSysexComparison,
  summarizeMidiMessage,
} from './monitor'
import { choosePreferredPort } from './portPreferences'
import type { MidiPortInfo } from './webMidi'

describe('MIDI monitor', () => {
  it('summarizes channel and system messages', () => {
    expect(summarizeMidiMessage([0x90, 60, 100])).toBe('Note On · ch 1 · note 60 · velocity 100')
    expect(summarizeMidiMessage([0x90, 60, 0])).toContain('Note Off')
    expect(summarizeMidiMessage([0xf0, 0x43, 0x10, 0xf7])).toBe('SysEx · 4 bytes')
    expect(summarizeMidiMessage([0xfa])).toBe('Start')
    expect(formatMidiHex([0xf0, 0x0a, 0xf7])).toBe('F0 0A F7')
  })

  it('copies message bytes into timestamped entries', () => {
    const source = Uint8Array.of(0xb0, 7, 99)
    const entry = createMidiMonitorEntry('in', { id: 'input-1', name: 'FM-1' }, source, 1234)
    source[2] = 0
    expect(entry.timestamp).toBe(1234)
    expect(entry.data).toEqual([0xb0, 7, 99])
    expect(entry.summary).toContain('controller 7')
  })

  it('reports changed byte positions with stable prefix and suffix boundaries', () => {
    const left = createMidiMonitorEntry('in', { id: 'input-1', name: 'FM-1' }, [0xf0, 0x43, 0x10, 0x20, 0x30, 0xf7], 100)
    const right = createMidiMonitorEntry('in', { id: 'input-1', name: 'FM-1' }, [0xf0, 0x43, 0x10, 0x21, 0x31, 0xf7], 200)
    expect(compareMidiMonitorEntries(left, right)).toMatchObject({
      direction: 'in',
      leftLength: 6,
      rightLength: 6,
      differenceCount: 2,
      commonPrefixLength: 3,
      commonSuffixLength: 1,
      differences: [
        { index: 3, before: 0x20, after: 0x21 },
        { index: 4, before: 0x30, after: 0x31 },
      ],
    })
  })

  it('uses the two latest SysEx messages with the same direction', () => {
    const firstIn = createMidiMonitorEntry('in', { id: 'input-1', name: 'FM-1' }, [0xf0, 1, 2, 0xf7], 100)
    const unrelatedOut = createMidiMonitorEntry('out', { id: 'output-1', name: 'FM-1' }, [0xf0, 9, 0xf7], 200)
    const secondIn = createMidiMonitorEntry('in', { id: 'input-1', name: 'FM-1' }, [0xf0, 1, 3, 0xf7], 300)
    const comparison = latestSameDirectionSysexComparison([firstIn, unrelatedOut, secondIn])
    expect(comparison).toMatchObject({
      direction: 'in',
      leftId: firstIn.id,
      rightId: secondIn.id,
      differenceCount: 1,
      differences: [{ index: 2, before: 2, after: 3 }],
    })
  })
})

describe('MIDI port preferences', () => {
  const ports: MidiPortInfo[] = [
    { id: 'new-id', name: 'FM-1', manufacturer: 'M-VAVE', state: 'connected', connection: 'closed' },
    { id: 'other', name: 'Other', manufacturer: 'Vendor', state: 'connected', connection: 'closed' },
  ]

  it('keeps a current port and falls back to descriptor matching when IDs change', () => {
    expect(choosePreferredPort(ports, 'other', null)).toBe('other')
    expect(choosePreferredPort(ports, null, { id: 'old-id', name: 'FM-1', manufacturer: 'M-VAVE' })).toBe('new-id')
  })
})
