import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import type { MidiOutputTarget } from '../midi/output'
import { sendVoiceToFm1 } from '../midi/voiceAudition'
import { VirtualPiano } from './VirtualPiano'

interface VoiceAuditionPanelProps {
  voice: Dx7Voice
  output: MidiOutputTarget | null
  sysexEnabled: boolean
  selectionVersion: number
}

export function VoiceAuditionPanel({
  voice,
  output,
  sysexEnabled,
  selectionVersion,
}: VoiceAuditionPanelProps) {
  const [midiChannel, setMidiChannel] = useState(1)
  const [velocity, setVelocity] = useState(105)
  const [baseOctave, setBaseOctave] = useState(3)
  const [autoPush, setAutoPush] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastSelectionVersionRef = useRef(selectionVersion)

  const pushVoice = useCallback(async (automatic = false) => {
    setError(null)
    setStatus(null)
    if (!output) {
      setError('Connect and select an FM-1 MIDI output first.')
      return
    }
    if (!sysexEnabled) {
      setError('Reconnect Web MIDI with SysEx permission before sending a voice.')
      return
    }

    setSending(true)
    try {
      const result = await sendVoiceToFm1(output, voice, midiChannel)
      setStatus(`${automatic ? 'Auto-pushed' : 'Pushed'} ${voice.name || 'UNTITLED'} to ${result.outputName} as a ${result.message.length}-byte Yamaha single-voice message.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The voice could not be sent to the selected MIDI output.')
    } finally {
      setSending(false)
    }
  }, [midiChannel, output, sysexEnabled, voice])

  useEffect(() => {
    if (selectionVersion === lastSelectionVersionRef.current) return
    lastSelectionVersionRef.current = selectionVersion
    if (autoPush) void pushVoice(true)
  }, [autoPush, pushVoice, selectionVersion])

  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">FM-1 audition</p>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Experimental voice push</span>
          </div>
          <h3 className="mt-2 truncate text-lg font-bold text-white">{voice.name || 'UNTITLED'}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Push the current DX7-compatible voice into the selected output, then audition it with standard MIDI notes. The FM-1 response to Yamaha single-voice dumps still requires physical-device verification.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className={output ? 'text-emerald-300' : 'text-amber-200'}>{output ? output.name || 'MIDI output selected' : 'No MIDI output'}</p>
          <p className="mt-1">SysEx {sysexEnabled ? 'enabled' : 'not enabled'}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[150px_minmax(180px,1fr)_150px_minmax(220px,1fr)_auto]">
        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="audition-midi-channel">MIDI channel</label>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
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
          <input id="audition-velocity" max={127} min={1} onChange={(event) => setVelocity(Number(event.target.value))} type="range" value={velocity} />
        </div>

        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="audition-base-octave">Piano starts</label>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            id="audition-base-octave"
            onChange={(event) => setBaseOctave(Number(event.target.value))}
            value={baseOctave}
          >
            {[1, 2, 3, 4, 5, 6].map((octave) => <option key={octave} value={octave}>C{octave}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-slate-300">
          <input id="audition-auto-push" checked={autoPush} onChange={(event) => setAutoPush(event.target.checked)} type="checkbox" />
          <label htmlFor="audition-auto-push">
            <strong className="block text-white">Auto-push selections</strong>
            <span className="text-slate-500">Bank and library choices only</span>
          </label>
        </div>

        <button
          className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!output || !sysexEnabled || sending}
          onClick={() => void pushVoice(false)}
          type="button"
        >
          {sending ? 'Pushing…' : 'Push voice to FM-1'}
        </button>
      </div>

      {(status || error) && <p className={`mt-3 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}

      <div className="mt-4">
        <VirtualPiano baseOctave={baseOctave} midiChannel={midiChannel} output={output} velocity={velocity} />
      </div>
    </section>
  )
}
