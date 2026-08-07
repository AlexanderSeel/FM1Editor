import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createDefaultMsfaLocalPerformanceConfig,
  createMsfaAudioWorkletController,
  MSFA_WORKLET_PERFORMANCE_ABI,
  MSFA_WORKLET_POLYPHONY,
  type MsfaAudioWorkletController,
  type MsfaLocalPerformanceConfig,
} from '../audio/msfaAudioWorklet'
import { MSFA_OFFLINE_ENGINE_VERSION } from '../audio/msfaOfflineEngine'
import type { Dx7ControllerAssignment } from '../domain/dx7FunctionState'
import type { Dx7Voice } from '../domain/voice'
import { VirtualPiano, type VirtualPianoNoteTarget } from './VirtualPiano'

interface VirtualDx7PreviewPanelProps {
  voice: Dx7Voice
  createController?: () => MsfaAudioWorkletController
}

type PreviewState = 'disabled' | 'enabling' | 'ready' | 'error'
type PerformanceController = 'modulationWheel' | 'aftertouch'

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

function assignmentFromMask(mask: number): Dx7ControllerAssignment {
  return {
    pitch: (mask & 0x01) !== 0,
    amplitude: (mask & 0x02) !== 0,
    egBias: (mask & 0x04) !== 0,
  }
}

function assignmentMask(assignment: Dx7ControllerAssignment): number {
  return (assignment.pitch ? 1 : 0) | (assignment.amplitude ? 2 : 0) | (assignment.egBias ? 4 : 0)
}

function assignmentLabel(mask: number): string {
  if (mask === 0) return 'None'
  const parts = [
    (mask & 1) !== 0 ? 'Pitch' : null,
    (mask & 2) !== 0 ? 'Amplitude' : null,
    (mask & 4) !== 0 ? 'EG bias' : null,
  ].filter(Boolean)
  return parts.join(' + ')
}

export function VirtualDx7PreviewPanel({
  voice,
  createController = createMsfaAudioWorkletController,
}: VirtualDx7PreviewPanelProps) {
  const controllerRef = useRef<MsfaAudioWorkletController | null>(null)
  const loadedVoiceRef = useRef<Dx7Voice | null>(null)
  const [state, setState] = useState<PreviewState>('disabled')
  const [velocity, setVelocity] = useState(105)
  const [baseOctave, setBaseOctave] = useState(3)
  const [performance, setPerformance] = useState<MsfaLocalPerformanceConfig>(() => createDefaultMsfaLocalPerformanceConfig())
  const [pitchBend, setPitchBend] = useState(8192)
  const [modulation, setModulation] = useState(0)
  const [aftertouch, setAftertouch] = useState(0)
  const [sustain, setSustain] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const closeController = useCallback(async () => {
    const controller = controllerRef.current
    controllerRef.current = null
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
      await controller.configurePerformance(performance)
      await controller.setPitchBend(pitchBend)
      await controller.setModulation(modulation)
      await controller.setAftertouch(aftertouch)
      await controller.setSustain(sustain)
      loadedVoiceRef.current = voice
      setState('ready')
      setStatus(`Local dry preview enabled at ${controller.sampleRate ?? 'browser'} Hz with ${controller.polyphony}-voice polyphony.`)
    } catch (cause) {
      await closeController()
      setState('error')
      setError(messageOf(cause, 'The local DX7-compatible preview could not be enabled.'))
    }
  }, [aftertouch, closeController, createController, modulation, performance, pitchBend, state, sustain, voice])

  const disableLocalAudio = useCallback(async () => {
    await closeController()
    setSustain(false)
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

  useEffect(() => {
    const controller = controllerRef.current
    if (state !== 'ready' || !controller) return
    void controller.configurePerformance(performance).catch((cause: unknown) => {
      setError(messageOf(cause, 'Local performance configuration could not be applied.'))
    })
  }, [performance, state])

  useEffect(() => () => {
    const controller = controllerRef.current
    controllerRef.current = null
    if (controller) void controller.close().catch(() => undefined)
  }, [])

  const noteTarget = useMemo<VirtualPianoNoteTarget>(() => ({
    label: `local DX7-compatible dry audio · ${MSFA_WORKLET_POLYPHONY}-voice polyphony`,
    async noteOn(note, noteVelocity) {
      const controller = controllerRef.current
      if (!controller || controller.state !== 'ready') {
        throw new Error('Enable local audio before playing the virtual piano.')
      }
      await controller.noteOn(note, noteVelocity)
    },
    async noteOff(note) {
      const controller = controllerRef.current
      if (!controller || controller.state !== 'ready') return
      await controller.noteOff(note)
    },
    async allNotesOff() {
      const controller = controllerRef.current
      if (!controller || controller.state !== 'ready') return
      await controller.allNotesOff()
    },
  }), [])

  const runLiveControl = useCallback((action: (controller: MsfaAudioWorkletController) => Promise<void>) => {
    const controller = controllerRef.current
    if (state !== 'ready' || !controller) return
    void action(controller).then(() => setError(null)).catch((cause: unknown) => {
      setError(messageOf(cause, 'The local performance control could not be applied.'))
    })
  }, [state])

  const updateControllerConfig = (controllerName: PerformanceController, range: number, mask: number) => {
    setPerformance((current) => ({
      ...current,
      [controllerName]: {
        range,
        assignment: assignmentFromMask(mask),
      },
    }))
  }

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
          <p className="mt-1">Dry · 12-TET · {MSFA_WORKLET_POLYPHONY} voices · performance ABI {MSFA_WORKLET_PERFORMANCE_ABI}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="grid min-w-[180px] flex-1 gap-1.5 text-xs text-slate-400">
          <label className="flex justify-between font-semibold uppercase tracking-[0.12em]" htmlFor="virtual-dx7-velocity">
            <span>Velocity</span><strong className="text-violet-200">{velocity}</strong>
          </label>
          <input disabled={!ready} id="virtual-dx7-velocity" max={127} min={1} onChange={(event) => setVelocity(Number(event.target.value))} type="range" value={velocity} />
        </div>
        <div className="grid gap-1.5 text-xs text-slate-400">
          <label className="font-semibold uppercase tracking-[0.12em]" htmlFor="virtual-dx7-base-octave">Piano starts</label>
          <select className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white" disabled={!ready} id="virtual-dx7-base-octave" onChange={(event) => setBaseOctave(Number(event.target.value))} value={baseOctave}>
            {[1, 2, 3, 4, 5, 6].map((octave) => <option key={octave} value={octave}>C{octave}</option>)}
          </select>
        </div>
        {!ready ? (
          <button className="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-40" disabled={state === 'enabling'} onClick={() => void enableLocalAudio()} type="button">
            {state === 'enabling' ? 'Enabling local audio…' : state === 'error' ? 'Retry local audio' : 'Enable local audio'}
          </button>
        ) : (
          <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10" onClick={() => void disableLocalAudio()} type="button">Disable local audio</button>
        )}
      </div>

      <details className="mt-4 rounded-xl border border-violet-300/15 bg-black/15 p-3">
        <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-[0.14em] text-violet-200">Local performance controls</summary>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          Browser-local performance state only. These documented DX7-style ranges are not written into the voice file and are never sent to the selected hardware output.
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1.5 text-xs text-slate-400" htmlFor="virtual-dx7-pitch-bend-range">
            <span className="flex justify-between font-semibold uppercase tracking-[0.12em]"><span>Pitch-bend range</span><strong>{performance.pitchBendRange}</strong></span>
          </label>
          <input className="self-end" id="virtual-dx7-pitch-bend-range" max={12} min={0} onChange={(event) => setPerformance((current) => ({ ...current, pitchBendRange: Number(event.target.value) }))} type="range" value={performance.pitchBendRange} />

          <label className="grid gap-1.5 text-xs text-slate-400" htmlFor="virtual-dx7-pitch-bend-step">
            <span className="flex justify-between font-semibold uppercase tracking-[0.12em]"><span>Pitch-bend step</span><strong>{performance.pitchBendStep}</strong></span>
          </label>
          <input className="self-end" id="virtual-dx7-pitch-bend-step" max={12} min={0} onChange={(event) => setPerformance((current) => ({ ...current, pitchBendStep: Number(event.target.value) }))} type="range" value={performance.pitchBendStep} />

          <div className="grid gap-1.5 text-xs text-slate-400">
            <label className="flex justify-between font-semibold uppercase tracking-[0.12em]" htmlFor="virtual-dx7-pitch-bend"><span>Pitch bend</span><strong>{pitchBend - 8192}</strong></label>
            <input disabled={!ready} id="virtual-dx7-pitch-bend" max={16383} min={0} onChange={(event) => {
              const value = Number(event.target.value)
              setPitchBend(value)
              runLiveControl((controller) => controller.setPitchBend(value))
            }} type="range" value={pitchBend} />
            <button className="justify-self-start rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-40" disabled={!ready || pitchBend === 8192} onClick={() => {
              setPitchBend(8192)
              runLiveControl((controller) => controller.setPitchBend(8192))
            }} type="button">Center</button>
          </div>
          <div className="grid content-start gap-1.5 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-[0.12em]">Sustain</span>
            <button className={`rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40 ${sustain ? 'bg-violet-300 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300'}`} disabled={!ready} onClick={() => {
              const enabled = !sustain
              setSustain(enabled)
              runLiveControl((controller) => controller.setSustain(enabled))
            }} type="button">{sustain ? 'Pedal on' : 'Pedal off'}</button>
          </div>
        </div>

        {(['modulationWheel', 'aftertouch'] as const).map((controllerName) => {
          const controllerConfig = performance[controllerName]
          const mask = assignmentMask(controllerConfig.assignment)
          const liveValue = controllerName === 'modulationWheel' ? modulation : aftertouch
          const setLiveValue = controllerName === 'modulationWheel' ? setModulation : setAftertouch
          const prefix = `virtual-dx7-${controllerName}`
          return (
            <div className="mt-3 grid gap-3 rounded-lg border border-white/8 p-3 sm:grid-cols-3" key={controllerName}>
              <div className="grid gap-1.5 text-xs text-slate-400">
                <label className="flex justify-between font-semibold uppercase tracking-[0.12em]" htmlFor={`${prefix}-range`}><span>{controllerName === 'modulationWheel' ? 'Mod wheel range' : 'Aftertouch range'}</span><strong>{controllerConfig.range}</strong></label>
                <input id={`${prefix}-range`} max={99} min={0} onChange={(event) => updateControllerConfig(controllerName, Number(event.target.value), mask)} type="range" value={controllerConfig.range} />
              </div>
              <div className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                <label htmlFor={`${prefix}-assignment`}>Assignment</label>
                <select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white" id={`${prefix}-assignment`} onChange={(event) => updateControllerConfig(controllerName, controllerConfig.range, Number(event.target.value))} value={mask}>
                  {Array.from({ length: 8 }, (_, value) => <option key={value} value={value}>{value} · {assignmentLabel(value)}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5 text-xs text-slate-400">
                <label className="flex justify-between font-semibold uppercase tracking-[0.12em]" htmlFor={`${prefix}-value`}><span>{controllerName === 'modulationWheel' ? 'Mod wheel' : 'Aftertouch'}</span><strong>{liveValue}</strong></label>
                <input disabled={!ready} id={`${prefix}-value`} max={127} min={0} onChange={(event) => {
                  const value = Number(event.target.value)
                  setLiveValue(value)
                  runLiveControl((controller) => controllerName === 'modulationWheel' ? controller.setModulation(value) : controller.setAftertouch(value))
                }} type="range" value={liveValue} />
              </div>
            </div>
          )
        })}
      </details>

      {(status || error) && <p aria-live="polite" className={`mt-3 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}

      <div className="mt-4">
        <VirtualPiano baseOctave={baseOctave} disabled={!ready} disabledReason="Enable local audio to audition this voice without MIDI hardware." midiChannel={1} noteTarget={ready ? noteTarget : null} output={null} showMidiControls={false} velocity={velocity} />
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        The worklet provides deterministic {MSFA_WORKLET_POLYPHONY}-voice allocation and stealing over the accepted stateful engine sessions. Dry summing uses a safety clamp; local performance scaling is DX7-compatible software behavior, not a physical FM-1 equivalence claim.
      </p>
    </section>
  )
}
