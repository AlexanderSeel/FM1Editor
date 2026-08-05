import { useRef, useState } from 'react'
import type { Fm1Sequence, SequenceStep } from '../domain/sequence'
import { parseSequenceProject, validateSequence } from '../domain/sequence'
import { scheduleSequence, stopSequence } from '../midi/sequenceScheduler'
import { RangeControl } from './RangeControl'

interface SequenceEditorProps {
  sequence: Fm1Sequence
  output: MIDIOutput | null
  onChange: (sequence: Fm1Sequence) => void
}

const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const

function formatNote(note: number): string {
  const name = noteNames[note % 12] ?? 'C'
  return `${name}${Math.floor(note / 12) - 1}`
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

export function SequenceEditor({ sequence, output, onChange }: SequenceEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const play = async () => {
    setError(null)
    if (!output) {
      setError('Connect Web MIDI and select an output before playback.')
      return
    }

    try {
      validateSequence(sequence)
      await output.open()
      const events = scheduleSequence(output, sequence)
      setStatus(`Scheduled ${events.length} MIDI events on ${output.name || 'the selected output'}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sequence playback could not be started.')
    }
  }

  const stop = () => {
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
      setStatus(`Loaded ${loaded.name || file.name}.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sequence project could not be loaded.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

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
            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => inputRef.current?.click()} type="button">
              Load JSON
            </button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => downloadSequence(sequence)} type="button">
              Save JSON
            </button>
            <button className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400" disabled={!output} onClick={() => void play()} type="button">
              ▶ Play
            </button>
            <button className="rounded-xl bg-rose-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-rose-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400" disabled={!output} onClick={stop} type="button">
              ■ Stop
            </button>
          </div>
          {(status || error) && <p className={`text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RangeControl label="Tempo" max={300} min={20} onChange={(bpm) => onChange({ ...sequence, bpm })} suffix=" BPM" value={sequence.bpm} />
          <RangeControl label="Swing" max={75} onChange={(swing) => onChange({ ...sequence, swing })} suffix="%" value={sequence.swing} />
          <RangeControl label="Length" max={16} min={1} onChange={(length) => onChange({ ...sequence, length })} value={sequence.length} />
          <RangeControl label="MIDI channel" max={16} min={1} onChange={(midiChannel) => onChange({ ...sequence, midiChannel })} value={sequence.midiChannel} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">16-step MIDI sequencer</p>
            <h3 className="mt-1 text-xl font-bold text-white">Pattern grid</h3>
          </div>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
            Local project + MIDI playback
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {sequence.steps.map((step, index) => {
            const outsideLength = index >= sequence.length
            return (
              <article className={`rounded-2xl border p-3 ${outsideLength ? 'border-white/5 bg-black/10 opacity-45' : step.enabled ? 'border-cyan-300/35 bg-cyan-300/[0.07]' : 'border-white/10 bg-black/15'}`} key={index}>
                <div className="flex items-center justify-between gap-3">
                  <button
                    className={`rounded-lg px-3 py-2 text-left ${step.enabled ? 'bg-cyan-300 text-slate-950' : 'bg-white/8 text-slate-300'}`}
                    disabled={outsideLength}
                    onClick={() => onChange(updateStep(sequence, index, (current) => ({ ...current, enabled: !current.enabled })))}
                    type="button"
                  >
                    <span className="block text-[10px] font-black uppercase tracking-[0.16em]">Step {String(index + 1).padStart(2, '0')}</span>
                    <span className="block font-mono text-lg font-black">{step.enabled ? formatNote(step.note) : 'REST'}</span>
                  </button>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <input
                      checked={step.tie}
                      disabled={!step.enabled || outsideLength}
                      onChange={(event) => onChange(updateStep(sequence, index, (current) => ({ ...current, tie: event.target.checked })))}
                      type="checkbox"
                    />
                    Tie
                  </label>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3 2xl:grid-cols-1">
                  <RangeControl label="Note" max={127} onChange={(note) => onChange(updateStep(sequence, index, (current) => ({ ...current, note })))} value={step.note} />
                  <RangeControl label="Velocity" max={127} min={1} onChange={(velocity) => onChange(updateStep(sequence, index, (current) => ({ ...current, velocity })))} value={step.velocity} />
                  <RangeControl label="Gate" max={100} min={1} onChange={(gate) => onChange(updateStep(sequence, index, (current) => ({ ...current, gate })))} suffix="%" value={step.gate} />
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <p className="rounded-xl border border-violet-300/15 bg-violet-300/[0.05] p-4 text-sm leading-6 text-slate-400">
        Playback uses documented Note On/Off plus Start/Stop messages. FM-1 internal pattern dump or restore is not exposed because no verified sequencer SysEx format is documented.
      </p>
    </div>
  )
}
