import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createDefaultMsfaLocalPerformanceConfig,
  createMsfaAudioWorkletController,
  MSFA_WORKLET_POLYPHONY,
  type MsfaAudioWorkletController,
} from '../audio/msfaAudioWorklet'
import {
  createLocalSequencePlayer,
  type LocalSequenceNoteTarget,
  type LocalSequencePlayer,
} from '../audio/localSequenceScheduler'
import { getSequenceClockMode, type Fm1Sequence } from '../domain/sequence'
import type { Dx7Voice } from '../domain/voice'

interface LocalSequenceAudioPanelProps {
  sequence: Fm1Sequence
  voice: Dx7Voice
  createController?: () => MsfaAudioWorkletController
}

type LocalAudioState = 'disabled' | 'enabling' | 'ready' | 'error'

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

export function LocalSequenceAudioPanel({
  sequence,
  voice,
  createController = createMsfaAudioWorkletController,
}: LocalSequenceAudioPanelProps) {
  const controllerRef = useRef<MsfaAudioWorkletController | null>(null)
  const playerRef = useRef<LocalSequencePlayer | null>(null)
  const loadedVoiceRef = useRef<Dx7Voice | null>(null)
  const sequenceRef = useRef(sequence)
  const [state, setState] = useState<LocalAudioState>('disabled')
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(true)
  const [playhead, setPlayhead] = useState<number | null>(null)
  const [patternName, setPatternName] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const internalClock = getSequenceClockMode(sequence) === 'internal'

  const noteTarget = useMemo<LocalSequenceNoteTarget>(() => ({
    async noteOn(note, velocity) {
      const controller = controllerRef.current
      if (!controller || controller.state !== 'ready') throw new Error('Enable local sequence audio before playback.')
      await controller.noteOn(note, velocity)
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

  const stopLocalPlayback = useCallback((message?: string) => {
    playerRef.current?.stop()
    playerRef.current = null
    setPlaying(false)
    setPlayhead(null)
    setPatternName(null)
    if (message) setStatus(message)
  }, [])

  const closeLocalAudio = useCallback(async () => {
    stopLocalPlayback()
    const controller = controllerRef.current
    controllerRef.current = null
    loadedVoiceRef.current = null
    if (controller) {
      try {
        await controller.close()
      } catch {
        // The controller already performs best-effort cleanup.
      }
    }
  }, [stopLocalPlayback])

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
      await controller.configurePerformance(createDefaultMsfaLocalPerformanceConfig())
      loadedVoiceRef.current = voice
      setState('ready')
      setStatus(`Local sequence audio enabled at ${controller.sampleRate ?? 'browser'} Hz · ${controller.polyphony} voices.`)
    } catch (cause) {
      await closeLocalAudio()
      setState('error')
      setError(messageOf(cause, 'Local sequence audio could not be enabled.'))
    }
  }, [closeLocalAudio, createController, state, voice])

  const disableLocalAudio = useCallback(async () => {
    await closeLocalAudio()
    setState('disabled')
    setError(null)
    setStatus('Local sequence audio disabled.')
  }, [closeLocalAudio])

  useEffect(() => {
    const controller = controllerRef.current
    if (state !== 'ready' || !controller || loadedVoiceRef.current === voice) return
    stopLocalPlayback('Voice changed; local sequence playback stopped before synchronizing the new voice.')
    void (async () => {
      try {
        await controller.allNotesOff()
        await controller.loadVoice(voice, 42)
        loadedVoiceRef.current = voice
        setStatus(`Local sequence voice synchronized to ${voice.name || 'UNTITLED'}.`)
        setError(null)
      } catch (cause) {
        setError(messageOf(cause, 'The local sequence voice could not be synchronized.'))
      }
    })()
  }, [state, stopLocalPlayback, voice])

  useEffect(() => {
    if (sequenceRef.current === sequence) return
    sequenceRef.current = sequence
    if (playing) stopLocalPlayback('Sequence changed; local playback stopped. Press Play local to use the updated sequence.')
  }, [playing, sequence, stopLocalPlayback])

  useEffect(() => () => {
    playerRef.current?.stop()
    playerRef.current = null
    const controller = controllerRef.current
    controllerRef.current = null
    if (controller) void controller.close().catch(() => undefined)
  }, [])

  const playLocal = () => {
    setError(null)
    if (state !== 'ready' || !controllerRef.current) {
      setError('Enable local sequence audio before playback.')
      return
    }
    if (!internalClock) {
      setError('Local audio playback currently supports internal BPM clock only. Hardware external-clock playback remains separate.')
      return
    }

    stopLocalPlayback()
    try {
      const player = createLocalSequencePlayer(noteTarget, sequence, {
        onStep: (step) => {
          setPlayhead(step.sourceStepIndex)
          setPatternName(step.patternName)
        },
        onComplete: () => {
          playerRef.current = null
          setPlaying(false)
          setPlayhead(null)
          setPatternName(null)
          setStatus('Local sequence playback completed.')
        },
        onError: (cause) => {
          playerRef.current = null
          setPlaying(false)
          setPlayhead(null)
          setPatternName(null)
          setError(cause.message)
        },
      })
      playerRef.current = player
      player.play({
        startDelayMs: 50,
        loop,
        seed: Math.floor(performance.now()) >>> 0,
      })
      setPlaying(true)
      setStatus(loop ? 'Local sequence loop started.' : 'Local sequence playback started.')
    } catch (cause) {
      setError(messageOf(cause, 'Local sequence playback could not be started.'))
    }
  }

  const ready = state === 'ready'

  return (
    <section className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Local sequence audio</p>
          <h3 className="mt-1 text-lg font-bold text-white">{voice.name || 'UNTITLED'}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Play the browser sequencer through the audited local DX7-compatible engine. This route is independent from the hardware MIDI Play/Stop controls below and never sends sequence notes or transport to the selected MIDI output.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className={ready ? 'text-emerald-300' : state === 'error' ? 'text-rose-300' : 'text-amber-200'}>
            {ready ? 'LOCAL AUDIO READY' : state === 'enabling' ? 'STARTING…' : state === 'error' ? 'LOCAL AUDIO ERROR' : 'LOCAL AUDIO OFF'}
          </p>
          <p className="mt-1">{MSFA_WORKLET_POLYPHONY} voices · dry</p>
          <p className={`mt-1 ${internalClock ? 'text-slate-500' : 'text-amber-200'}`}>{internalClock ? `Internal ${sequence.bpm} BPM` : 'External clock · hardware route only'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!ready ? (
          <button className="rounded-xl bg-violet-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40" disabled={state === 'enabling'} onClick={() => void enableLocalAudio()} type="button">
            {state === 'enabling' ? 'Enabling local audio…' : state === 'error' ? 'Retry local audio' : 'Enable local audio'}
          </button>
        ) : (
          <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200" onClick={() => void disableLocalAudio()} type="button">Disable local audio</button>
        )}
        <button className="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled={!ready || !internalClock || playing} onClick={playLocal} type="button">▶ Play local</button>
        <button className="rounded-xl bg-rose-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled={!ready || !playing} onClick={() => stopLocalPlayback('Local sequence playback stopped and all local notes released.')} type="button">■ Stop local</button>
        <label className="ml-1 flex items-center gap-2 text-xs text-slate-400">
          <input checked={loop} disabled={playing} onChange={(event) => setLoop(event.target.checked)} type="checkbox" />
          Loop local playback
        </label>
      </div>

      {(playhead !== null || patternName) && (
        <p className="mt-3 text-xs text-violet-200">Local playhead: {patternName ?? 'Current pattern'} · step {playhead === null ? '—' : playhead + 1}</p>
      )}
      {(status || error) && <p aria-live="polite" className={`mt-3 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        Local scheduling uses semantic notes, chords, ties, gate, swing, direction and arrangement data. External MIDI clock remains on the hardware path until a separate local input-clock route is validated.
      </p>
    </section>
  )
}
