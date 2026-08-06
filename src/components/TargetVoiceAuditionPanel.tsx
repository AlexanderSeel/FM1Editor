import { useState } from 'react'
import type { DeviceTarget } from '../domain/deviceTarget'
import type { Dx7Voice } from '../domain/voice'
import type { MidiOutputTarget } from '../midi/output'
import { playFm1TestNote } from '../midi/voiceAudition'
import { VirtualPiano } from './VirtualPiano'
import { VoiceAuditionPanel } from './VoiceAuditionPanel'

interface TargetVoiceAuditionPanelProps {
  target: DeviceTarget
  voice: Dx7Voice
  baseBank: readonly Dx7Voice[]
  selectedBankSlot: number | null
  output: MidiOutputTarget | null
  sysexEnabled: boolean
}

function Dx7NoteAuditionPanel({
  voice,
  output,
}: Pick<TargetVoiceAuditionPanelProps, 'voice' | 'output'>) {
  const [midiChannel, setMidiChannel] = useState(1)
  const [velocity, setVelocity] = useState(105)
  const [baseOctave, setBaseOctave] = useState(3)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testNote = async () => {
    if (busy) return
    if (!output) {
      setError('Connect and manually select a Yamaha DX7 MIDI output first.')
      setStatus(null)
      return
    }

    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      await playFm1TestNote(output, midiChannel, 60, velocity)
      setStatus(`Sent C4 on MIDI channel ${midiChannel}. No DX7 SysEx data was transmitted.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The test note could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Yamaha DX7 note audition</p>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">Notes only</span>
          </div>
          <h3 className="mt-2 truncate text-lg font-bold text-white">{voice.name || 'UNTITLED'}</h3>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400">
            Standard MIDI note audition is available. FM-1 bank merge, preset recall and effects writes are hidden for this target. DX7 single-voice, bank, parameter-change, dump-request and function-data SysEx remain disabled until implemented with target-specific validation.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className={output ? 'text-emerald-300' : 'text-amber-200'}>{output ? output.name || 'MIDI output selected' : 'No MIDI output'}</p>
          <p className="mt-1">No SysEx operation enabled</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-xs leading-5 text-cyan-100">
        <strong>Manual port boundary:</strong> verify that the selected output is the intended DX7 port before playing. Selecting the DX7 target never transmits a voice or bank automatically.
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="dx7-audition-midi-channel">Note channel</label>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            disabled={busy}
            id="dx7-audition-midi-channel"
            onChange={(event) => setMidiChannel(Number(event.target.value))}
            value={midiChannel}
          >
            {Array.from({ length: 16 }, (_, index) => index + 1).map((channel) => (
              <option key={channel} value={channel}>Channel {channel}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="flex justify-between font-semibold uppercase tracking-[0.12em]" htmlFor="dx7-audition-velocity"><span>Velocity</span><strong className="text-cyan-200">{velocity}</strong></label>
          <input disabled={busy} id="dx7-audition-velocity" max={127} min={1} onChange={(event) => setVelocity(Number(event.target.value))} type="range" value={velocity} />
        </div>

        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="dx7-audition-base-octave">Piano starts</label>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            disabled={busy}
            id="dx7-audition-base-octave"
            onChange={(event) => setBaseOctave(Number(event.target.value))}
            value={baseOctave}
          >
            {[1, 2, 3, 4, 5, 6].map((octave) => <option key={octave} value={octave}>C{octave}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-40"
          disabled={!output || busy}
          onClick={() => void testNote()}
          type="button"
        >
          {busy ? 'Testing…' : 'Test C4'}
        </button>
      </div>

      {(status || error) && <p aria-live="polite" className={`mt-3 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}

      <div className="mt-4">
        <VirtualPiano
          baseOctave={baseOctave}
          disabled={busy}
          disabledReason="Wait for the current MIDI operation to finish."
          midiChannel={midiChannel}
          output={output}
          velocity={velocity}
        />
      </div>
    </section>
  )
}

export function TargetVoiceAuditionPanel(props: TargetVoiceAuditionPanelProps) {
  if (props.target === 'dx7') {
    return <Dx7NoteAuditionPanel output={props.output} voice={props.voice} />
  }

  return (
    <VoiceAuditionPanel
      baseBank={props.baseBank}
      output={props.output}
      selectedBankSlot={props.selectedBankSlot}
      sysexEnabled={props.sysexEnabled}
      voice={props.voice}
    />
  )
}
