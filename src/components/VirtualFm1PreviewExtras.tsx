import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Fm1FxState } from '../domain/fx'
import type { Dx7Voice } from '../domain/voice'
import { frequencyToMidiNote } from '../audio/nearestPreset'
import {
  getPreparedReferenceAudioSnapshot,
  subscribePreparedReferenceAudio,
} from '../audio/preparedReferenceStore'
import { renderVirtualFm1PreviewWav, type VirtualFm1PreviewWavResult } from '../audio/virtualFm1WavRenderer'

interface VirtualFm1PreviewExtrasProps {
  readonly voice: Dx7Voice
  readonly fxState: Fm1FxState
  readonly fxEnabled: boolean
  readonly masterGainDb: number
}

interface ActivePlayback {
  readonly context: AudioContext
  readonly source: AudioBufferSourceNode
}

function normalizedVoiceName(name: string): string {
  const compact = name.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return compact || 'virtual-fm1'
}

function rootMidiNote(referencePitchHz: number | null | undefined): number {
  if (!referencePitchHz) return 60
  const note = frequencyToMidiNote(referencePitchHz)
  return note === null ? 60 : Math.max(0, Math.min(120, note))
}

function copyChannelsToAudioBuffer(context: AudioContext, channels: readonly Float32Array[], sampleRate: number): AudioBuffer {
  const frameCount = channels[0]?.length ?? 0
  if (frameCount <= 0 || channels.some((channel) => channel.length !== frameCount)) {
    throw new Error('Preview playback requires equal, non-empty PCM channels.')
  }
  const buffer = context.createBuffer(channels.length, frameCount, sampleRate)
  channels.forEach((channel, index) => buffer.copyToChannel(Float32Array.from(channel), index))
  return buffer
}

export function VirtualFm1PreviewExtras({ voice, fxState, fxEnabled, masterGainDb }: VirtualFm1PreviewExtrasProps) {
  const reference = useSyncExternalStore(
    subscribePreparedReferenceAudio,
    getPreparedReferenceAudioSnapshot,
    () => null,
  )
  const playbackRef = useRef<ActivePlayback | null>(null)
  const [rendering, setRendering] = useState<'note' | 'chord' | 'preview' | null>(null)
  const [playing, setPlaying] = useState<'reference' | 'preview' | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stopPlayback = useCallback(() => {
    const playback = playbackRef.current
    playbackRef.current = null
    if (playback) {
      try { playback.source.stop() } catch { /* already stopped */ }
      void playback.context.close().catch(() => undefined)
    }
    setPlaying(null)
  }, [])

  useEffect(() => () => stopPlayback(), [stopPlayback])

  const startPlayback = useCallback(async (
    context: AudioContext,
    resumePromise: Promise<void>,
    channels: readonly Float32Array[],
    sampleRate: number,
    kind: 'reference' | 'preview',
  ) => {
    const buffer = copyChannelsToAudioBuffer(context, channels, sampleRate)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.onended = () => {
      if (playbackRef.current?.source !== source) return
      playbackRef.current = null
      setPlaying(null)
      void context.close().catch(() => undefined)
    }
    await resumePromise
    playbackRef.current = { context, source }
    source.start()
    setPlaying(kind)
  }, [])

  const playReference = useCallback(async () => {
    if (!reference) return
    stopPlayback()
    setError(null)
    const context = new AudioContext({ latencyHint: 'interactive' })
    const resumePromise = context.resume()
    try {
      await startPlayback(context, resumePromise, [reference.samples], reference.sampleRate, 'reference')
      setStatus(`Reference A · ${reference.analysisPitchHz?.toFixed(2) ?? 'unresolved'} Hz · local prepared PCM`)
    } catch (cause) {
      void context.close().catch(() => undefined)
      setError(cause instanceof Error ? cause.message : 'Reference A playback failed.')
    }
  }, [reference, startPlayback, stopPlayback])

  const render = useCallback(async (kind: 'note' | 'chord' | 'preview'): Promise<VirtualFm1PreviewWavResult> => {
    const root = rootMidiNote(reference?.analysisPitchHz)
    const midiNotes = kind === 'chord' ? [root, root + 4, root + 7].map((note) => Math.min(127, note)) : [root]
    return renderVirtualFm1PreviewWav({
      voice,
      midiNotes,
      velocity: 105,
      sampleRate: 48_000,
      noteOnSeconds: kind === 'chord' ? 2 : 1.5,
      releaseSeconds: 1.5,
      randomSeed: 42,
      fxState,
      fxEnabled,
      masterGainDb,
      fxTailSeconds: fxEnabled ? 6 : 0.2,
    })
  }, [fxEnabled, fxState, masterGainDb, reference?.analysisPitchHz, voice])

  const previewCurrent = useCallback(async () => {
    stopPlayback()
    setError(null)
    setRendering('preview')
    const context = new AudioContext({ latencyHint: 'interactive' })
    const resumePromise = context.resume()
    try {
      const result = await render('preview')
      await startPlayback(context, resumePromise, result.channels, result.sampleRate, 'preview')
      setStatus(`Current B · ${fxEnabled ? 'FM-1-inspired FX' : 'dry'} · ${masterGainDb} dB`)
    } catch (cause) {
      void context.close().catch(() => undefined)
      setError(cause instanceof Error ? cause.message : 'Current B preview rendering failed.')
    } finally {
      setRendering(null)
    }
  }, [fxEnabled, masterGainDb, render, startPlayback, stopPlayback])

  const download = useCallback(async (kind: 'note' | 'chord') => {
    setError(null)
    setRendering(kind)
    try {
      const result = await render(kind)
      const blob = new Blob([result.wav as Uint8Array<ArrayBuffer>], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${normalizedVoiceName(voice.name)}-${kind}-${fxEnabled ? 'fx' : 'dry'}.wav`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setStatus(`${kind === 'note' ? 'Note' : 'Chord'} WAV rendered locally · ${result.channels.length} channel${result.channels.length === 1 ? '' : 's'}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Virtual FM-1 WAV rendering failed.')
    } finally {
      setRendering(null)
    }
  }, [fxEnabled, render, voice.name])

  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4" aria-label="Virtual FM-1 A/B and WAV rendering">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Reference A/B · offline render</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Compare the prepared local reference with the current semantic voice and render deterministic note/chord WAVs through the same {fxEnabled ? 'FM-1-inspired FX/master/limiter' : 'dry master/limiter'} path. No hardware or upload is used.
          </p>
        </div>
        <span className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
          {reference ? `A ${reference.analysisPitchHz?.toFixed(1) ?? 'pitch ?'} Hz` : 'No reference A'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-40" disabled={!reference || rendering !== null} onClick={() => playing === 'reference' ? stopPlayback() : void playReference()} type="button">
          {playing === 'reference' ? '■ Stop reference A' : '▶ Play reference A'}
        </button>
        <button className="rounded-xl border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-40" disabled={rendering !== null} onClick={() => playing === 'preview' ? stopPlayback() : void previewCurrent()} type="button">
          {playing === 'preview' ? '■ Stop current B' : rendering === 'preview' ? 'Rendering B…' : '▶ Preview current B'}
        </button>
        <button className="rounded-xl bg-violet-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40" disabled={rendering !== null} onClick={() => void download('note')} type="button">
          {rendering === 'note' ? 'Rendering note…' : 'Download note WAV'}
        </button>
        <button className="rounded-xl bg-violet-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40" disabled={rendering !== null} onClick={() => void download('chord')} type="button">
          {rendering === 'chord' ? 'Rendering chord…' : 'Download chord WAV'}
        </button>
      </div>
      {status && <p className="mt-3 text-xs text-emerald-200">{status}</p>}
      {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}
    </section>
  )
}
