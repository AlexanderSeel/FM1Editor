import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CURRENT_PATTERN_ID,
  getSequenceClockMode,
  getSequenceDirection,
  getStepNotes,
  type Fm1Sequence,
  type SequenceArrangementEntry,
  type SequenceClockMode,
  type SequenceDirection,
  type SequencePattern,
  type SequenceStep,
} from '../domain/sequence'
import { parseSequenceProject, validateSequence } from '../domain/sequence'
import {
  applySequencePreset,
  buildPlaybackSteps,
  createCurrentPattern,
  createSavedPattern,
  deleteSavedPattern,
  loadSavedPattern,
  randomizePattern,
  rotatePattern,
  saveCurrentPattern,
  updateStepNotes,
  type SequencePresetId,
} from '../domain/sequenceOperations'
import { subscribeMidiInputMessages } from '../midi/inputBus'
import type { MidiOutputTarget } from '../midi/output'
import {
  createExternalSequencePlayer,
  describeSequenceTiming,
  scheduleSequence,
  sequenceStepDurationMs,
  stopSequence,
  type ExternalSequencePlayer,
  type SequenceTimingDiagnostics,
} from '../midi/sequenceScheduler'
import { RangeControl } from './RangeControl'

interface SequenceEditorProps {
  sequence: Fm1Sequence
  output: MidiOutputTarget | null
  onChange: (sequence: Fm1Sequence) => void
}

interface RuntimeDiagnostics extends SequenceTimingDiagnostics {
  driftSamples: number
  totalDriftMs: number
  maximumDriftMs: number
  estimatedExternalBpm: number | null
}

const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const
const presetOptions: readonly { id: SequencePresetId; label: string }[] = [
  { id: 'single-note', label: 'Single-note pulse' },
  { id: 'bassline', label: 'Bassline' },
  { id: 'major-arpeggio', label: 'Major arpeggio' },
  { id: 'minor-arpeggio', label: 'Minor arpeggio' },
  { id: 'major-progression', label: 'I–V–vi–IV chords' },
  { id: 'minor-progression', label: 'i–VI–III–VII chords' },
]

function formatNote(note: number): string {
  const name = noteNames[note % 12] ?? 'C'
  return `${name}${Math.floor(note / 12) - 1}`
}

function formatStepNotes(step: SequenceStep): string {
  return step.enabled ? getStepNotes(step).map(formatNote).join(' · ') : 'REST'
}

function updateStep(sequence: Fm1Sequence, index: number, updater: (step: SequenceStep) => SequenceStep): Fm1Sequence {
  const steps = sequence.steps.map((step, stepIndex) => (stepIndex === index ? updater(step) : step))
  return { ...sequence, steps }
}

function downloadSequence(sequence: Fm1Sequence): void {
  validateSequence(sequence)
  const blob = new Blob([`${JSON.stringify(sequence, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sequence.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'fm1-sequence'}.fm1seq.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function emptyDiagnostics(): RuntimeDiagnostics {
  return {
    eventCount: 0,
    noteOnCount: 0,
    noteOffCount: 0,
    clockPulseCount: 0,
    playbackStepCount: 0,
    durationMs: 0,
    driftSamples: 0,
    totalDriftMs: 0,
    maximumDriftMs: 0,
    estimatedExternalBpm: null,
  }
}

function patternLabel(sequence: Fm1Sequence, patternId: string): string {
  if (patternId === CURRENT_PATTERN_ID) return 'Current pattern'
  return sequence.patterns?.find((pattern) => pattern.id === patternId)?.name ?? patternId
}

export function SequenceEditor({ sequence, output, onChange }: SequenceEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const timersRef = useRef<number[]>([])
  const externalPlayerRef = useRef<ExternalSequencePlayer | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedStep, setSelectedStep] = useState(0)
  const [playhead, setPlayhead] = useState<number | null>(null)
  const [playheadPattern, setPlayheadPattern] = useState<string | null>(null)
  const [baseOctave, setBaseOctave] = useState(3)
  const [rootNote, setRootNote] = useState(60)
  const [preset, setPreset] = useState<SequencePresetId>('single-note')
  const [clipboard, setClipboard] = useState<SequencePattern | null>(null)
  const [patternName, setPatternName] = useState('PATTERN 1')
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostics>(emptyDiagnostics)

  const clockMode = getSequenceClockMode(sequence)
  const direction = getSequenceDirection(sequence)
  const selected = sequence.steps[selectedStep] ?? sequence.steps[0]
  const baseMidiNote = (baseOctave + 1) * 12
  const noteRows = useMemo(
    () => Array.from({ length: 24 }, (_, index) => Math.min(127, baseMidiNote + 23 - index)),
    [baseMidiNote],
  )

  const clearUiTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }

  const recordDrift = (expectedTimestamp: number) => {
    const drift = Math.abs(performance.now() - expectedTimestamp)
    setDiagnostics((current) => ({
      ...current,
      driftSamples: current.driftSamples + 1,
      totalDriftMs: current.totalDriftMs + drift,
      maximumDriftMs: Math.max(current.maximumDriftMs, drift),
    }))
  }

  useEffect(() => () => {
    clearUiTimers()
    externalPlayerRef.current?.stop()
  }, [])

  useEffect(() => {
    externalPlayerRef.current?.stop()
    externalPlayerRef.current = null
    if (clockMode !== 'external' || !output) return

    const player = createExternalSequencePlayer(output, sequence, {
      onStep: (step, timestamp) => {
        setPlayhead(step.sourceStepIndex)
        setPlayheadPattern(step.patternName)
        setSelectedStep(step.sourceStepIndex)
        recordDrift(timestamp)
      },
      onClock: (estimatedExternalBpm) => {
        setDiagnostics((current) => ({
          ...current,
          clockPulseCount: current.clockPulseCount + 1,
          estimatedExternalBpm,
        }))
      },
      onTransport: (transport) => {
        setStatus(`External MIDI clock ${transport}.`)
        if (transport === 'stopped') setPlayhead(null)
      },
    })
    externalPlayerRef.current = player
    const unsubscribe = subscribeMidiInputMessages((message) => player.handleMidiMessage(message.data, message.timestamp))
    void output.open().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'The selected MIDI output could not be opened.')
    })
    return () => {
      unsubscribe()
      player.stop()
      if (externalPlayerRef.current === player) externalPlayerRef.current = null
    }
  }, [clockMode, output, sequence])

  const play = async () => {
    setError(null)
    if (!output) {
      setError('Connect Web MIDI and select an output before playback.')
      return
    }

    try {
      validateSequence(sequence)
      await output.open()
      clearUiTimers()
      setPlayhead(null)
      setDiagnostics(emptyDiagnostics())

      if (clockMode === 'external') {
        setStatus('External clock armed. Send MIDI Start and 24-PPQN Clock from the selected input.')
        return
      }

      const events = scheduleSequence(output, sequence)
      const timing = describeSequenceTiming(events)
      setDiagnostics({ ...emptyDiagnostics(), ...timing })
      const startTimestamp = events.find((event) => event.kind === 'start')?.timestamp ?? performance.now()
      const playback = buildPlaybackSteps(sequence, Math.floor(startTimestamp))
      const duration = sequenceStepDurationMs(sequence.bpm)
      const swingOffset = duration * (sequence.swing / 100) * 0.5

      playback.forEach((step, timelineIndex) => {
        const expected = startTimestamp + timelineIndex * duration + (timelineIndex % 2 === 1 ? swingOffset : 0)
        timersRef.current.push(window.setTimeout(() => {
          setPlayhead(step.sourceStepIndex)
          setPlayheadPattern(step.patternName)
          setSelectedStep(step.sourceStepIndex)
          recordDrift(expected)
        }, Math.max(0, expected - performance.now())))
      })
      const stopTimestamp = events.find((event) => event.kind === 'stop')?.timestamp ?? startTimestamp
      timersRef.current.push(window.setTimeout(() => {
        setPlayhead(null)
        setPlayheadPattern(null)
        setStatus('Arrangement playback completed.')
        recordDrift(stopTimestamp)
      }, Math.max(0, stopTimestamp - performance.now())))
      setStatus(`Scheduled ${timing.playbackStepCount} steps and ${timing.eventCount} MIDI events on ${output.name || 'the selected output'}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sequence playback could not be started.')
    }
  }

  const stop = () => {
    clearUiTimers()
    externalPlayerRef.current?.stop()
    setPlayhead(null)
    setPlayheadPattern(null)
    if (!output) return
    try {
      stopSequence(output, sequence.midiChannel)
      setStatus('Playback stopped and All Notes Off sent.')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sequence playback could not be stopped.')
    }
  }

  const loadFile = async (file: File) => {
    try {
      const loaded = parseSequenceProject(await file.text())
      onChange(loaded)
      setSelectedStep(0)
      setStatus(`Loaded ${loaded.name || file.name}.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sequence project could not be loaded.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const savePattern = () => {
    try {
      const id = `pattern-${Date.now().toString(36)}`
      onChange(saveCurrentPattern(sequence, createSavedPattern(sequence, id, patternName)))
      setPatternName(`PATTERN ${(sequence.patterns?.length ?? 0) + 2}`)
      setStatus('Current pattern saved to the pattern chain.')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pattern could not be saved.')
    }
  }

  const updateArrangement = (index: number, updater: (entry: SequenceArrangementEntry) => SequenceArrangementEntry) => {
    const arrangement = (sequence.arrangement ?? []).map((entry, entryIndex) => entryIndex === index ? updater(entry) : entry)
    onChange({ ...sequence, arrangement })
  }

  const moveArrangement = (index: number, offset: number) => {
    const arrangement = [...(sequence.arrangement ?? [])]
    const target = index + offset
    if (target < 0 || target >= arrangement.length) return
    const current = arrangement[index]
    const replacement = arrangement[target]
    if (!current || !replacement) return
    arrangement[index] = replacement
    arrangement[target] = current
    onChange({ ...sequence, arrangement })
  }

  const averageDrift = diagnostics.driftSamples > 0 ? diagnostics.totalDriftMs / diagnostics.driftSamples : 0

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 xl:grid-cols-[1fr_2fr]">
        <div className="grid content-start gap-3">
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Sequence name
            <input
              className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-lg font-bold tracking-[0.08em] text-white outline-none focus:border-cyan-300/60"
              maxLength={32}
              onChange={(event) => onChange({ ...sequence, name: event.target.value.toUpperCase() })}
              value={sequence.name}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              accept=".json,.fm1seq.json,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void loadFile(file)
              }}
              ref={inputRef}
              type="file"
            />
            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => inputRef.current?.click()} type="button">Load JSON</button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => downloadSequence(sequence)} type="button">Save JSON</button>
            <button className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400" disabled={!output} onClick={() => void play()} type="button">
              {clockMode === 'external' ? '◎ Arm external' : '▶ Play arrangement'}
            </button>
            <button className="rounded-xl bg-rose-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-rose-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400" disabled={!output} onClick={stop} type="button">■ Stop</button>
          </div>
          {(status || error) && <p className={`text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RangeControl label="Tempo" max={300} min={20} onChange={(bpm) => onChange({ ...sequence, bpm })} suffix=" BPM" value={sequence.bpm} />
          <RangeControl label="Swing" max={75} onChange={(swing) => onChange({ ...sequence, swing })} suffix="%" value={sequence.swing} />
          <RangeControl label="Length" max={16} min={1} onChange={(length) => onChange({ ...sequence, length })} value={sequence.length} />
          <RangeControl label="MIDI channel" max={16} min={1} onChange={(midiChannel) => onChange({ ...sequence, midiChannel })} value={sequence.midiChannel} />
          <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Direction
            <select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white" onChange={(event) => onChange({ ...sequence, direction: event.target.value as SequenceDirection })} value={direction}>
              <option value="forward">Forward</option>
              <option value="reverse">Reverse</option>
              <option value="ping-pong">Ping-pong</option>
              <option value="random">Random</option>
            </select>
          </label>
          <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Clock source
            <select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white" onChange={(event) => onChange({ ...sequence, clockMode: event.target.value as SequenceClockMode })} value={clockMode}>
              <option value="internal">Internal browser clock</option>
              <option value="external">External MIDI clock</option>
            </select>
          </label>
          <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            MIDI clock
            <button className={`rounded-lg px-3 py-2 text-sm font-bold normal-case tracking-normal ${sequence.sendMidiClock !== false ? 'bg-violet-300 text-slate-950' : 'bg-white/8 text-slate-300'}`} onClick={() => onChange({ ...sequence, sendMidiClock: sequence.sendMidiClock === false })} type="button">
              {sequence.sendMidiClock !== false ? (clockMode === 'internal' ? 'Send 24 PPQN' : 'Forward 24 PPQN') : 'Clock output off'}
            </button>
          </label>
          <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Piano-roll octave
            <select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white" onChange={(event) => setBaseOctave(Number(event.target.value))} value={baseOctave}>
              {Array.from({ length: 8 }, (_, octave) => <option key={octave} value={octave}>C{octave}–B{octave + 1}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Piano-roll step sequencer</p>
            <h3 className="mt-1 text-xl font-bold text-white">Current pattern</h3>
            <p className="mt-1 text-xs text-slate-500">Click to set one note. Shift-click adds or removes notes for chords.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10" onClick={() => onChange(rotatePattern(sequence, -1))} type="button">Rotate ←</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10" onClick={() => onChange(rotatePattern(sequence, 1))} type="button">Rotate →</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10" onClick={() => { setClipboard(createCurrentPattern(sequence)); setStatus('Current pattern copied.') }} type="button">Copy</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10 disabled:opacity-40" disabled={!clipboard} onClick={() => clipboard && onChange({ ...sequence, length: clipboard.length, direction: clipboard.direction, steps: clipboard.steps.map((step) => ({ ...step, ...(step.notes ? { notes: [...step.notes] } : {}) })) })} type="button">Paste</button>
            <button className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-300/20" onClick={() => onChange(randomizePattern(sequence, rootNote, Date.now()))} type="button">Randomize</button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
          <div className="grid min-w-[760px]" style={{ gridTemplateColumns: '72px repeat(16, minmax(38px, 1fr))' }}>
            <div className="sticky left-0 z-20 border-b border-r border-white/10 bg-slate-950 p-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Note</div>
            {sequence.steps.map((_, index) => (
              <button
                className={`border-b border-r border-white/10 p-2 text-xs font-black ${index >= sequence.length ? 'bg-black/30 text-slate-700' : selectedStep === index ? 'bg-violet-300 text-slate-950' : 'bg-white/[0.03] text-slate-400'} ${playhead === index ? 'ring-2 ring-inset ring-emerald-300' : ''}`}
                disabled={index >= sequence.length}
                key={`header-${index}`}
                onClick={() => setSelectedStep(index)}
                type="button"
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            ))}
            {noteRows.map((note) => (
              <div className="contents" key={note}>
                <div className={`sticky left-0 z-10 border-b border-r border-white/10 px-2 py-1.5 font-mono text-xs ${note % 12 === 0 ? 'bg-slate-200 text-slate-950' : noteNames[note % 12]?.includes('♯') ? 'bg-slate-950 text-slate-200' : 'bg-slate-800 text-slate-100'}`}>{formatNote(note)}</div>
                {sequence.steps.map((step, index) => {
                  const active = step.enabled && getStepNotes(step).includes(note)
                  const outsideLength = index >= sequence.length
                  return (
                    <button
                      aria-label={`Step ${index + 1} ${formatNote(note)}${active ? ' active' : ''}`}
                      className={`min-h-8 border-b border-r border-white/8 transition ${outsideLength ? 'cursor-not-allowed bg-black/35' : active ? 'bg-cyan-300 shadow-[inset_0_0_0_2px_rgba(255,255,255,.35)]' : note % 12 === 0 ? 'bg-white/[0.07] hover:bg-white/[0.14]' : 'bg-white/[0.025] hover:bg-white/[0.1]'} ${playhead === index ? 'border-x-emerald-300/70' : ''}`}
                      disabled={outsideLength}
                      key={`${note}-${index}`}
                      onClick={(event) => {
                        setSelectedStep(index)
                        onChange(updateStep(sequence, index, (current) => updateStepNotes(current, note, event.shiftKey)))
                      }}
                      title={`${formatNote(note)} · Step ${index + 1}${event?.shiftKey ? '' : ''}`}
                      type="button"
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="mt-4 grid gap-3 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-4 lg:grid-cols-[1fr_3fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Step {selectedStep + 1}</p>
              <p className="mt-1 font-mono text-lg font-black text-white">{formatStepNotes(selected)}</p>
              {playhead === selectedStep && <p className="mt-1 text-xs text-emerald-300">Playing {playheadPattern ?? 'current pattern'}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={`rounded-lg px-3 py-2 text-xs font-bold ${selected.enabled ? 'bg-cyan-300 text-slate-950' : 'bg-white/8 text-slate-300'}`} onClick={() => onChange(updateStep(sequence, selectedStep, (step) => ({ ...step, enabled: !step.enabled })))} type="button">{selected.enabled ? 'Enabled' : 'Rest'}</button>
                <button className={`rounded-lg px-3 py-2 text-xs font-bold ${selected.tie ? 'bg-amber-300 text-slate-950' : 'bg-white/8 text-slate-300'}`} disabled={!selected.enabled} onClick={() => onChange(updateStep(sequence, selectedStep, (step) => ({ ...step, tie: !step.tie })))} type="button">Tie {selected.tie ? 'on' : 'off'}</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <RangeControl label="Primary note" max={127} onChange={(note) => onChange(updateStep(sequence, selectedStep, (step) => updateStepNotes(step, note, false)))} suffix={` · ${formatNote(selected.note)}`} value={selected.note} />
              <RangeControl label="Velocity" max={127} min={1} onChange={(velocity) => onChange(updateStep(sequence, selectedStep, (step) => ({ ...step, velocity })))} value={selected.velocity} />
              <RangeControl label="Gate" max={100} min={1} onChange={(gate) => onChange(updateStep(sequence, selectedStep, (step) => ({ ...step, gate })))} suffix="%" value={selected.gate} />
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 xl:grid-cols-[1fr_1.4fr]">
        <div className="grid content-start gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Pattern generator</p>
            <h3 className="mt-1 text-xl font-bold text-white">Common styles</h3>
          </div>
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Starting note
            <input className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" max={127} min={0} onChange={(event) => setRootNote(Number(event.target.value))} type="number" value={rootNote} />
            <span className="normal-case tracking-normal text-slate-500">{formatNote(rootNote)}</span>
          </label>
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Preset
            <select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white" onChange={(event) => setPreset(event.target.value as SequencePresetId)} value={preset}>
              {presetOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <button className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-200" onClick={() => onChange(applySequencePreset(sequence, preset, rootNote))} type="button">Apply preset</button>
        </div>

        <div className="grid content-start gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid flex-1 gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Saved pattern name
              <input className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white" maxLength={32} onChange={(event) => setPatternName(event.target.value.toUpperCase())} value={patternName} />
            </label>
            <button className="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40" disabled={(sequence.patterns?.length ?? 0) >= 8} onClick={savePattern} type="button">Save current</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(sequence.patterns ?? []).map((pattern) => (
              <article className="rounded-xl border border-white/10 bg-black/15 p-3" key={pattern.id}>
                <p className="font-bold text-white">{pattern.name}</p>
                <p className="mt-1 text-xs text-slate-500">{pattern.length} steps · {pattern.direction}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950" onClick={() => onChange(loadSavedPattern(sequence, pattern.id))} type="button">Load</button>
                  <button className="rounded-lg bg-white/8 px-3 py-1.5 text-xs font-bold" onClick={() => onChange(saveCurrentPattern(sequence, { ...createCurrentPattern(sequence), id: pattern.id, name: pattern.name }))} type="button">Overwrite</button>
                  <button className="rounded-lg bg-white/8 px-3 py-1.5 text-xs font-bold" onClick={() => onChange({ ...sequence, arrangement: [...(sequence.arrangement ?? []), { patternId: pattern.id, repeats: 1 }] })} type="button">Add to song</button>
                  <button className="rounded-lg bg-rose-300/15 px-3 py-1.5 text-xs font-bold text-rose-200" onClick={() => onChange(deleteSavedPattern(sequence, pattern.id))} type="button">Delete</button>
                </div>
              </article>
            ))}
            {(sequence.patterns?.length ?? 0) === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Save current variations here, then chain them in the song arrangement.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Song arrangement</p>
            <h3 className="mt-1 text-xl font-bold text-white">Pattern chain</h3>
          </div>
          <button className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950" onClick={() => onChange({ ...sequence, arrangement: [...(sequence.arrangement ?? []), { patternId: CURRENT_PATTERN_ID, repeats: 1 }] })} type="button">Add current pattern</button>
        </div>
        <div className="grid gap-2">
          {(sequence.arrangement ?? []).map((entry, index) => (
            <article className="grid items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3 sm:grid-cols-[auto_1fr_auto_auto]" key={`${entry.patternId}-${index}`}>
              <span className="font-mono text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <p className="font-bold text-white">{patternLabel(sequence, entry.patternId)}</p>
                <p className="text-xs text-slate-500">Repeat {entry.repeats}×</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Repeats
                <input className="w-16 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-white" max={16} min={1} onChange={(event) => updateArrangement(index, (current) => ({ ...current, repeats: Number(event.target.value) }))} type="number" value={entry.repeats} />
              </label>
              <div className="flex gap-1">
                <button aria-label={`Move arrangement entry ${index + 1} up`} className="rounded-lg bg-white/8 px-2 py-1.5" disabled={index === 0} onClick={() => moveArrangement(index, -1)} type="button">↑</button>
                <button aria-label={`Move arrangement entry ${index + 1} down`} className="rounded-lg bg-white/8 px-2 py-1.5" disabled={index === (sequence.arrangement?.length ?? 0) - 1} onClick={() => moveArrangement(index, 1)} type="button">↓</button>
                <button aria-label={`Remove arrangement entry ${index + 1}`} className="rounded-lg bg-rose-300/15 px-2 py-1.5 text-rose-200" onClick={() => onChange({ ...sequence, arrangement: (sequence.arrangement ?? []).filter((_, entryIndex) => entryIndex !== index) })} type="button">×</button>
              </div>
            </article>
          ))}
          {(sequence.arrangement?.length ?? 0) === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Empty arrangement: Play runs the current pattern once.</p>}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Scheduled events</p><p className="mt-1 font-mono text-xl font-black text-white">{diagnostics.eventCount}</p></div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Clock pulses</p><p className="mt-1 font-mono text-xl font-black text-white">{diagnostics.clockPulseCount}</p></div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Average UI drift</p><p className="mt-1 font-mono text-xl font-black text-white">{averageDrift.toFixed(1)} ms</p><p className="text-xs text-slate-500">Max {diagnostics.maximumDriftMs.toFixed(1)} ms</p></div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Clock tempo</p><p className="mt-1 font-mono text-xl font-black text-white">{diagnostics.estimatedExternalBpm ? `${diagnostics.estimatedExternalBpm.toFixed(1)} BPM` : `${sequence.bpm} BPM`}</p><p className="text-xs text-slate-500">{clockMode === 'external' ? 'Measured external' : 'Internal scheduled'}</p></div>
      </section>

      <p className="rounded-xl border border-violet-300/15 bg-violet-300/[0.05] p-4 text-sm leading-6 text-slate-400">
        Browser playback supports Note On/Off, polyphonic steps, direction modes, arrangements and MIDI clock at 24 PPQN. External mode follows Start/Continue/Clock/Stop from the selected MIDI input. FM-1 internal pattern dump or restore remains unavailable because no verified sequencer SysEx format is documented.
      </p>
    </div>
  )
}
