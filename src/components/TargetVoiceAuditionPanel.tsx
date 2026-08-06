import { useState } from 'react'
import type { DeviceTarget } from '../domain/deviceTarget'
import type { Dx7Voice } from '../domain/voice'
import {
  sendSingleVoiceToDx7,
  sendVoiceBankToDx7,
} from '../midi/dx7Transfer'
import type { MidiOutputTarget } from '../midi/output'
import { playFm1TestNote } from '../midi/voiceAudition'
import { Dx7FunctionControls } from './Dx7FunctionControls'
import { Dx7VoiceParameterControls } from './Dx7VoiceParameterControls'
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

type Dx7BusyAction = 'test' | 'single-voice' | 'voice-bank' | null

function Dx7AuditionPanel({
  voice,
  baseBank,
  output,
  sysexEnabled,
}: Pick<TargetVoiceAuditionPanelProps, 'voice' | 'baseBank' | 'output' | 'sysexEnabled'>) {
  const [midiChannel, setMidiChannel] = useState(1)
  const [velocity, setVelocity] = useState(105)
  const [baseOctave, setBaseOctave] = useState(3)
  const [systemInfoReady, setSystemInfoReady] = useState(false)
  const [memoryProtectOff, setMemoryProtectOff] = useState(false)
  const [busyAction, setBusyAction] = useState<Dx7BusyAction>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const busy = busyAction !== null
  const hardwareReady = systemInfoReady && memoryProtectOff
  const singleTransferReady = Boolean(output && sysexEnabled && hardwareReady)
  const bankTransferReady = singleTransferReady && baseBank.length === 32

  const requireOutput = (): MidiOutputTarget | null => {
    if (output) return output
    setError('Connect and manually select a Yamaha DX7 MIDI output first.')
    setStatus(null)
    return null
  }

  const testNote = async () => {
    if (busy) return
    const target = requireOutput()
    if (!target) return

    setBusyAction('test')
    setError(null)
    setStatus(null)
    try {
      await playFm1TestNote(target, midiChannel, 60, velocity)
      setStatus(`Sent C4 on MIDI channel ${midiChannel}. No DX7 SysEx data was transmitted.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The test note could not be sent.')
    } finally {
      setBusyAction(null)
    }
  }

  const sendSingleVoice = async () => {
    if (busy) return
    const target = requireOutput()
    if (!target) return
    if (!sysexEnabled) {
      setError('Reconnect Web MIDI with SysEx permission before sending a voice.')
      return
    }
    if (!hardwareReady) {
      setError('Confirm the DX7 System Info and Memory Protect settings before transmission.')
      return
    }

    const confirmed = window.confirm(
      `Send the current voice to the Yamaha DX7 edit buffer?\n\n` +
      `Voice: ${voice.name || 'UNTITLED'}\n` +
      `MIDI channel: ${midiChannel}\n` +
      `Message: standard 163-byte Yamaha single-voice bulk dump\n\n` +
      `Verify the manually selected output, matching DX7 MIDI channel, System Info availability and Memory Protect setting. This does not save the voice to a numbered internal slot automatically.`,
    )
    if (!confirmed) return

    setBusyAction('single-voice')
    setError(null)
    setStatus(null)
    try {
      const result = await sendSingleVoiceToDx7(target, voice, midiChannel)
      setStatus(`Sent ${result.byteLength} bytes to ${result.outputName} on MIDI channel ${result.midiChannel}. Audition the edit buffer, then store it from the DX7 front panel if required.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The single voice could not be sent.')
    } finally {
      setBusyAction(null)
    }
  }

  const sendVoiceBank = async () => {
    if (busy) return
    const target = requireOutput()
    if (!target) return
    if (!sysexEnabled) {
      setError('Reconnect Web MIDI with SysEx permission before sending a bank.')
      return
    }
    if (!hardwareReady) {
      setError('Confirm the DX7 System Info and Memory Protect settings before transmission.')
      return
    }
    if (baseBank.length !== 32) {
      setError('Load a complete 32-voice bank before sending a DX7 bank dump.')
      return
    }

    const confirmed = window.confirm(
      `Overwrite the Yamaha DX7 internal 32-voice memory with the loaded bank?\n\n` +
      `Voices: 32\n` +
      `MIDI channel: ${midiChannel}\n` +
      `Message: standard 4,104-byte Yamaha bank bulk dump\n\n` +
      `This is a destructive whole-bank operation. Back up the current DX7 memory first, verify the selected output and channel, enable System Info, and turn Memory Protect off. Continue only when the loaded bank is the exact bank you intend to write.`,
    )
    if (!confirmed) return

    setBusyAction('voice-bank')
    setError(null)
    setStatus(null)
    try {
      const result = await sendVoiceBankToDx7(target, baseBank, midiChannel)
      setStatus(`Sent ${result.byteLength} bytes to ${result.outputName} on MIDI channel ${result.midiChannel}. Verify all internal voices on the DX7 before treating the transfer as complete.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The 32-voice bank could not be sent.')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Yamaha DX7 audition and transfer</p>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Explicit transfer only</span>
          </div>
          <h3 className="mt-2 truncate text-lg font-bold text-white">{voice.name || 'UNTITLED'}</h3>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400">
            Standard MIDI notes, Yamaha single/bank bulk receive, semantic voice parameters 0–155 and function parameters 64–77 are available only through guarded controls. FM-1 bank mapping and effects remain hidden; no dump-request or automatic store command is constructed.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className={output ? 'text-emerald-300' : 'text-amber-200'}>{output ? output.name || 'MIDI output selected' : 'No MIDI output'}</p>
          <p className="mt-1">SysEx {sysexEnabled ? 'enabled' : 'not enabled'}</p>
          <p className="mt-1">Loaded bank {baseBank.length}/32</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-xs leading-5 text-cyan-100">
        <strong>Manual port boundary:</strong> selecting Yamaha DX7 never sends data automatically. Verify the selected output and matching DX7 MIDI channel before every note or SysEx operation.
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">
          <input checked={systemInfoReady} className="mt-0.5 h-4 w-4 accent-cyan-300" disabled={busy} onChange={(event) => setSystemInfoReady(event.target.checked)} type="checkbox" />
          <span><strong className="block text-white">DX7 System Info is available</strong>I verified the receiving DX7 is configured to accept system-exclusive data on the selected channel.</span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">
          <input checked={memoryProtectOff} className="mt-0.5 h-4 w-4 accent-cyan-300" disabled={busy} onChange={(event) => setMemoryProtectOff(event.target.checked)} type="checkbox" />
          <span><strong className="block text-white">Memory Protect is off</strong>I accept that a complete bank transfer can overwrite all 32 internal voices.</span>
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="dx7-audition-midi-channel">DX7 MIDI channel</label>
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
          {busyAction === 'test' ? 'Testing…' : 'Test C4'}
        </button>
        <button
          className="rounded-xl border border-violet-300/20 bg-violet-300/5 px-4 py-2.5 text-sm font-bold text-violet-200 hover:bg-violet-300/10 disabled:opacity-40"
          disabled={!singleTransferReady || busy}
          onClick={() => void sendSingleVoice()}
          type="button"
        >
          {busyAction === 'single-voice' ? 'Sending voice…' : 'Send current voice to edit buffer'}
        </button>
        <button
          className="rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!bankTransferReady || busy}
          onClick={() => void sendVoiceBank()}
          type="button"
        >
          {busyAction === 'voice-bank' ? 'Sending bank…' : 'Overwrite DX7 with loaded 32-voice bank'}
        </button>
      </div>

      {(status || error) && <p aria-live="polite" className={`mt-3 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}

      <div className="mt-4 grid gap-4">
        <Dx7VoiceParameterControls
          disabled={busy}
          hardwareReady={hardwareReady}
          midiChannel={midiChannel}
          output={output}
          sysexEnabled={sysexEnabled}
          voice={voice}
        />
        <Dx7FunctionControls
          disabled={busy}
          hardwareReady={hardwareReady}
          midiChannel={midiChannel}
          output={output}
          sysexEnabled={sysexEnabled}
        />
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
    return (
      <Dx7AuditionPanel
        baseBank={props.baseBank}
        output={props.output}
        sysexEnabled={props.sysexEnabled}
        voice={props.voice}
      />
    )
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
