import { describe, expect, it } from 'vitest'
import {
  buildPianoRollNoteRows,
  clampPianoRollStartNote,
  revealPianoRollNote,
  shiftPianoRollStartNote,
} from './pianoRollView'

describe('piano-roll viewport', () => {
  it('builds a descending 24-note viewport', () => {
    const notes = buildPianoRollNoteRows(48)

    expect(notes).toHaveLength(24)
    expect(notes[0]).toBe(71)
    expect(notes.at(-1)).toBe(48)
    expect(new Set(notes).size).toBe(24)
  })

  it('moves in octave increments and clamps to the complete MIDI range', () => {
    expect(shiftPianoRollStartNote(48, -1)).toBe(36)
    expect(shiftPianoRollStartNote(48, 1)).toBe(60)
    expect(shiftPianoRollStartNote(0, -1)).toBe(0)
    expect(shiftPianoRollStartNote(104, 1)).toBe(104)
    expect(buildPianoRollNoteRows(104)[0]).toBe(127)
  })

  it('reveals notes outside the current viewport while keeping visible notes stable', () => {
    expect(revealPianoRollNote(48, 60)).toBe(48)
    expect(revealPianoRollNote(48, 24)).toBe(24)
    expect(revealPianoRollNote(48, 96)).toBe(96)
    expect(revealPianoRollNote(48, 127)).toBe(104)
    expect(revealPianoRollNote(48, 0)).toBe(0)
  })

  it('normalizes invalid viewport starts safely', () => {
    expect(clampPianoRollStartNote(-20)).toBe(0)
    expect(clampPianoRollStartNote(200)).toBe(104)
    expect(clampPianoRollStartNote(Number.NaN)).toBe(0)
  })
})
