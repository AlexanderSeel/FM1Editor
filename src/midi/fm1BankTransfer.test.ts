import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { decodeVoiceBankMessage } from '../sysex/dx7'
import type { MidiOutputTarget } from './output'
import {
  mergeVoiceIntoFm1Bank,
  resolveFm1PresetLocation,
  sendMergedBankToFm1,
} from './fm1BankTransfer'

function createBank(): readonly ReturnType<typeof createInitializedVoice>[] {
  return Array.from({ length: 32 }, (_, index) => createInitializedVoice(`BASE ${index + 1}`))
}

function createOutput(sent: Uint8Array[]): MidiOutputTarget {
  return {
    id: 'fm1',
    name: 'FM-1 MIDI',
    open: vi.fn(async () => ({}) as MIDIPort),
    clear: vi.fn(),
    send: (data) => sent.push(Uint8Array.from(data)),
  }
}

describe('FM-1 bank merge transfer', () => {
  it('maps bank letters and slots to presets 1 through 128', () => {
    expect(resolveFm1PresetLocation('A', 1)).toEqual({ bank: 'A', slot: 1, preset: 1 })
    expect(resolveFm1PresetLocation('B', 32)).toEqual({ bank: 'B', slot: 32, preset: 64 })
    expect(resolveFm1PresetLocation('D', 32)).toEqual({ bank: 'D', slot: 32, preset: 128 })
  })

  it('replaces exactly one slot while preserving the other 31 voices', () => {
    const base = createBank()
    const replacement = createInitializedVoice('REPLACED')
    const merged = mergeVoiceIntoFm1Bank(base, replacement, 12)

    expect(merged).toHaveLength(32)
    expect(merged[11]?.name).toBe('REPLACED')
    expect(merged[10]).toBe(base[10])
    expect(merged[12]).toBe(base[12])
  })

  it('sends all notes off followed by one valid 4104-byte DX7 bank dump', async () => {
    const sent: Uint8Array[] = []
    const output = createOutput(sent)
    const replacement = createInitializedVoice('REPLACED')

    const result = await sendMergedBankToFm1(output, createBank(), replacement, 'C', 12, 3)

    expect(output.open).toHaveBeenCalledOnce()
    expect(output.clear).toHaveBeenCalledOnce()
    expect(sent).toHaveLength(2)
    expect(Array.from(sent[0] ?? [])).toEqual([0xb2, 123, 0])
    expect(sent[1]).toHaveLength(4104)
    expect(decodeVoiceBankMessage(sent[1] ?? new Uint8Array()).voices[11]?.name).toBe('REPLACED')
    expect(result).toMatchObject({ bank: 'C', slot: 12, preset: 76, byteLength: 4104 })
  })

  it('rejects incomplete bases and invalid slots before sending', async () => {
    expect(() => mergeVoiceIntoFm1Bank(createBank().slice(0, 31), createInitializedVoice(), 1)).toThrow(/32 voices/)
    expect(() => resolveFm1PresetLocation('A', 33)).toThrow(/1 to 32/)
  })
})
