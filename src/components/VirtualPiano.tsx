import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { encodeAllNotesOff, encodeNoteOff, encodeNoteOn } from '../midi/fm1Protocol'
import type { MidiOutputTarget } from '../midi/output'

interface VirtualPianoProps {
  output: MidiOutputTarget | null
  midiChannel: number
  velocity: number
  baseOctave: number
}

const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24] as const
const BLACK_KEYS = [
  { offset: 1, afterWhite: 0 },
  { offset: 3, afterWhite: 1 },
  { offset: 6, afterWhite: 3 },
  { offset: 8, afterWhite: 4 },
  { offset: 10, afterWhite: 5 },
  { offset: 13, afterWhite: 7 },
  { offset: 15, afterWhite: 8 },
  { offset: 18, afterWhite: 10 },
  { offset: 20, afterWhite: 11 },
  { offset: 22, afterWhite: 12 },
] as const
const COMPUTER_KEY_OFFSETS: Readonly<Record<string, number>> = {
  a: 0,
  w: 1,
  s: 2,
  e: 3,
  d: 4,
  f: 5,
  t: 6,
  g: 7,
  y: 8,
  h: 9,
  u: 10,
  j: 11,
  k: 12,
  o: 13,
  l: 14,
  p: 15,
  ';': 16,
}
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const

function midiNoteName(note: number): string {
  const name = NOTE_NAMES[note % 12] ?? 'C'
  return `${name}${Math.floor(note / 12) - 1}`
}

export function VirtualPiano({ output, midiChannel, velocity, baseOctave }: VirtualPianoProps) {
  const activeNotesRef = useRef<Set<number>>(new Set())
  const [activeNotes, setActiveNotes] = useState<ReadonlySet<number>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const baseNote = (baseOctave + 1) * 12
  const disabled = output === null

  const refreshActiveNotes = useCallback(() => {
    setActiveNotes(new Set(activeNotesRef.current))
  }, [])

  const noteOn = useCallback((note: number) => {
    if (!output || activeNotesRef.current.has(note)) return
    try {
      output.send(encodeNoteOn(midiChannel, note, velocity))
      activeNotesRef.current.add(note)
      refreshActiveNotes()
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The MIDI note could not be sent.')
    }
  }, [midiChannel, output, refreshActiveNotes, velocity])

  const noteOff = useCallback((note: number) => {
    if (!activeNotesRef.current.has(note)) return
    try {
      output?.send(encodeNoteOff(midiChannel, note))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The MIDI note-off message could not be sent.')
    } finally {
      activeNotesRef.current.delete(note)
      refreshActiveNotes()
    }
  }, [midiChannel, output, refreshActiveNotes])

  const releaseAll = useCallback(() => {
    if (output) {
      try {
        for (const note of activeNotesRef.current) output.send(encodeNoteOff(midiChannel, note))
        output.send(encodeAllNotesOff(midiChannel))
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'All-notes-off could not be sent.')
      }
    }
    activeNotesRef.current.clear()
    refreshActiveNotes()
  }, [midiChannel, output, refreshActiveNotes])

  useEffect(() => {
    const handleBlur = () => releaseAll()
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') releaseAll()
    }
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [releaseAll])

  useEffect(() => () => {
    if (output) {
      for (const note of activeNotesRef.current) output.send(encodeNoteOff(midiChannel, note))
      output.send(encodeAllNotesOff(midiChannel))
    }
    activeNotesRef.current.clear()
  }, [midiChannel, output])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    const offset = COMPUTER_KEY_OFFSETS[event.key.toLowerCase()]
    if (offset === undefined) return
    event.preventDefault()
    noteOn(baseNote + offset)
  }

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const offset = COMPUTER_KEY_OFFSETS[event.key.toLowerCase()]
    if (offset === undefined) return
    event.preventDefault()
    noteOff(baseNote + offset)
  }

  const pointerHandlers = (note: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      noteOn(note)
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      noteOff(note)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    },
    onPointerCancel: () => noteOff(note),
    onLostPointerCapture: () => noteOff(note),
  })

  return (
    <div
      aria-label="Virtual MIDI piano. Focus this area to play with computer keys A through semicolon."
      className="rounded-2xl border border-white/10 bg-black/20 p-3 outline-none focus:border-cyan-300/40 sm:p-4"
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      role="application"
      tabIndex={0}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Virtual piano</p>
          <p className="mt-1 text-[11px] text-slate-500">Mouse, touch or focused computer keys A–; · two octaves from C{baseOctave}</p>
        </div>
        <button
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40"
          disabled={disabled}
          onClick={releaseAll}
          type="button"
        >
          All notes off
        </button>
      </div>

      <div className={`relative h-36 select-none overflow-hidden rounded-xl border border-white/15 sm:h-44 ${disabled ? 'opacity-45' : ''}`} onContextMenu={(event) => event.preventDefault()}>
        <div className="flex h-full">
          {WHITE_OFFSETS.map((offset) => {
            const note = baseNote + offset
            const active = activeNotes.has(note)
            return (
              <button
                aria-label={`Play ${midiNoteName(note)}`}
                className={`relative min-w-0 flex-1 touch-none border-r border-slate-500/40 pb-3 text-center align-bottom text-[10px] font-bold transition last:border-r-0 ${active ? 'bg-cyan-200 text-slate-950' : 'bg-gradient-to-b from-slate-100 to-slate-300 text-slate-700 hover:from-white hover:to-cyan-100'}`}
                disabled={disabled}
                key={offset}
                type="button"
                {...pointerHandlers(note)}
              >
                <span className="absolute inset-x-0 bottom-2">{midiNoteName(note)}</span>
              </button>
            )
          })}
        </div>

        {BLACK_KEYS.map(({ offset, afterWhite }) => {
          const note = baseNote + offset
          const active = activeNotes.has(note)
          return (
            <button
              aria-label={`Play ${midiNoteName(note)}`}
              className={`absolute top-0 z-10 h-[62%] touch-none rounded-b-md border border-black/80 shadow-lg transition ${active ? 'bg-cyan-400 text-slate-950' : 'bg-gradient-to-b from-slate-700 to-slate-950 text-slate-300 hover:from-slate-600 hover:to-slate-900'}`}
              disabled={disabled}
              key={offset}
              style={{
                left: `${((afterWhite + 1) / WHITE_OFFSETS.length) * 100 - 2.25}%`,
                width: '4.5%',
              }}
              type="button"
              {...pointerHandlers(note)}
            >
              <span className="sr-only">{midiNoteName(note)}</span>
            </button>
          )
        })}
      </div>

      {disabled && <p className="mt-2 text-xs text-amber-200">Connect and select a MIDI output to play.</p>}
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  )
}
