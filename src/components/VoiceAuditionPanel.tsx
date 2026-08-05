import { useCallback, useMemo, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import { downloadBytes } from '../files/download'
import {
  mergeVoiceIntoFm1Bank,
  resolveFm1PresetLocation,
  sendMergedBankToFm1,
  type Fm1BankLetter,
} from '../midi/fm1BankTransfer'
import type { MidiOutputTarget } from '../midi/output'
import {
  playFm1TestNote,
  recallFm1Preset,
} from '../midi/voiceAudition'
import { encodeVoiceBankMessage } from '../sysex/dx7'
import { VirtualPiano } from './VirtualPiano'

interface VoiceAuditionPanelProps {
  voice: Dx7Voice
  baseBank: readonly Dx7Voice[]
  selectedBankSlot: number | null
  output: MidiOutputTarget | null
  sysexEnabled: boolean
}

type BusyAction = 'send-bank' | 'recall' | 'test' | null

export function VoiceAuditionPanel({
  voice,
  baseBank,
  selectedBankSlot,
  output,
  sysexEnabled,
}: VoiceAuditionPanelProps) {
  const [midiChannel, setMidiChannel] = useState(1)
  const [velocity, setVelocity] = useState(105)
  const [baseOctave, setBaseOctave] = useState(3)
  const [targetBank, setTargetBank] = useState<Fm1BankLetter>('A')
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const slot = selectedBankSlot === null ? null : selectedBankSlot + 1
  const location = useMemo(
    () => slot === null ? null : resolveFm1PresetLocation(targetBank, slot),
    [slot, targetBank],
  )
  const baseReady = baseBank.length === 32 && location !== null
  const busy = busyAction !== null

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

  const createMergedBank = useCallback((): readonly Dx7Voice[] => {
    if (!location) throw new Error('Load a complete 32-voice bank and select the slot that should be replaced.')
    return mergeVoiceIntoFm1Bank(baseBank, voice, location.slot)
  }, [baseBank, location, voice])

  const exportBaseBank = () => {
    try {
      if (baseBank.length !== 32) throw new Error('A complete 32-voice base bank is required.')
      downloadBytes(encodeVoiceBankMessage(baseBank), `fm1-base-bank-${targetBank.toLowerCase()}.syx`)
      setStatus(`Exported the unchanged 32-voice base bank for destination ${targetBank}. Keep this as the recovery copy.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The base bank could not be exported.')
    }
  }

  const exportMergedBank = () => {
    try {
      if (!location) throw new Error('Select a bank slot first.')
      downloadBytes(
        encodeVoiceBankMessage(createMergedBank()),
        `fm1-${targetBank.toLowerCase()}-${String(location.slot).padStart(2, '0')}-${voice.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'voice'}.syx`,
      )
      setStatus(`Exported a merged bank with ${voice.name || 'UNTITLED'} in ${targetBank}${String(location.slot).padStart(2, '0')}.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The merged bank could not be exported.')
    }
  }

  const sendMergedBank = async () => {
    if (busy) return
    const target = requireOutput()
    if (!target) return
    if (!sysexEnabled) {
      setError('Reconnect Web MIDI with SysEx permission before sending a bank.')
      return
    }
    if (!location || baseBank.length !== 32) {
      setError('Load a complete 32-voice bank and select the slot to replace first.')
      return
    }

    const confirmed = window.confirm(
      `Send a complete 32-voice bank to the FM-1?\n\n` +
      `Current voice: ${voice.name || 'UNTITLED'}\n` +
      `Replace slot: ${targetBank}${String(location.slot).padStart(2, '0')} (preset ${location.preset})\n\n` +
      `The FM-1 should open its bank destination screen. Select bank ${targetBank}. This can overwrite all 32 presets in that bank. The app cannot read the device bank, so the loaded base bank must be the exact recovery/base copy.`,
    )
    if (!confirmed) return

    beginAction('send-bank')
    try {
      const result = await sendMergedBankToFm1(
        target,
        baseBank,
        voice,
        targetBank,
        location.slot,
        midiChannel,
      )
      setStatus(
        `Sent ${result.byteLength} bytes to ${result.outputName}. On the FM-1, choose destination bank ${result.bank}. After the device confirms the save, recall preset ${result.preset} and test it with the piano.`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The merged 32-voice bank could not be sent.')
    } finally {
      setBusyAction(null)
    }
  }

  const recallTargetPreset = async () => {
    if (busy) return
    const target = requireOutput()
    if (!target) return
    if (!location) {
      setError('Select a slot in a loaded 32-voice bank first.')
      return
    }

    beginAction('recall')
    try {
      const result = await recallFm1Preset(target, midiChannel, location.preset)
      setStatus(`Recalled ${targetBank}${String(location.slot).padStart(2, '0')} as preset ${result.preset} on MIDI channel ${result.midiChannel}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The target preset could not be recalled.')
    } finally {
      setBusyAction(null)
    }
  }

  const testNote = async () => {
    if (busy) return
    const target = requireOutput()
    if (!target) return
    beginAction('test')
    try {
      await playFm1TestNote(target, midiChannel, 60, velocity)
      setStatus(`Sent C4 on MIDI channel ${midiChannel}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The test note could not be sent.')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">FM-1 bank audition</p>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Whole-bank overwrite</span>
          </div>
          <h3 className="mt-2 truncate text-lg font-bold text-white">{voice.name || 'UNTITLED'}</h3>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400">
            Immediate single-voice push is disabled because both attempted edit-buffer methods silenced the FM-1. This workflow replaces one slot in the currently loaded 32-voice base bank and sends one standard DX7 bank dump.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className={output ? 'text-emerald-300' : 'text-amber-200'}>{output ? output.name || 'MIDI output selected' : 'No MIDI output'}</p>
          <p className="mt-1">SysEx {sysexEnabled ? 'enabled' : 'not enabled'}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-xs leading-5 text-amber-100">
        <strong>No device readback:</strong> the app cannot recall the other 31 voices from the FM-1. Before sending, load the exact base or backup bank for the destination and export it as a recovery copy.
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[130px_minmax(170px,1fr)_125px_125px_150px]">
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
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="audition-target-bank">Destination</label>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            disabled={busy}
            id="audition-target-bank"
            onChange={(event) => setTargetBank(event.target.value as Fm1BankLetter)}
            value={targetBank}
          >
            {(['A', 'B', 'C', 'D'] as const).map((bank) => <option key={bank} value={bank}>Bank {bank}</option>)}
          </select>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-slate-400">
          <span className="block font-semibold uppercase tracking-[0.12em]">Selected target</span>
          <strong className="mt-1 block text-sm text-white">
            {location ? `${location.bank}${String(location.slot).padStart(2, '0')} · preset ${location.preset}` : 'Select a bank slot'}
          </strong>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40" disabled={baseBank.length !== 32 || busy} onClick={exportBaseBank} type="button">Export base backup</button>
        <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40" disabled={!baseReady || busy} onClick={exportMergedBank} type="button">Export merged bank</button>
        <button className="rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40" disabled={!baseReady || !output || !sysexEnabled || busy} onClick={() => void sendMergedBank()} type="button">{busyAction === 'send-bank' ? 'Sending bank…' : 'Send merged 32-voice bank'}</button>
        <button className="rounded-xl border border-violet-300/20 bg-violet-300/5 px-4 py-2.5 text-sm font-bold text-violet-200 hover:bg-violet-300/10 disabled:opacity-40" disabled={!location || !output || busy} onClick={() => void recallTargetPreset()} type="button">{busyAction === 'recall' ? 'Recalling…' : 'Recall target preset'}</button>
        <button className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-40" disabled={!output || busy} onClick={() => void testNote()} type="button">{busyAction === 'test' ? 'Testing…' : 'Test C4'}</button>
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
