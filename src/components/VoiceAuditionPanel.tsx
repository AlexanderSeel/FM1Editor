import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import type { MidiOutputTarget } from '../midi/output'
import {
  playFm1TestNote,
  recallFm1Preset,
  sendVoiceToFm1,
} from '../midi/voiceAudition'
import { VirtualPiano } from './VirtualPiano'

interface VoiceAuditionPanelProps {
  voice: Dx7Voice
  output: MidiOutputTarget | null
  sysexEnabled: boolean
  selectionVersion: number
}

type BusyAction = 'push' | 'recall' | 'test' | null

export function VoiceAuditionPanel({
  voice,
  output,
  sysexEnabled,
  selectionVersion,
}: VoiceAuditionPanelProps) {
  const [midiChannel, setMidiChannel] = useState(1)
  const [velocity, setVelocity] = useState(105)
  const [baseOctave, setBaseOctave] = useState(3)
  const [preset, setPreset] = useState(1)
  const [autoPush, setAutoPush] = useState(false)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [progress, setProgress] = useState({ completed: 0, total: 155 })
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastSelectionVersionRef = useRef(selectionVersion)

  const beginAction = useCallback((action: Exclude<BusyAction, null>) => {
    setBusyAction(action)
    setError(null)
    setStatus(null)
  }, [])

  const requireOutput = useCallback((): MidiOutputTarget | null => {
    if (output) return output
    setError('Connect and select an FM-1 MIDI output first.')
    return null
  }, [output])

  const pushVoice = useCallback(async (automatic = false) => {
    if (busyAction !== null) return
    const target = requireOutput()
    if (!target) return
    if (!sysexEnabled) {
      setError('Reconnect Web MIDI with SysEx permission before sending voice parameters.')
      return
    }

    beginAction('push')
    setProgress({ completed: 0, total: 155 })
    try {
      const result = await sendVoiceToFm1(target, voice, {
        noteChannel: midiChannel,
        onProgress: (completed, total) => setProgress({ completed, total }),
      })
      setStatus(`${automatic ? 'Auto-pushed' : 'Pushed'} ${voice.name || 'UNTITLED'} to ${result.outputName} as ${result.messageCount} paced FM-1 parameter writes. Test the sound before saving anything on the device.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The FM-1 parameter stream could not be sent.')
    } finally {
      setBusyAction(null)
    }
  }, [beginAction, busyAction, midiChannel, requireOutput, sysexEnabled, voice])

  const recallPreset = async () => {
    if (busyAction !== null) return
    const target = requireOutput()
    if (!target) return
    beginAction('recall')
    try {
      const result = await recallFm1Preset(target, midiChannel, preset)
      setStatus(`Recalled preset ${result.preset} on MIDI channel ${result.midiChannel}. Use Test C4 or the piano now.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The preset could not be recalled.')
    } finally {
      setBusyAction(null)
    }
  }

  const testNote = async () => {
    if (busyAction !== null) return
    const target = requireOutput()
    if (!target) return
    beginAction('test')
    try {
      await playFm1TestNote(target, midiChannel, 60, velocity)
      setStatus(`Sent C4 on MIDI channel ${midiChannel}. No sound means the selected output, note channel, FM-1 volume or audio path still needs checking.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The test note could not be sent.')
    } finally {
      setBusyAction(null)
    }
  }

  useEffect(() => {
    if (selectionVersion === lastSelectionVersionRef.current) return
    lastSelectionVersionRef.current = selectionVersion
    if (autoPush) void pushVoice(true)
  }, [autoPush, pushVoice, selectionVersion])

  const busy = busyAction !== null
  const progressPercent = progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100)

  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">FM-1 audition</p>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Experimental parameter mapping</span>
          </div>
          <h3 className="mt-2 truncate text-lg font-bold text-white">{voice.name || 'UNTITLED'}</h3>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400">
            The unsupported Yamaha single-voice bulk send has been removed. Voice push now sends the 155 edit-buffer values individually through the FM-1 parameter-write frame, paced at 6 ms per value. Use Recall preset to recover immediately if the result is silent or incorrect.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className={output ? 'text-emerald-300' : 'text-amber-200'}>{output ? output.name || 'MIDI output selected' : 'No MIDI output'}</p>
          <p className="mt-1">SysEx {sysexEnabled ? 'enabled' : 'not enabled'}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-xs leading-5 text-amber-100">
        <strong>Recovery order:</strong> choose a known preset, click Recall preset, then Test C4. Only push a voice after the normal preset is audible on the chosen MIDI channel.
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[145px_minmax(170px,1fr)_135px_135px_auto_auto_auto]">
        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="audition-midi-channel">Note channel</label>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            disabled={busy}
            id="audition-midi-channel"
            onChange={(event) => setMidiChannel(Number(event.target.value))}
            value={midiChannel}
          >
            {Array.from({ length: 16 }, (_, index) => index + 1).map((channel) => (
              <option key={channel} value={channel}>Channel {channel}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="flex justify-between font-semibold uppercase tracking-[0.12em]" htmlFor="audition-velocity"><span>Velocity</span><strong className="text-cyan-200">{velocity}</strong></label>
          <input disabled={busy} id="audition-velocity" max={127} min={1} onChange={(event) => setVelocity(Number(event.target.value))} type="range" value={velocity} />
        </div>

        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="audition-base-octave">Piano starts</label>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            disabled={busy}
            id="audition-base-octave"
            onChange={(event) => setBaseOctave(Number(event.target.value))}
            value={baseOctave}
          >
            {[1, 2, 3, 4, 5, 6].map((octave) => <option key={octave} value={octave}>C{octave}</option>)}
          </select>
        </div>

        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="audition-preset">Recovery preset</label>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            disabled={busy}
            id="audition-preset"
            onChange={(event) => setPreset(Number(event.target.value))}
            value={preset}
          >
            {Array.from({ length: 128 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>Preset {item}</option>)}
          </select>
        </div>

        <button
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40"
          disabled={!output || busy}
          onClick={() => void recallPreset()}
          type="button"
        >
          {busyAction === 'recall' ? 'Recalling…' : 'Recall preset'}
        </button>

        <button
          className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-40"
          disabled={!output || busy}
          onClick={() => void testNote()}
          type="button"
        >
          {busyAction === 'test' ? 'Testing…' : 'Test C4'}
        </button>

        <button
          className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!output || !sysexEnabled || busy}
          onClick={() => void pushVoice(false)}
          type="button"
        >
          {busyAction === 'push' ? 'Writing parameters…' : 'Push voice parameters'}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-slate-300">
        <input disabled={busy} id="audition-auto-push" checked={autoPush} onChange={(event) => setAutoPush(event.target.checked)} type="checkbox" />
        <label htmlFor="audition-auto-push">
          <strong className="text-white">Auto-push bank/library selections</strong>
          <span className="ml-2 text-slate-500">Uses the same experimental paced parameter stream.</span>
        </label>
      </div>

      {busyAction === 'push' && (
        <div className="mt-3" role="status" aria-live="polite">
          <div className="mb-1 flex justify-between text-[11px] text-slate-400">
            <span>Writing FM-1 parameters</span>
            <span>{progress.completed}/{progress.total} · {progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-300 transition-[width]" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {(status || error) && <p aria-live="polite" className={`mt-3 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}

      <div className="mt-4">
        <VirtualPiano
          baseOctave={baseOctave}
          disabled={busy}
          disabledReason={busyAction === 'push' ? 'Wait until all 155 voice parameters have been written.' : 'Wait for the current MIDI action to finish.'}
          midiChannel={midiChannel}
          output={output}
          velocity={velocity}
        />
      </div>
    </section>
  )
}
