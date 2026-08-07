import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createMsfaAudioWorkletController,
  type MsfaAudioWorkletController,
} from '../audio/msfaAudioWorklet'
import { MSFA_OFFLINE_ENGINE_VERSION } from '../audio/msfaOfflineEngine'
import type { Dx7Voice } from '../domain/voice'
import { VirtualPiano, type VirtualPianoNoteTarget } from './VirtualPiano'

interface VirtualDx7PreviewPanelProps {
  voice: Dx7Voice
  createController?: () => MsfaAudioWorkletController
}

type PreviewState = 'disabled' | 'enabling' | 'ready' | 'error'

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

export function VirtualDx7PreviewPanel({
  voice,
  createController = createMsfaAudioWorkletController,
}: VirtualDx7PreviewPanelProps) {
  const controllerRef = useRef<MsfaAudioWorkletController | null>(null)
  const activeNoteRef = useRef<number | null>(null)
  const loadedVoiceRef = useRef<Dx7Voice | null>(null)
  const [state, setState] = useState<PreviewState>('disabled')
  const [velocity, setVelocity] = useState(105)
  const [baseOctave, setBaseOctave] = useState(3)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const closeController = useCallback(async () => {
    const controller = controllerRef.current
    controllerRef.current = null
    activeNoteRef.current = null
    loadedVoiceRef.current = null
    if (controller) {
      try {
        await controller.close()
      } catch {
        // The controller performs best-effort cleanup internally.
      }
    }
  }, [])

  const enableLocalAudio = useCallback(async () => {
    if (state === 'enabling' || state === 'ready') return
    setState('enabling')
    setStatus(null)
    setError(null)

    const controller = createController()
    controllerRef.current = controller
    try {
      await controller.enable()
      await controller.loadVoice(voice, 42)
      loadedVoiceRef.current = voice
      setState('ready')
      setStatus(`Local dry preview enabled at ${controller.sampleRate ?? 'browser'} Hz.`)
    } catch (cause) {
      await closeController()
      setState('error')
      setError(messageOf(cause, 'The local DX7-compatible preview could not be enabled.'))
    }
  }, [closeController, createController, state, voice])

  const disableLocalAudio = useCallback(async () => {
    await closeController()
    setState('disabled')
    setStatus('Local audio disabled.')
    setError(null)
  }, [closeController])

  useEffect(() => {
    const controller = controllerRef.current
    if (state !== 'ready' || !controller || loadedVoiceRef.current === voice) return

    let cancelled = false
    void (async () => {
      try {
        activeNoteRef.current = null
        await controller.allNotesOff()
        await controller.loadVoice(voice, 42)
        loadedVoiceRef.current = voice
        if (!cancelled) {
          setStatus(`Local preview synchronized to ${voice.name || 'UNTITLED'}.`)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) setError(messageOf(cause, 'The local preview could not synchronize the current voice.'))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [state, voice])

  useEffect(() => () => {
    const controller = controllerRef.current
    controllerRef.current = null
    activeNoteRef.current = null
    if (controller) void controller.close().catch(() => undefined)
  }, [])

  const noteTarget = useMemo<VirtualPianoNoteTarget>(() => ({
    label: 'local DX7-compatible dry audio · monophonic',
    async noteOn(note, noteVelocity) {
      const controller = controllerRef.current
      if (!controller || controller.state !== 'ready') {
        throw new Error('Enable local audio before playing the virtual piano.')
      }
      const previous = activeNoteRef.current
      if (previous !== null && previous !== note) await controller.allNotesOff()
      await controller.noteOn(note, noteVelocity)
      activeNoteRef.current = note
    },
    async noteOff(note) {
      const controller = controllerRef.current
      if (!controller || controller.state !== 'ready' || activeNoteRef.current !== note) return
      await controller.noteOff()
      activeNoteRef.current = null
    },
    async allNotesOff() {
      const controller = controllerRef.current
      activeNoteRef.current = null
      if (!controller || controller.state !== 'ready') return
      await controller.allNotesOff()
    },
  }), [])

  const ready = state === 'ready'

  return (
    <section className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Local DX7-compatible preview</p>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">Browser only</span>
          </div>
          <h3 className="mt-2 truncate text-lg font-bold text-white">{voice.name || 'UNTITLED'}</h3>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400">
            Audition the current semantic voice through the audited dry WebAssembly engine. Enabling this creates local browser audio only; it does not request Web MIDI, transmit SysEx or send anything to connected hardware.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className={ready ? 'text-emerald-300' : state === 'error' ? 'text-rose-300' : 'text-amber-200'}>
            {ready ? 'LOCAL AUDIO READY' : state === 'enabling' ? 'STARTING AUDIO…' : state === 'error' ? 'LOCAL AUDIO ERROR' : 'LOCAL AUDIO OFF'}
          </p>
          <p className="mt-1">{MSFA_OFFLINE_ENGINE_VERSION}</p>
          <p className="mt-1">Dry · standard 12-TET · one voice</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="grid min-w-[180px] flex-1 gap-1.5 text-xs text-slate-400">
          <label className="flex justify-between font-semibold uppercase tracking-[0.12em]" htmlFor="virtual-dx7-velocity">
            <span>Velocity</span><strong className="text-violet-200">{velocity}</strong>
          </label>
          <input
            disabled={!ready}
            id="virtual-dx7-velocity"
            max={127}
            min={1}
            onChange={(event) => setVelocity(Number(event.target.value))}
            type="range"
            value={velocity}
          />
        </div>
        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="virtual-dx7-base-octave">Piano starts</label>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            disabled={!ready}
            id="virtual-dx7-base-octave"
            onChange={(event) => setBaseOctave(Number(event.target.value))}
            value={baseOctave}
          >
            {[1, 2, 3, 4, 5, 6].map((octave) => <option key={octave} value={octave}>C{octave}</option>)}
          </select>
        </div>
        {!ready ? (
          <button
            className="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={state === 'enabling'}
            onClick={() => void enableLocalAudio()}
            type="button"
          >
            {state === 'enabling' ? 'Enabling local audio…' : state === 'error' ? 'Retry local audio' : 'Enable local audio'}
          </button>
        ) : (
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10"
            onClick={() => void disableLocalAudio()}
            type="button"
          >
            Disable local audio
          </button>
        )}
      </div>

      {(status || error) && (
        <p aria-live="polite" className={`mt-3 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>
          {error ?? status}
        </p>
      )}

      <div className="mt-4">
        <VirtualPiano
          baseOctave={baseOctave}
          disabled={!ready}
          disabledReason="Enable local audio to audition this voice without MIDI hardware."
          midiChannel={1}
          noteTarget={ready ? noteTarget : null}
          output={null}
          showMidiControls={false}
          velocity={velocity}
        />
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        The accepted browser engine is currently monophonic. Overlapping local piano notes use deterministic note stealing; hardware MIDI audition remains a separate workflow below.
      </p>
    </section>
  )
}
