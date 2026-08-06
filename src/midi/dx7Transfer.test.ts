import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  decodeSingleVoiceMessage,
  decodeVoiceBankMessage,
} from '../sysex/dx7'
import type { MidiOutputTarget } from './output'
import {
  sendSingleVoiceToDx7,
  sendVoiceBankToDx7,
} from './dx7Transfer'

function createOutput(sent: Uint8Array[]): MidiOutputTarget {
  return {
    id: 'dx7',
    name: 'Yamaha DX7',
    open: vi.fn(async () => ({}) as MIDIPort),
    clear: vi.fn(),
    send: (data) => sent.push(Uint8Array.from(data)),
  }
}

function createBank() {
  return Array.from({ length: 32 }, (_, index) => createInitializedVoice(`DX7 ${index + 1}`))
}

describe('Yamaha DX7 bulk transfer', () => {
  it('sends all notes off followed by one channel-addressed single voice', async () => {
    const sent: Uint8Array[] = []
    const output = createOutput(sent)
    const voice = createInitializedVoice('TRANSFER')

    const result = await sendSingleVoiceToDx7(output, voice, 4)

    expect(output.open).toHaveBeenCalledOnce()
    expect(output.clear).toHaveBeenCalledOnce()
    expect(sent).toHaveLength(2)
    expect(Array.from(sent[0] ?? [])).toEqual([0xb3, 123, 0])
    expect(sent[1]).toHaveLength(163)
    expect(decodeSingleVoiceMessage(sent[1] ?? new Uint8Array())).toMatchObject({
      channel: 3,
      voice: { name: 'TRANSFER' },
    })
    expect(result).toEqual({
      kind: 'single-voice',
      midiChannel: 4,
      byteLength: 163,
      outputName: 'Yamaha DX7',
    })
  })

  it('sends one complete channel-addressed 32-voice bank', async () => {
    const sent: Uint8Array[] = []
    const output = createOutput(sent)
    const bank = createBank()

    const result = await sendVoiceBankToDx7(output, bank, 16)

    expect(sent).toHaveLength(2)
    expect(Array.from(sent[0] ?? [])).toEqual([0xbf, 123, 0])
    expect(sent[1]).toHaveLength(4104)
    const decoded = decodeVoiceBankMessage(sent[1] ?? new Uint8Array())
    expect(decoded.channel).toBe(15)
    expect(decoded.voices[0]?.name).toBe('DX7 1')
    expect(decoded.voices[31]?.name).toBe('DX7 32')
    expect(result).toMatchObject({ kind: 'voice-bank', midiChannel: 16, byteLength: 4104 })
  })

  it('rejects invalid channels and incomplete banks before opening the output', async () => {
    const sent: Uint8Array[] = []
    const output = createOutput(sent)

    await expect(sendSingleVoiceToDx7(output, createInitializedVoice(), 0)).rejects.toThrow(/1 to 16/)
    await expect(sendVoiceBankToDx7(output, createBank().slice(0, 31), 1)).rejects.toThrow(/exactly 32 voices/)
    expect(output.open).not.toHaveBeenCalled()
    expect(sent).toHaveLength(0)
  })
})
