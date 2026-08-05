import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import type { MidiOutputTarget } from './output'
import { sendVoiceToFm1 } from './voiceAudition'

describe('voice audition transfer', () => {
  it('opens the output and sends a Yamaha single-voice message on the selected channel', async () => {
    const sent: Uint8Array[] = []
    const output: MidiOutputTarget = {
      id: 'fm1',
      name: 'FM-1 MIDI',
      open: vi.fn(async () => ({}) as MIDIPort),
      send: (data) => sent.push(Uint8Array.from(data)),
    }

    const result = await sendVoiceToFm1(output, createInitializedVoice('AUDITION'), 3)

    expect(output.open).toHaveBeenCalledOnce()
    expect(sent).toHaveLength(1)
    expect(sent[0]).toHaveLength(163)
    expect(Array.from(sent[0]?.slice(0, 6) ?? [])).toEqual([0xf0, 0x43, 0x02, 0x00, 0x01, 0x1b])
    expect(result.outputName).toBe('FM-1 MIDI')
    expect(result.midiChannel).toBe(3)
  })

  it('rejects channels outside the MIDI range before opening the device', async () => {
    const output: MidiOutputTarget = {
      id: 'fm1',
      name: null,
      open: vi.fn(async () => ({}) as MIDIPort),
      send: vi.fn(),
    }

    await expect(sendVoiceToFm1(output, createInitializedVoice(), 17)).rejects.toThrow(/1 to 16/)
    expect(output.open).not.toHaveBeenCalled()
  })
})
