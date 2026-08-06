import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DEVICE_TARGET,
  DEVICE_TARGET_STORAGE_KEY,
  getDeviceTargetDefinition,
  isSuggestedPortForTarget,
  parseDeviceTarget,
  readStoredDeviceTarget,
  suggestMidiPortId,
  writeStoredDeviceTarget,
  type NamedMidiPort,
} from './deviceTarget'

const ports: NamedMidiPort[] = [
  { id: 'generic', name: 'USB MIDI', manufacturer: 'Generic' },
  { id: 'fm1', name: 'FM-1 MIDI', manufacturer: 'M-VAVE' },
  { id: 'dx7', name: 'DX7', manufacturer: 'Yamaha' },
]

describe('device target persistence', () => {
  it('accepts only known target identifiers', () => {
    expect(parseDeviceTarget('dx7')).toBe('dx7')
    expect(parseDeviceTarget('fm1')).toBe('fm1')
    expect(parseDeviceTarget('unknown')).toBe(DEFAULT_DEVICE_TARGET)
    expect(parseDeviceTarget(null)).toBe(DEFAULT_DEVICE_TARGET)
  })

  it('reads and writes the target without requiring working browser storage', () => {
    const setItem = vi.fn()
    writeStoredDeviceTarget({ setItem }, 'dx7')
    expect(setItem).toHaveBeenCalledWith(DEVICE_TARGET_STORAGE_KEY, 'dx7')

    expect(readStoredDeviceTarget({ getItem: () => 'dx7' })).toBe('dx7')
    expect(readStoredDeviceTarget({ getItem: () => 'invalid' })).toBe('fm1')
    expect(readStoredDeviceTarget({ getItem: () => { throw new Error('blocked') } })).toBe('fm1')
  })
})

describe('device target capabilities', () => {
  it('keeps FM-1-only transmissions disabled for the stock DX7 foundation', () => {
    expect(getDeviceTargetDefinition('fm1').capabilities).toMatchObject({
      fm1BankTransfer: true,
      fm1Effects: true,
      midiNotes: true,
    })
    expect(getDeviceTargetDefinition('dx7').capabilities).toMatchObject({
      fm1BankTransfer: false,
      fm1Effects: false,
      midiNotes: true,
    })
  })

  it('provides target-specific labels and explicit safety boundaries', () => {
    const fm1 = getDeviceTargetDefinition('fm1')
    const dx7 = getDeviceTargetDefinition('dx7')

    expect(fm1.manufacturerLabel).toBe('M-VAVE')
    expect(fm1.safetyBoundary).toContain('complete 32-voice bank')
    expect(fm1.unavailableEffectsReason).toBeNull()

    expect(dx7.manufacturerLabel).toBe('YAMAHA')
    expect(dx7.safetyBoundary).toContain('FM-1 bank and effects writes are disabled')
    expect(dx7.safetyBoundary).toContain('DX7 SysEx transmission remains disabled')
    expect(dx7.unavailableEffectsReason).toContain('not sent')
  })
})

describe('target-specific MIDI port suggestions', () => {
  it('suggests matching FM-1 and DX7 ports without replacing manual choices itself', () => {
    expect(suggestMidiPortId(ports, 'fm1')).toBe('fm1')
    expect(suggestMidiPortId(ports, 'dx7')).toBe('dx7')
    expect(isSuggestedPortForTarget(ports[0]!, 'fm1')).toBe(false)
    expect(isSuggestedPortForTarget(ports[1]!, 'fm1')).toBe(true)
    expect(isSuggestedPortForTarget(ports[2]!, 'dx7')).toBe(true)
  })

  it('returns no suggestion when the target name is absent', () => {
    expect(suggestMidiPortId(ports.slice(0, 1), 'fm1')).toBeNull()
    expect(suggestMidiPortId(ports.slice(0, 1), 'dx7')).toBeNull()
  })
})
