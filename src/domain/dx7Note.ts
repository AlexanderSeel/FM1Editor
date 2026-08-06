const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

const DX7_BREAKPOINT_LOWEST_MIDI_NOTE = 9

export function dx7BreakpointNoteName(breakPoint: number): string {
  const normalized = Math.min(99, Math.max(0, Math.round(breakPoint)))
  const midiNote = DX7_BREAKPOINT_LOWEST_MIDI_NOTE + normalized
  const noteName = NOTE_NAMES[midiNote % NOTE_NAMES.length]
  const octave = Math.floor(midiNote / NOTE_NAMES.length) - 1
  return `${noteName}${octave}`
}
