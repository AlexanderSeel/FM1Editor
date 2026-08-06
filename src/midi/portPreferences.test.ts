import { describe, expect, it } from 'vitest'
import { choosePreferredPort, type MidiPortPreference } from './portPreferences'
import type { MidiPortInfo } from './webMidi'

const ports: MidiPortInfo[] = [
  {
    id: 'generic',
    name: 'USB MIDI',
    manufacturer: 'Generic',
    state: 'connected',
    connection: 'closed',
  },
  {
    id: 'suggested',
    name: 'FM-1 MIDI',
    manufacturer: 'M-VAVE',
    state: 'connected',
    connection: 'closed',
  },
]

describe('MIDI port preference resolution', () => {
  it('keeps an available manual current selection ahead of suggestions', () => {
    expect(choosePreferredPort(ports, 'generic', null, 'suggested')).toBe('generic')
  })

  it('keeps a persisted preference ahead of suggestions', () => {
    const preference: MidiPortPreference = {
      id: 'generic',
      name: 'USB MIDI',
      manufacturer: 'Generic',
    }
    expect(choosePreferredPort(ports, null, preference, 'suggested')).toBe('generic')
  })

  it('uses a target suggestion only when no manual preference resolves', () => {
    expect(choosePreferredPort(ports, null, null, 'suggested')).toBe('suggested')
    expect(choosePreferredPort(ports, null, null, 'missing')).toBe('generic')
  })

  it('matches a persisted descriptor when browser port IDs change', () => {
    const preference: MidiPortPreference = {
      id: 'old-id',
      name: 'USB MIDI',
      manufacturer: 'Generic',
    }
    expect(choosePreferredPort(ports, null, preference, 'suggested')).toBe('generic')
  })
})
