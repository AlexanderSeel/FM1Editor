import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import type { Fm1FxState } from '../domain/fx'
import { createDx7VoiceSemanticDiff, createDx7VoiceSyxArtifact } from '../audio/dx7CandidateArtifacts'
import { createDx7CandidateFxAttachment, type Dx7CandidateFxAttachment } from '../audio/dx7CandidateFxState'
import {
  createAudioDescriptorProfile,
} from '../audio/audioDescriptors'
import {
  createAudioDescriptorFingerprint,
  type AudioDescriptorFingerprint,
} from '../audio/audioDescriptorFingerprint'
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
import {
  refineRetrievedDx7Candidates,
  type Dx7RetrievedRefinementResult,
} from '../audio/dx7CmaEsRefinement'
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
const REFINEMENT_STARTS = 3
const REFINEMENT_SEED = 2026

type SearchScope = 'quick' | 'full'
type SearchPhase = 'idle' | 'catalog' | 'indexing' | 'refining' | 'ready' | 'cancelled' | 'error'

interface NearestPresetPanelProps {
  reference: PreparedReferenceAudio | null
  fxState?: Fm1FxState
  onAuditionVoice: (voice: Dx7Voice | Promise<Dx7Voice>) => Promise<void>
  onStopAudition: () => Promise<void>
  onLoadVoice: (voice: Dx7Voice) => void
  onLoadVoiceWithFx?: (voice: Dx7Voice, fxState: Fm1FxState) => void
}

interface SearchProgress {
  completed: number
  total: number
  current: string
}

interface RefinementProgress {
  startIndex: number
  startCount: number
  generation: number
  evaluations: number
  bestDistance: number
  sourceName: string
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

function downloadVoiceSyx(voice: Dx7Voice): void {
  const artifact = createDx7VoiceSyxArtifact(voice)
  const blob = new Blob([artifact.bytes as Uint8Array<ArrayBuffer>], { type: artifact.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = artifact.filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function NearestPresetPanel({
  reference,
  fxState,
  onAuditionVoice,
  onStopAudition,
  onLoadVoice,
  onLoadVoiceWithFx,
}: NearestPresetPanelProps) {
  const [scope, setScope] = useState<SearchScope>('quick')
  const [phase, setPhase] = useState<SearchPhase>('idle')
  const [progress, setProgress] = useState<SearchProgress>({ completed: 0, total: 0, current: '' })
  const [cacheHits, setCacheHits] = useState(0)
  const [candidateCount, setCandidateCount] = useState(0)
  const [results, setResults] = useState<readonly CompactPresetRankedCandidate[]>([])
  const [referenceFingerprint, setReferenceFingerprint] = useState<AudioDescriptorFingerprint | null>(null)
  const [refinementResults, setRefinementResults] = useState<readonly Dx7RetrievedRefinementResult[]>([])
  const [refinementProgress, setRefinementProgress] = useState<RefinementProgress | null>(null)
  const [candidateFxById, setCandidateFxById] = useState<Readonly<Record<string, Dx7CandidateFxAttachment>>>({})
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
    setReferenceFingerprint(null)
    setRefinementResults([])
    setRefinementProgress(null)
    setCandidateFxById({})
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

  const auditionRefinedVoice = useCallback(async (voice: Dx7Voice) => {
    stopReferencePlayback()
    setError(null)
    try {
      await onAuditionVoice(voice)
    } catch (cause) {
      setError(`Refined candidate audition failed: ${errorMessage(cause)}`)
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
    setReferenceFingerprint(null)
    setRefinementResults([])
    setRefinementProgress(null)
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
      const nextReferenceFingerprint = createAudioDescriptorFingerprint(
        createAudioDescriptorProfile(referenceSamples, INDEX_SAMPLE_RATE, COMPACT_PRESET_DESCRIPTOR_CONFIG),
      )
      setReferenceFingerprint(nextReferenceFingerprint)
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
      const ranked = rankCompactPresetDescriptorIndex(nextReferenceFingerprint, index, {
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

  const refineTopCandidates = useCallback(async () => {
    if (!referenceFingerprint || results.length === 0) return
    cancelSearch()
    stopReferencePlayback()
    void onStopAudition().catch(() => undefined)
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal
    setPhase('refining')
    setRefinementResults([])
    setRefinementProgress(null)
    setError(null)
    setStatus('Refining top retrieved voices · operator output levels + feedback only…')

    try {
      const refined = await refineRetrievedDx7Candidates(results, referenceFingerprint, createMsfaOfflineEngine(), {
        startCount: Math.min(REFINEMENT_STARTS, results.length),
        groups: ['output-feedback'],
        seed: REFINEMENT_SEED,
        descriptorConfig: COMPACT_PRESET_DESCRIPTOR_CONFIG,
        fingerprintCache: createFingerprintCache(),
        signal,
        cmaEs: {
          populationSize: 8,
          maxGenerations: 8,
          sigma: 0.2,
          targetScore: 0,
        },
        onProgress: (item) => {
          setRefinementProgress({
            startIndex: item.startIndex,
            startCount: item.startCount,
            generation: item.generation,
            evaluations: item.evaluations,
            bestDistance: item.bestDistance,
            sourceName: item.sourceCandidate.voice.name || item.sourceCandidate.sourceLabel,
          })
        },
      })
      setRefinementResults(refined)
      setStatus(`Refined ${refined.length} retrieved start${refined.length === 1 ? '' : 's'} · seed ${REFINEMENT_SEED} · output/feedback only`)
      setPhase('ready')
      abortRef.current = null
    } catch (cause) {
      abortRef.current = null
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        setPhase('cancelled')
        setStatus('CMA-ES refinement cancelled. Retrieval results and cached fingerprints remain available.')
        return
      }
      setPhase('error')
      setStatus(null)
      setError(errorMessage(cause))
    }
  }, [cancelSearch, onStopAudition, referenceFingerprint, results, stopReferencePlayback])

  const searchWorking = phase === 'catalog' || phase === 'indexing'
  const refinementWorking = phase === 'refining'
  const working = searchWorking || refinementWorking
  const progressPercent = progress.total > 0 ? Math.round(progress.completed * 100 / progress.total) : 0

  return (
    <section className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4" aria-label="Nearest preset reconstruction">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Nearest preset · local retrieval</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Render checksum-valid bundled DX7 voices through the deterministic local engine and rank compact fingerprints against the prepared reference. After retrieval, an explicit constrained CMA-ES step can refine operator output levels and feedback only. Nothing is uploaded, loaded into the editor, or sent to hardware automatically.
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
        {!working && results.length > 0 && referenceFingerprint && (
          <button
            className="rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-black text-slate-950"
            onClick={() => void refineTopCandidates()}
            type="button"
          >
            Refine top {Math.min(REFINEMENT_STARTS, results.length)} · output + feedback
          </button>
        )}
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

      {searchWorking && (
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

      {refinementWorking && refinementProgress && (
        <div className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/[0.035] p-3" aria-label="CMA-ES refinement progress">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Start {refinementProgress.startIndex + 1}/{refinementProgress.startCount} · {refinementProgress.sourceName}</span>
            <span>generation {refinementProgress.generation} · {refinementProgress.evaluations} evals</span>
          </div>
          <p className="mt-2 text-[11px] text-amber-100">Best fingerprint distance {refinementProgress.bestDistance.toFixed(5)}</p>
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

      {refinementResults.length > 0 && (
        <div className="mt-5 grid gap-3" aria-label="CMA-ES refined candidates">
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.12em] text-amber-100">CMA-ES refined candidates</h4>
            <p className="mt-1 text-[11px] text-slate-500">Seed {REFINEMENT_SEED} · six operator output levels + feedback only · each result starts from a ranked catalog voice.</p>
          </div>
          {refinementResults.map((item, index) => (
            <article className="rounded-xl border border-amber-200/15 bg-amber-200/[0.025] p-3" data-best-distance={item.bestDistance} data-initial-distance={item.initialDistance} key={`${item.sourceCandidate.id}:refined`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">#{index + 1} refined · {item.improvement > 0 ? `improved ${item.improvement.toFixed(5)}` : 'no improvement'}</p>
                  <h5 className="mt-1 text-base font-black text-white">{item.bestVoice.name || 'UNTITLED'}</h5>
                  <p className="mt-1 break-words text-[11px] text-slate-500">Start: {item.sourceCandidate.sourceLabel}</p>
                  <p className="mt-1 text-[10px] text-slate-600">distance {item.initialDistance.toFixed(5)} → {item.bestDistance.toFixed(5)} · {item.optimizer.generationsCompleted} generations · {item.optimizer.evaluations} evaluations</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg border border-amber-200/30 px-3 py-2 text-xs font-bold text-amber-100" onClick={() => void auditionRefinedVoice(item.bestVoice)} type="button">
                    ▶ Audition refined
                  </button>
                  <button className="rounded-lg border border-violet-300/30 px-3 py-2 text-xs font-bold text-violet-100" onClick={() => downloadVoiceSyx(item.bestVoice)} type="button">
                    Export refined .syx
                  </button>
                  <button className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-40" disabled={!fxState} onClick={() => { if (fxState) setCandidateFxById((current) => ({ ...current, [item.sourceCandidate.id]: createDx7CandidateFxAttachment(fxState) })) }} type="button">{candidateFxById[item.sourceCandidate.id] ? 'Refresh attached FX' : 'Attach current FX'}</button>
                  {candidateFxById[item.sourceCandidate.id] && onLoadVoiceWithFx && <button className="rounded-lg bg-cyan-200 px-3 py-2 text-xs font-black text-slate-950" onClick={() => { const attachment=candidateFxById[item.sourceCandidate.id]; if (attachment) onLoadVoiceWithFx(item.bestVoice, attachment.state) }} type="button">Load refined + FX</button>}
                  <button className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950" onClick={() => onLoadVoice(item.bestVoice)} type="button">
                    Load refined
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-slate-500 sm:grid-cols-6">
                <span>ENV {metric(item.bestMetrics.envelope)}</span>
                <span>MEL {metric(item.bestMetrics.mel)}</span>
                <span>MFCC {metric(item.bestMetrics.mfcc)}</span>
                <span>CENT {metric(item.bestMetrics.centroid)}</span>
                <span>ROLL {metric(item.bestMetrics.rolloff)}</span>
                <span>FLAT {metric(item.bestMetrics.flatness)}</span>
              </div>
              {candidateFxById[item.sourceCandidate.id] && <p className="mt-3 text-[10px] text-cyan-200" data-candidate-fx-attached="true">Attached FM-1-inspired FX snapshot · channel {candidateFxById[item.sourceCandidate.id]?.state.midiChannel} · {candidateFxById[item.sourceCandidate.id]?.nonZeroControls} non-zero controls · local metadata only</p>}
              <div className="mt-3 rounded-lg border border-white/8 bg-black/15 p-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Semantic changes from retrieved start</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {createDx7VoiceSemanticDiff(item.sourceCandidate.voice, item.bestVoice).map((difference) => (
                    <span className="rounded-md border border-white/8 px-2 py-1 font-mono text-[10px] text-slate-300" key={difference.path}>
                      {difference.label}: {String(difference.before)} → {String(difference.after)}
                    </span>
                  ))}
                  {createDx7VoiceSemanticDiff(item.sourceCandidate.voice, item.bestVoice).length === 0 && <span className="text-[10px] text-slate-500">No semantic parameter changed.</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
