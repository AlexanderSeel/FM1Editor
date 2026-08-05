import { describe, expect, it } from 'vitest'
import { createMidiMonitorEntry, formatMidiHex, summarizeMidiMessage } from './monitor'
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
})

describe('MIDI port preferences', () => {
  const ports: MidiPortInfo[] = [
    { id: 'new-id', name: 'FM-1', manufacturer: 'M-VAVE', state: 'connected', connection: 'closed', type: 'output' },
    { id: 'other', name: 'Other', manufacturer: 'Vendor', state: 'connected', connection: 'closed', type: 'output' },
  ]

  it('keeps a current port and falls back to descriptor matching when IDs change', () => {
    expect(choosePreferredPort(ports, 'other', null)).toBe('other')
    expect(choosePreferredPort(ports, null, { id: 'old-id', name: 'FM-1', manufacturer: 'M-VAVE' })).toBe('new-id')
  })
})
