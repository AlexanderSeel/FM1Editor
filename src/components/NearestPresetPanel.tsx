import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import {
  createAudioDescriptorProfile,
} from '../audio/audioDescriptors'
import { createAudioDescriptorFingerprint } from '../audio/audioDescriptorFingerprint'
import {
  buildCompactPresetDescriptorIndex,
  COMPACT_PRESET_DESCRIPTOR_CONFIG,
  COMPACT_PRESET_INDEX_SCHEMA,
  COMPACT_PRESET_PROBES,
  rankCompactPresetDescriptorIndex,
  type CompactPresetDescriptorIndex,
  type CompactPresetIndexEntry,
  type CompactPresetRankedCandidate,
} from '../audio/compactPresetIndex'
import { loadBundledCatalogPresetCandidates } from '../audio/catalogPresetCandidates'
import { createMsfaOfflineEngine } from '../audio/msfaOfflineEngine'
import { frequencyToMidiNote, type PresetRenderProbe } from '../audio/nearestPreset'
import {
  createIndexedDbPresetFingerprintCache,
  createMemoryPresetFingerprintCache,
  type PresetFingerprintCache,
} from '../audio/presetFingerprintCache'
import type { PreparedReferenceAudio } from '../audio/referenceAudio'

const QUICK_SCAN_VOICES = 256
const INDEX_SAMPLE_RATE = 48_000 as const
const INDEX_CHUNK_SIZE = 16

type SearchScope = 'quick' | 'full'
type SearchPhase = 'idle' | 'catalog' | 'indexing' | 'ready' | 'cancelled' | 'error'

interface NearestPresetPanelProps {
  reference: PreparedReferenceAudio | null
  onAuditionVoice: (voice: Dx7Voice | Promise<Dx7Voice>) => Promise<void>
  onStopAudition: () => Promise<void>
  onLoadVoice: (voice: Dx7Voice) => void
}

interface SearchProgress {
  completed: number
  total: number
  current: string
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function nextPaint(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException('Preset search was cancelled.', 'AbortError'))
  return new Promise((resolve, reject) => {
    const finish = () => signal.aborted
      ? reject(new DOMException('Preset search was cancelled.', 'AbortError'))
      : resolve()
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => finish())
    else setTimeout(finish, 0)
  })
}

function resampleMonoLinear(samples: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (!Number.isFinite(sourceRate) || sourceRate <= 0 || !Number.isFinite(targetRate) || targetRate <= 0) {
    throw new RangeError('Preset matching requires valid source and target sample rates.')
  }
  if (sourceRate === targetRate) return samples.slice()
  const targetLength = Math.max(1, Math.round(samples.length * targetRate / sourceRate))
  const output = new Float32Array(targetLength)
  if (samples.length === 1) {
    output.fill(samples[0] ?? 0)
    return output
  }
  for (let index = 0; index < targetLength; index += 1) {
    const sourcePosition = targetLength === 1 ? 0 : index * (samples.length - 1) / (targetLength - 1)
    const left = Math.floor(sourcePosition)
    const right = Math.min(samples.length - 1, left + 1)
    const fraction = sourcePosition - left
    output[index] = (samples[left] ?? 0) * (1 - fraction) + (samples[right] ?? 0) * fraction
  }
  return output
}

function probeForReference(reference: PreparedReferenceAudio): PresetRenderProbe {
  const fallback = COMPACT_PRESET_PROBES.find((probe) => probe.id === 'c4-main') ?? COMPACT_PRESET_PROBES[0]
  if (!fallback) throw new Error('No standardized preset probes are configured.')
  const pitch = reference.analysisPitchHz
  if (!pitch || !Number.isFinite(pitch) || pitch <= 0) return fallback
  const midiNote = frequencyToMidiNote(pitch)
  if (midiNote === null) return fallback
  return [...COMPACT_PRESET_PROBES].sort(
    (left, right) => Math.abs(left.midiNote - midiNote) - Math.abs(right.midiNote - midiNote),
  )[0] ?? fallback
}

function scorePercent(candidate: CompactPresetRankedCandidate): string {
  return `${Math.max(0, Math.min(100, candidate.score * 100)).toFixed(1)}%`
}

function metric(value: number): string {
  return Number.isFinite(value) ? value.toFixed(4) : '—'
}

function createFingerprintCache(): PresetFingerprintCache {
  return typeof indexedDB === 'undefined'
    ? createMemoryPresetFingerprintCache()
    : createIndexedDbPresetFingerprintCache()
}

export function NearestPresetPanel({
  reference,
  onAuditionVoice,
  onStopAudition,
  onLoadVoice,
}: NearestPresetPanelProps) {
  const [scope, setScope] = useState<SearchScope>('quick')
  const [phase, setPhase] = useState<SearchPhase>('idle')
  const [progress, setProgress] = useState<SearchProgress>({ completed: 0, total: 0, current: '' })
  const [cacheHits, setCacheHits] = useState(0)
  const [candidateCount, setCandidateCount] = useState(0)
  const [results, setResults] = useState<readonly CompactPresetRankedCandidate[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [referencePlaying, setReferencePlaying] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const referencePlaybackRef = useRef<{ context: AudioContext; source: AudioBufferSourceNode } | null>(null)

  const stopReferencePlayback = useCallback(() => {
    const playback = referencePlaybackRef.current
    referencePlaybackRef.current = null
    if (playback) {
      try { playback.source.stop() } catch { /* source may already be ended */ }
      void playback.context.close().catch(() => undefined)
    }
    setReferencePlaying(false)
  }, [])

  const cancelSearch = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => {
    cancelSearch()
    setResults([])
    setCandidateCount(0)
    setCacheHits(0)
    setProgress({ completed: 0, total: 0, current: '' })
    setStatus(null)
    setError(null)
    setPhase('idle')
  }, [cancelSearch, reference])

  useEffect(() => () => {
    abortRef.current?.abort()
    stopReferencePlayback()
  }, [stopReferencePlayback])

  const playReference = useCallback(async () => {
    if (!reference) return
    stopReferencePlayback()
    const context = new AudioContext()
    const resumePromise = context.resume()
    void onStopAudition().catch(() => undefined)
    try {
      const buffer = context.createBuffer(1, reference.samples.length, reference.sampleRate)
      buffer.copyToChannel(Float32Array.from(reference.samples), 0)
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      referencePlaybackRef.current = { context, source }
      source.onended = () => {
        if (referencePlaybackRef.current?.source !== source) return
        referencePlaybackRef.current = null
        setReferencePlaying(false)
        void context.close().catch(() => undefined)
      }
      await resumePromise
      source.start()
      setReferencePlaying(true)
    } catch (cause) {
      void context.close().catch(() => undefined)
      referencePlaybackRef.current = null
      setReferencePlaying(false)
      setError(`Reference A playback failed: ${errorMessage(cause)}`)
    }
  }, [onStopAudition, reference, stopReferencePlayback])

  const auditionCandidate = useCallback(async (candidate: CompactPresetRankedCandidate) => {
    stopReferencePlayback()
    setError(null)
    try {
      await onAuditionVoice(candidate.voice)
    } catch (cause) {
      setError(`Candidate B audition failed: ${errorMessage(cause)}`)
    }
  }, [onAuditionVoice, stopReferencePlayback])

  const search = useCallback(async () => {
    if (!reference) return
    cancelSearch()
    stopReferencePlayback()
    void onStopAudition().catch(() => undefined)
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal
    setPhase('catalog')
    setResults([])
    setCacheHits(0)
    setCandidateCount(0)
    setError(null)
    setStatus('Reading checksum-valid bundled DX7 catalog voices…')
    setProgress({ completed: 0, total: 0, current: '' })

    try {
      const catalogCandidates = await loadBundledCatalogPresetCandidates({
        ...(scope === 'quick' ? { maxVoices: QUICK_SCAN_VOICES } : {}),
        signal,
        onProgress: (entryProgress) => {
          setCandidateCount(entryProgress.voicesFound)
          setStatus(`Reading ${entryProgress.currentEntry} · ${entryProgress.voicesFound} voices found`)
        },
      })
      if (catalogCandidates.length === 0) throw new Error('No checksum-valid bundled DX7 voices were available for matching.')
      if (signal.aborted) throw new DOMException('Preset search was cancelled.', 'AbortError')

      const probe = probeForReference(reference)
      const referenceSamples = resampleMonoLinear(reference.samples, reference.sampleRate, INDEX_SAMPLE_RATE)
      const referenceFingerprint = createAudioDescriptorFingerprint(
        createAudioDescriptorProfile(referenceSamples, INDEX_SAMPLE_RATE, COMPACT_PRESET_DESCRIPTOR_CONFIG),
      )
      const engine = createMsfaOfflineEngine()
      const fingerprintCache = createFingerprintCache()
      const entries: CompactPresetIndexEntry[] = []
      let hitCount = 0
      setPhase('indexing')
      setCandidateCount(catalogCandidates.length)
      setProgress({ completed: 0, total: catalogCandidates.length, current: '' })
      setStatus(`Matching ${catalogCandidates.length} voices at ${probe.id}…`)

      for (let start = 0; start < catalogCandidates.length; start += INDEX_CHUNK_SIZE) {
        if (signal.aborted) throw new DOMException('Preset search was cancelled.', 'AbortError')
        const chunk = catalogCandidates.slice(start, start + INDEX_CHUNK_SIZE)
        const chunkIndex = await buildCompactPresetDescriptorIndex(chunk, engine, {
          sampleRate: INDEX_SAMPLE_RATE,
          probes: [probe],
          descriptorConfig: COMPACT_PRESET_DESCRIPTOR_CONFIG,
          fingerprintCache,
          signal,
          onCacheHit: () => {
            hitCount += 1
            setCacheHits(hitCount)
          },
          onProgress: (completed, _total, candidate) => {
            setProgress({
              completed: Math.min(catalogCandidates.length, start + completed),
              total: catalogCandidates.length,
              current: candidate.voice.name || candidate.sourceLabel,
            })
          },
        })
        entries.push(...chunkIndex.entries)
        await nextPaint(signal)
      }

      const index: CompactPresetDescriptorIndex = {
        schema: COMPACT_PRESET_INDEX_SCHEMA,
        engineId: engine.engineId,
        engineVersion: engine.engineVersion,
        sampleRate: INDEX_SAMPLE_RATE,
        descriptorConfig: { ...COMPACT_PRESET_DESCRIPTOR_CONFIG, fftSizes: [...COMPACT_PRESET_DESCRIPTOR_CONFIG.fftSizes] },
        probes: [{ ...probe }],
        entries,
      }
      const ranked = rankCompactPresetDescriptorIndex(referenceFingerprint, index, {
        limit: 8,
        referencePitchHz: reference.analysisPitchHz,
      })
      setResults(ranked)
      setProgress({ completed: catalogCandidates.length, total: catalogCandidates.length, current: '' })
      setStatus(`Ranked ${catalogCandidates.length} local voices · ${hitCount} fingerprint cache hits`)
      setPhase('ready')
      abortRef.current = null
    } catch (cause) {
      abortRef.current = null
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        setPhase('cancelled')
        setStatus('Nearest-preset search cancelled. Cached fingerprints remain local for the next run.')
        return
      }
      setPhase('error')
      setStatus(null)
      setError(errorMessage(cause))
    }
  }, [cancelSearch, onStopAudition, reference, scope, stopReferencePlayback])

  const working = phase === 'catalog' || phase === 'indexing'
  const progressPercent = progress.total > 0 ? Math.round(progress.completed * 100 / progress.total) : 0

  return (
    <section className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4" aria-label="Nearest preset reconstruction">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Nearest preset · local retrieval</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Render checksum-valid bundled DX7 voices through the deterministic local engine and rank compact fingerprints against the prepared reference. Nothing is uploaded, loaded into the editor, or sent to hardware automatically.
          </p>
        </div>
        <span className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
          {reference ? 'REFERENCE READY' : 'ADD REFERENCE FIRST'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-slate-400">
          Catalog scope
          <select
            className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            disabled={working}
            onChange={(event) => setScope(event.target.value as SearchScope)}
            value={scope}
          >
            <option value="quick">Quick scan · first {QUICK_SCAN_VOICES} bundled voices</option>
            <option value="full">Full local bundled catalog</option>
          </select>
        </label>
        <button
          className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!reference || working}
          onClick={() => void search()}
          type="button"
        >
          {phase === 'ready' ? 'Search again' : 'Build / search local index'}
        </button>
        {working && (
          <button className="rounded-xl border border-rose-300/30 px-4 py-2.5 text-sm font-bold text-rose-200" onClick={cancelSearch} type="button">
            Cancel
          </button>
        )}
        <button
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-200 disabled:opacity-40"
          disabled={!reference}
          onClick={() => referencePlaying ? stopReferencePlayback() : void playReference()}
          type="button"
        >
          {referencePlaying ? 'Stop reference A' : '▶ Play reference A'}
        </button>
      </div>

      {working && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
            <span>{phase === 'catalog' ? 'Reading local catalog' : `Indexing ${progress.completed}/${progress.total}`}</span>
            <span>{phase === 'indexing' ? `${progressPercent}% · ${cacheHits} cache hits` : `${candidateCount} voices`}</span>
          </div>
          {phase === 'indexing' && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full bg-cyan-300 transition-[width]" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
          {progress.current && <p className="mt-2 truncate text-[11px] text-slate-500">{progress.current}</p>}
        </div>
      )}

      {status && <p className="mt-3 text-xs text-emerald-200">{status}</p>}
      {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}

      {results.length > 0 && (
        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-black uppercase tracking-[0.12em] text-slate-100">Ranked candidates</h4>
            <p className="text-[11px] text-slate-500">A = prepared reference · B = dry DX7-compatible local audition</p>
          </div>
          {results.map((candidate, index) => (
            <article className="rounded-xl border border-white/10 bg-black/20 p-3" key={candidate.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300">#{index + 1} · {scorePercent(candidate)} similarity</p>
                  <h5 className="mt-1 text-base font-black text-white">{candidate.voice.name || 'UNTITLED'}</h5>
                  <p className="mt-1 break-words text-[11px] text-slate-500">{candidate.sourceLabel}</p>
                  <p className="mt-1 text-[10px] text-slate-600">Probe {candidate.matchedProbe.id} · MIDI {candidate.matchedProbe.midiNote} · velocity {candidate.matchedProbe.velocity}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100" onClick={() => void auditionCandidate(candidate)} type="button">
                    ▶ Audition B
                  </button>
                  <button className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950" onClick={() => onLoadVoice(candidate.voice)} type="button">
                    Load into editor
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-slate-500 sm:grid-cols-6">
                <span>ENV {metric(candidate.metrics.envelope)}</span>
                <span>MEL {metric(candidate.metrics.mel)}</span>
                <span>MFCC {metric(candidate.metrics.mfcc)}</span>
                <span>CENT {metric(candidate.metrics.centroid)}</span>
                <span>ROLL {metric(candidate.metrics.rolloff)}</span>
                <span>FLAT {metric(candidate.metrics.flatness)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
