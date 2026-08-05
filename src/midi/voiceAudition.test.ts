import { describe, expect, it, vi } from 'vitest'
import type { MidiOutputTarget } from './output'
import {
  playFm1TestNote,
  recallFm1Preset,
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

describe('safe FM-1 audition controls', () => {
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
