import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { readStoredDeviceTarget } from '../domain/deviceTarget'
import { encodeAllNotesOff, encodeNoteOff, encodeNoteOn } from '../midi/fm1Protocol'
import type { MidiOutputTarget } from '../midi/output'
import { LiveMidiControls } from './LiveMidiControls'

export interface VirtualPianoNoteTarget {
  readonly label: string
  noteOn(note: number, velocity: number): void | Promise<void>
  noteOff(note: number): void | Promise<void>
  allNotesOff(): void | Promise<void>
}

interface VirtualPianoProps {
  output: MidiOutputTarget | null
  midiChannel: number
  velocity: number
  baseOctave: number
  noteTarget?: VirtualPianoNoteTarget | null
  showMidiControls?: boolean
  disabled?: boolean
  disabledReason?: string
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

function currentTarget() {
  if (typeof window === 'undefined') return 'fm1' as const
  try {
    return readStoredDeviceTarget(window.localStorage)
  } catch {
    return 'fm1' as const
  }
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

export function VirtualPiano({
  output,
  midiChannel,
  velocity,
  baseOctave,
  noteTarget = null,
  showMidiControls = true,
  disabled = false,
  disabledReason,
}: VirtualPianoProps) {
  const activeNotesRef = useRef<Set<number>>(new Set())
  const [activeNotes, setActiveNotes] = useState<ReadonlySet<number>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const baseNote = (baseOctave + 1) * 12
  const unavailable = disabled || (noteTarget === null && output === null)
  const target = currentTarget()

  const refreshActiveNotes = useCallback(() => {
    setActiveNotes(new Set(activeNotesRef.current))
  }, [])

  const observeAsync = useCallback((result: void | Promise<void>, fallback: string, onFailure?: () => void) => {
    if (!(result instanceof Promise)) {
      setError(null)
      return
    }
    void result.then(() => setError(null)).catch((cause: unknown) => {
      onFailure?.()
      setError(errorMessage(cause, fallback))
    })
  }, [])

  const noteOn = useCallback((note: number) => {
    if (unavailable || activeNotesRef.current.has(note)) return
    activeNotesRef.current.add(note)
    refreshActiveNotes()
    try {
      if (noteTarget) {
        observeAsync(noteTarget.noteOn(note, velocity), 'The local note could not be played.', () => {
          activeNotesRef.current.delete(note)
          refreshActiveNotes()
        })
      } else if (output) {
        output.send(encodeNoteOn(midiChannel, note, velocity))
        setError(null)
      }
    } catch (cause) {
      activeNotesRef.current.delete(note)
      refreshActiveNotes()
      setError(errorMessage(cause, 'The note could not be played.'))
    }
  }, [midiChannel, noteTarget, observeAsync, output, refreshActiveNotes, unavailable, velocity])

  const noteOff = useCallback((note: number) => {
    if (!activeNotesRef.current.has(note)) return
    activeNotesRef.current.delete(note)
    refreshActiveNotes()
    try {
      if (noteTarget) {
        observeAsync(noteTarget.noteOff(note), 'The local note-off could not be completed.')
      } else if (output) {
        output.send(encodeNoteOff(midiChannel, note))
        setError(null)
      }
    } catch (cause) {
      setError(errorMessage(cause, 'The note-off could not be completed.'))
    }
  }, [midiChannel, noteTarget, observeAsync, output, refreshActiveNotes])

  const releaseAll = useCallback(() => {
    try {
      if (noteTarget) {
        observeAsync(noteTarget.allNotesOff(), 'Local all-notes-off could not be completed.')
      } else if (output) {
        for (const note of activeNotesRef.current) output.send(encodeNoteOff(midiChannel, note))
        output.send(encodeAllNotesOff(midiChannel))
        setError(null)
      }
    } catch (cause) {
      setError(errorMessage(cause, 'All-notes-off could not be completed.'))
    }
    activeNotesRef.current.clear()
    refreshActiveNotes()
  }, [midiChannel, noteTarget, observeAsync, output, refreshActiveNotes])

  useEffect(() => {
    if (disabled) releaseAll()
  }, [disabled, releaseAll])

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
    try {
      if (noteTarget) {
        const result = noteTarget.allNotesOff()
        if (result instanceof Promise) void result.catch(() => undefined)
      } else if (output) {
        for (const note of activeNotesRef.current) output.send(encodeNoteOff(midiChannel, note))
        output.send(encodeAllNotesOff(midiChannel))
      }
    } catch {
      // Best-effort note cleanup during unmount.
    }
    activeNotesRef.current.clear()
  }, [midiChannel, noteTarget, output])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    const offset = COMPUTER_KEY_OFFSETS[event.key.toLowerCase()]
    if (offset === undefined) return
    event.preventDefault()
    noteOn(baseNote + offset)
  }

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
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
    <div className="grid gap-4">
      {showMidiControls && (
        <LiveMidiControls
          disabled={disabled}
          midiChannel={midiChannel}
          output={output}
          target={target}
        />
      )}

      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Virtual piano</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Mouse, touch or computer keys A–; · two octaves from C{baseOctave}
              {noteTarget ? ` · ${noteTarget.label}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              aria-label="Focus computer keyboard piano input. Use keys A through semicolon."
              className="rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/10 focus:bg-cyan-300/15 disabled:opacity-40"
              disabled={unavailable}
              onBlur={releaseAll}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              type="button"
            >
              Focus computer keys
            </button>
            <button
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40"
              disabled={unavailable}
              onClick={releaseAll}
              type="button"
            >
              All notes off
            </button>
          </div>
        </div>

        <div className={`relative h-36 select-none overflow-hidden rounded-xl border border-white/15 sm:h-44 ${unavailable ? 'opacity-45' : ''}`} onContextMenu={(event) => event.preventDefault()}>
          <div className="flex h-full">
            {WHITE_OFFSETS.map((offset) => {
              const note = baseNote + offset
              const active = activeNotes.has(note)
              return (
                <button
                  aria-label={`Play ${midiNoteName(note)}`}
                  className={`relative min-w-0 flex-1 touch-none border-r border-slate-500/40 pb-3 text-center align-bottom text-[10px] font-bold transition last:border-r-0 ${active ? 'bg-cyan-200 text-slate-950' : 'bg-gradient-to-b from-slate-100 to-slate-300 text-slate-700 hover:from-white hover:to-cyan-100'}`}
                  disabled={unavailable}
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
                disabled={unavailable}
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

        {unavailable && (
          <p className="mt-2 text-xs text-amber-200">
            {disabledReason ?? (noteTarget ? 'Piano input is temporarily disabled.' : output ? 'Piano input is temporarily disabled.' : 'Connect and select a MIDI output to play.')}
          </p>
        )}
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      </div>
    </div>
  )
}
