export const PIANO_ROLL_NOTE_COUNT = 24
export const MIN_MIDI_NOTE = 0
export const MAX_MIDI_NOTE = 127
export const MAX_PIANO_ROLL_START_NOTE = MAX_MIDI_NOTE - PIANO_ROLL_NOTE_COUNT + 1

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function clampPianoRollStartNote(note: number): number {
  if (!Number.isFinite(note)) return 0
  return clamp(Math.round(note), MIN_MIDI_NOTE, MAX_PIANO_ROLL_START_NOTE)
}

export function buildPianoRollNoteRows(startNote: number): readonly number[] {
  const start = clampPianoRollStartNote(startNote)
  return Array.from(
    { length: PIANO_ROLL_NOTE_COUNT },
    (_, index) => start + PIANO_ROLL_NOTE_COUNT - 1 - index,
  )
}

export function shiftPianoRollStartNote(startNote: number, octaveOffset: number): number {
  if (!Number.isFinite(octaveOffset)) return clampPianoRollStartNote(startNote)
  return clampPianoRollStartNote(startNote + Math.round(octaveOffset) * 12)
}

export function revealPianoRollNote(startNote: number, note: number): number {
  const start = clampPianoRollStartNote(startNote)
  const target = clamp(Math.round(note), MIN_MIDI_NOTE, MAX_MIDI_NOTE)
  const end = start + PIANO_ROLL_NOTE_COUNT - 1
  if (target >= start && target <= end) return start

  const octaveStart = Math.floor(target / 12) * 12
  return clampPianoRollStartNote(octaveStart)
}
