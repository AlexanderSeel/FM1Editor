import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import type { MidiOutputTarget } from './output'
import {
  buildFm1VoiceParameterWrites,
  playFm1TestNote,
  recallFm1Preset,
  sendVoiceToFm1,
} from './voiceAudition'

function createOutput(sent: Array<{ data: Uint8Array; timestamp?: number }>): MidiOutputTarget {
  return {
    id: 'fm1',
    name: 'FM-1 MIDI',
    open: vi.fn(async () => ({}) as MIDIPort),
    clear: vi.fn(),
    send: (data, timestamp) => sent.push({
      data: Uint8Array.from(data),
      ...(timestamp === undefined ? {} : { timestamp }),
    }),
  }
}

describe('voice audition transfer', () => {
  it('maps all 155 DX7 edit-buffer bytes to documented FM-1 parameter frames', () => {
    const writes = buildFm1VoiceParameterWrites(createInitializedVoice('AUDITION'))

    expect(writes).toHaveLength(155)
    expect(Array.from(writes[0]?.message ?? [])).toEqual([0xf0, 0x43, 0x10, 0, 0, 99, 0xf7])
    expect(writes[154]?.parameter).toBe(154)
    expect(writes[154]?.message).toHaveLength(7)
  })

  it('opens the output and sends a paced FM-1 parameter stream instead of a Yamaha bulk dump', async () => {
    const sent: Array<{ data: Uint8Array; timestamp?: number }> = []
    const output = createOutput(sent)
    const progress: number[] = []

    const result = await sendVoiceToFm1(output, createInitializedVoice('AUDITION'), {
      parameterIntervalMs: 0,
      onProgress: (completed) => progress.push(completed),
      wait: async () => undefined,
    })

    expect(output.open).toHaveBeenCalledOnce()
    expect(output.clear).toHaveBeenCalledOnce()
    expect(sent).toHaveLength(156)
    expect(Array.from(sent[0]?.data ?? [])).toEqual([0xb0, 123, 0])
    expect(sent.slice(1).every(({ data }) => data.length === 7 && data[0] === 0xf0 && data[2] === 0x10)).toBe(true)
    expect(progress.at(-1)).toBe(155)
    expect(result).toMatchObject({
      protocol: 'fm1-parameter-stream',
      messageCount: 155,
      outputName: 'FM-1 MIDI',
    })
  })

  it('recalls a one-based preset and schedules a test note on the selected channel', async () => {
    const sent: Array<{ data: Uint8Array; timestamp?: number }> = []
    const output = createOutput(sent)

    const recall = await recallFm1Preset(output, 3, 128)
    await playFm1TestNote(output, 3, 60, 110, 450)

    expect(recall).toMatchObject({ midiChannel: 3, preset: 128 })
    expect(Array.from(sent[0]?.data ?? [])).toEqual([0xb2, 123, 0])
    expect(Array.from(sent[1]?.data ?? [])).toEqual([0xc2, 127])
    expect(Array.from(sent[2]?.data ?? [])).toEqual([0x92, 60, 110])
    expect(Array.from(sent[3]?.data ?? [])).toEqual([0x82, 60, 0])
    expect((sent[3]?.timestamp ?? 0) - (sent[2]?.timestamp ?? 0)).toBeGreaterThanOrEqual(400)
  })

  it('rejects invalid MIDI channels and presets before sending data', async () => {
    const sent: Array<{ data: Uint8Array; timestamp?: number }> = []
    const output = createOutput(sent)

    await expect(recallFm1Preset(output, 17, 1)).rejects.toThrow(/1 to 16/)
    await expect(recallFm1Preset(output, 1, 129)).rejects.toThrow(/1 to 128/)
    await expect(playFm1TestNote(output, 0)).rejects.toThrow(/1 to 16/)
    expect(sent).toHaveLength(0)
  })
})
