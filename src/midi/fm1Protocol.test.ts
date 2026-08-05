import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  createExperimentalVoiceParameterChanges,
  encodeAllNotesOff,
  encodeControlChange,
  encodeFm1ParameterWrite,
  encodeNoteOff,
  encodeNoteOn,
  encodeRealtimeMessage,
} from './fm1Protocol'

describe('FM-1 protocol', () => {
  it('encodes the documented parameter write frame', () => {
    expect(Array.from(encodeFm1ParameterWrite(155, 99))).toEqual([0xf0, 0x43, 0x10, 1, 27, 99, 0xf7])
  })

  it('encodes FX CC on the requested one-based channel', () => {
    expect(Array.from(encodeControlChange(2, 7, 100))).toEqual([0xb1, 7, 100])
  })

  it('encodes piano note and all-notes-off messages', () => {
    expect(Array.from(encodeNoteOn(3, 60, 110))).toEqual([0x92, 60, 110])
    expect(Array.from(encodeNoteOff(3, 60))).toEqual([0x82, 60, 0])
    expect(Array.from(encodeAllNotesOff(3))).toEqual([0xb2, 123, 0])
  })

  it('encodes documented real-time transport messages', () => {
    expect(Array.from(encodeRealtimeMessage('start'))).toEqual([0xfa])
    expect(Array.from(encodeRealtimeMessage('stop'))).toEqual([0xfc])
  })

  it('creates a byte-indexed experimental edit change', () => {
    const before = createInitializedVoice()
    const after = { ...before, algorithm: 2 }
    const changes = createExperimentalVoiceParameterChanges(before, after)
    expect(changes).toHaveLength(1)
    expect(changes[0]?.parameter).toBe(134)
    expect(changes[0]?.value).toBe(1)
  })
})
