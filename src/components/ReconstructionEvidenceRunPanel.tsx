import { useEffect, useMemo, useRef, useState } from 'react'
import { strToU8, zipSync } from 'fflate'
import type { Dx7Voice } from '../domain/voice'
import { createDx7VoiceSyxArtifact } from '../audio/dx7CandidateArtifacts'
import {
  createRealReferenceAggregateEvidenceMarkdown,
  serializeRealReferenceBenchmarkAggregate,
  sha256Utf8,
} from '../audio/realReferenceAggregateEvidenceDocument'
import {
  aggregateRealReferenceBenchmarkEvidence,
  type RealReferenceBenchmarkAggregate,
  type RealReferenceEvidenceCategory,
  type RealReferenceLearnedListeningAssessment,
  type RealReferenceListeningAssessment,
} from '../audio/realReferenceBenchmarkAggregate'
import {
  REAL_REFERENCE_BENCHMARK_DEFAULT_MAX_VOICES,
  runRealReferenceReconstructionBenchmark,
  type RealReferenceBenchmarkProgress,
  type RealReferenceReconstructionBenchmarkReport,
} from '../audio/realReferenceReconstructionBenchmark'
import { loadBundledCatalogPresetCandidates } from '../audio/catalogPresetCandidates'
import { createMsfaOfflineEngine } from '../audio/msfaOfflineEngine'
import {
  createIndexedDbPresetFingerprintCache,
  createMemoryPresetFingerprintCache,
} from '../audio/presetFingerprintCache'
import {
  prepareReferenceAudioFile,
  REFERENCE_AUDIO_MAX_DURATION_SECONDS,
  type PreparedReferenceAudio,
} from '../audio/referenceAudio'

type BenchmarkScope = 'quick' | 'full'

interface CategoryDefinition {
  readonly id: RealReferenceEvidenceCategory
  readonly label: string
  readonly shortLabel: string
}

const CATEGORIES: readonly CategoryDefinition[] = [
  { id: 'fm-friendly-electronic', label: 'FM-friendly electronic / sustained', shortLabel: 'Electronic' },
  { id: 'pitched-acoustic', label: 'Pitched acoustic / instrument', shortLabel: 'Acoustic' },
  { id: 'difficult-transient-noisy', label: 'Difficult transient / noisy / nonlinear', shortLabel: 'Difficult' },
]

const LISTENING_OPTIONS: readonly { value: RealReferenceListeningAssessment; label: string }[] = [
  { value: 'not-assessed', label: 'Not listened yet' },
  { value: 'cma-better', label: 'CMA candidate sounds better' },
  { value: 'retrieval-better', label: 'Retrieved candidate sounds better' },
  { value: 'similar', label: 'Retrieval and CMA are perceptually similar' },
  { value: 'both-poor', label: 'Retrieval and CMA are both poor matches' },
]

const LEARNED_OPTIONS: readonly { value: Exclude<RealReferenceLearnedListeningAssessment, 'unavailable'>; label: string }[] = [
  { value: 'not-assessed', label: 'Not listened yet' },
  { value: 'learned-better', label: 'Learned candidate sounds best' },
  { value: 'learned-similar', label: 'Learned is perceptually similar to the best local alternative' },
  { value: 'learned-worse', label: 'Learned is clearly worse than the best local alternative' },
  { value: 'learned-poor', label: 'Learned is poor / out of scope' },
]

interface EvidenceRunResult {
  readonly id: string
  readonly category: RealReferenceEvidenceCategory
  readonly reference: PreparedReferenceAudio
  readonly report: RealReferenceReconstructionBenchmarkReport
  readonly receiptFilename: string
  readonly receiptText: string
  readonly receiptSha256: string
  readonly listeningAssessment: RealReferenceListeningAssessment
  readonly learnedListeningAssessment: RealReferenceLearnedListeningAssessment
  readonly notes: string
}

interface ReconstructionEvidenceRunPanelProps {
  onAuditionVoice?: (voice: Dx7Voice | Promise<Dx7Voice>) => Promise<void>
  onStopAudition?: () => Promise<void>
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function safeStem(value: string): string {
  return value.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'reference'
}

function receiptFilename(report: RealReferenceReconstructionBenchmarkReport): string {
  return `${safeStem(report.reference.filename)}-reconstruction-benchmark-${report.reference.contentSha256.slice(0, 12)}.json`
}

function downloadBlob(filename: string, bytes: BlobPart, type: string): void {
  const blob = new Blob([bytes], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function downloadText(filename: string, value: string, type: string): void {
  downloadBlob(filename, value, type)
}

function downloadWinnerSyx(voice: Dx7Voice): void {
  const artifact = createDx7VoiceSyxArtifact(voice)
  downloadBlob(artifact.filename, artifact.bytes as Uint8Array<ArrayBuffer>, artifact.mimeType)
}

function aggregateStem(aggregate: RealReferenceBenchmarkAggregate): string {
  return `fm1-real-reference-benchmark-aggregate-${aggregate.createdAt.replace(/[:.]/g, '-')}`
}

function pitchKey(category: RealReferenceEvidenceCategory, index: number): string {
  return `${category}:${index}`
}

function categoryLabel(category: RealReferenceEvidenceCategory): string {
  return CATEGORIES.find((entry) => entry.id === category)?.shortLabel ?? category
}

export function ReconstructionEvidenceRunPanel({ onAuditionVoice, onStopAudition }: ReconstructionEvidenceRunPanelProps = {}) {
  const [scope, setScope] = useState<BenchmarkScope>('full')
  const [declaredIsolated, setDeclaredIsolated] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Record<RealReferenceEvidenceCategory, readonly File[]>>({
    'fm-friendly-electronic': [],
    'pitched-acoustic': [],
    'difficult-transient-noisy': [],
  })
  const [manualPitches, setManualPitches] = useState<Record<string, string>>({})
  const [results, setResults] = useState<readonly EvidenceRunResult[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ readonly caseIndex: number; readonly benchmark: RealReferenceBenchmarkProgress | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playingReferenceId, setPlayingReferenceId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const referencePlaybackRef = useRef<{ context: AudioContext; source: AudioBufferSourceNode } | null>(null)

  const selectedCount = useMemo(() => CATEGORIES.reduce((sum, category) => sum + selectedFiles[category.id].length, 0), [selectedFiles])
  const readyToRun = selectedCount === 6 && CATEGORIES.every((category) => selectedFiles[category.id].length === 2) && declaredIsolated && !running

  const aggregateState = useMemo(() => {
    if (results.length === 0) return { aggregate: null as RealReferenceBenchmarkAggregate | null, error: null as string | null }
    try {
      return {
        aggregate: aggregateRealReferenceBenchmarkEvidence(results.map((item) => ({
          report: item.report,
          category: item.category,
          listeningAssessment: item.listeningAssessment,
          learnedListeningAssessment: item.learnedListeningAssessment,
          receiptSha256: item.receiptSha256,
          ...(item.notes.trim() ? { notes: item.notes.trim() } : {}),
        }))),
        error: null,
      }
    } catch (cause) {
      return { aggregate: null, error: errorMessage(cause) }
    }
  }, [results])

  const stopReferencePlayback = () => {
    const playback = referencePlaybackRef.current
    referencePlaybackRef.current = null
    setPlayingReferenceId(null)
    if (!playback) return
    try { playback.source.stop() } catch { /* already stopped */ }
    void playback.context.close().catch(() => undefined)
  }

  useEffect(() => () => {
    abortRef.current?.abort()
    stopReferencePlayback()
  }, [])

  const chooseFiles = (category: RealReferenceEvidenceCategory, files: FileList | null) => {
    if (!files) return
    const next = Array.from(files)
    setError(null)
    if (next.length !== 2) {
      setError(`Choose exactly two files for ${categoryLabel(category)} evidence.`)
      setSelectedFiles((current) => ({ ...current, [category]: [] }))
      setResults([])
      return
    }
    setSelectedFiles((current) => ({ ...current, [category]: next }))
    setResults([])
    setStatus(null)
  }

  const runAll = async () => {
    if (!readyToRun) return
    abortRef.current?.abort()
    stopReferencePlayback()
    void onStopAudition?.().catch(() => undefined)
    const controller = new AbortController()
    abortRef.current = controller
    setRunning(true)
    setResults([])
    setError(null)
    setProgress(null)
    setStatus('Loading the checksum-valid local DX7 catalog once for all six references…')

    try {
      const catalogCandidates = await loadBundledCatalogPresetCandidates({
        ...(scope === 'quick' ? { maxVoices: REAL_REFERENCE_BENCHMARK_DEFAULT_MAX_VOICES } : {}),
        signal: controller.signal,
        onProgress: (entry) => setStatus(`Loading catalog · ${entry.voicesFound} voices · ${entry.currentEntry}`),
      })
      if (catalogCandidates.length === 0) throw new Error('No checksum-valid bundled DX7 voices were available for the evidence run.')
      const engine = createMsfaOfflineEngine()
      const fingerprintCache = globalThis.indexedDB
        ? createIndexedDbPresetFingerprintCache()
        : createMemoryPresetFingerprintCache()
      const completed: EvidenceRunResult[] = []
      const ordered = CATEGORIES.flatMap((category) => selectedFiles[category.id].map((file, index) => ({ category: category.id, file, index })))

      for (let caseIndex = 0; caseIndex < ordered.length; caseIndex += 1) {
        if (controller.signal.aborted) throw new DOMException('Evidence run cancelled.', 'AbortError')
        const item = ordered[caseIndex]
        if (!item) continue
        setStatus(`Preparing ${caseIndex + 1}/6 · ${item.file.name}`)
        const pitchText = manualPitches[pitchKey(item.category, item.index)]?.trim() ?? ''
        const manualPitchHz = pitchText ? Number(pitchText) : null
        const reference = await prepareReferenceAudioFile(item.file, {
          trimSilence: true,
          normalize: true,
          manualPitchHz,
        })
        if (reference.decodedDurationSeconds > REFERENCE_AUDIO_MAX_DURATION_SECONDS + 1e-6) {
          throw new Error(`${item.file.name} is ${reference.decodedDurationSeconds.toFixed(2)} s. The 2+2+2 runner requires already-isolated clips no longer than ${REFERENCE_AUDIO_MAX_DURATION_SECONDS} s so it never silently chooses a region. Use the single-reference workflow for longer recordings.`)
        }
        setStatus(`Benchmarking ${caseIndex + 1}/6 · ${item.file.name}`)
        const report = await runRealReferenceReconstructionBenchmark(reference, {
          declaredIsolated: true,
          ...(scope === 'quick' ? { maxVoices: REAL_REFERENCE_BENCHMARK_DEFAULT_MAX_VOICES } : {}),
          engine,
          fingerprintCache,
          loadCandidates: async () => catalogCandidates,
          signal: controller.signal,
          onProgress: (benchmark) => setProgress({ caseIndex, benchmark }),
        })
        const receiptText = `${JSON.stringify(report, null, 2)}\n`
        const receiptSha256 = await sha256Utf8(receiptText)
        const learned = report.comparison.results.find((entry) => entry.approachId === 'learned-initialization')
        const result: EvidenceRunResult = {
          id: `${report.reference.contentSha256}:${item.category}`,
          category: item.category,
          reference,
          report,
          receiptFilename: receiptFilename(report),
          receiptText,
          receiptSha256,
          listeningAssessment: 'not-assessed',
          learnedListeningAssessment: learned?.failure === null ? 'not-assessed' : 'unavailable',
          notes: '',
        }
        completed.push(result)
        setResults([...completed])
      }
      setStatus('Six real-reference receipts created locally. Audition the exact winners and complete both listening verdicts for every row.')
      setProgress(null)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        setError('2+2+2 evidence run cancelled. Completed receipts remain available below.')
      } else {
        setError(errorMessage(cause))
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setRunning(false)
    }
  }

  const updateResult = (id: string, patch: Partial<Pick<EvidenceRunResult, 'listeningAssessment' | 'learnedListeningAssessment' | 'notes'>>) => {
    setResults((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const playReference = async (item: EvidenceRunResult) => {
    stopReferencePlayback()
    void onStopAudition?.().catch(() => undefined)
    setError(null)
    const context = new AudioContext()
    try {
      await context.resume()
      const buffer = context.createBuffer(1, item.reference.samples.length, item.reference.sampleRate)
      buffer.copyToChannel(Float32Array.from(item.reference.samples), 0)
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      referencePlaybackRef.current = { context, source }
      source.onended = () => {
        if (referencePlaybackRef.current?.source !== source) return
        referencePlaybackRef.current = null
        setPlayingReferenceId(null)
        void context.close().catch(() => undefined)
      }
      source.start()
      setPlayingReferenceId(item.id)
    } catch (cause) {
      void context.close().catch(() => undefined)
      setError(`Reference playback failed: ${errorMessage(cause)}`)
    }
  }

  const auditionWinner = async (voice: Dx7Voice) => {
    if (!onAuditionVoice) return
    stopReferencePlayback()
    setError(null)
    try {
      await onStopAudition?.().catch(() => undefined)
      await onAuditionVoice(voice)
    } catch (cause) {
      setError(`Benchmark winner audition failed: ${errorMessage(cause)}`)
    }
  }

  const exportEvidenceZip = async () => {
    const aggregate = aggregateState.aggregate
    if (!aggregate) return
    setError(null)
    try {
      const files: Record<string, Uint8Array> = {}
      for (const item of results) files[`receipts/${item.receiptFilename}`] = strToU8(item.receiptText)
      files[`${aggregateStem(aggregate)}.json`] = strToU8(serializeRealReferenceBenchmarkAggregate(aggregate))
      if (aggregate.closureReadiness.readyForAggregateEvidence) {
        const evidence = await createRealReferenceAggregateEvidenceMarkdown(aggregate)
        files[`${aggregateStem(aggregate)}-evidence.md`] = strToU8(evidence.markdown)
      }
      const zip = zipSync(files, { level: 6 })
      downloadBlob(`fm1-real-reference-2x2x2-${aggregate.createdAt.replace(/[:.]/g, '-')}.zip`, zip as Uint8Array<ArrayBuffer>, 'application/zip')
    } catch (cause) {
      setError(`Evidence ZIP export failed: ${errorMessage(cause)}`)
    }
  }

  const saveClosureMarkdown = async () => {
    const aggregate = aggregateState.aggregate
    if (!aggregate) return
    setError(null)
    try {
      const evidence = await createRealReferenceAggregateEvidenceMarkdown(aggregate)
      downloadText(`${aggregateStem(aggregate)}-evidence.md`, evidence.markdown, 'text/markdown')
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.025] p-4" aria-label="2+2+2 real-reference evidence run">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-200">2+2+2 final evidence run · local only</p>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400">
            Run the remaining mixed real-reference benchmark as one controlled session: exactly two electronic, two acoustic and two difficult isolated clips. The catalog and renderer cache are reused across all six runs. Every exact winner-bearing receipt is SHA-256 bound into the aggregate; source audio stays in browser memory and is never put into the exported evidence files.
          </p>
        </div>
        <span className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">{selectedCount}/6 FILES</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <div className="rounded-xl border border-white/10 bg-black/15 p-3" key={category.id}>
            <p className="text-xs font-bold text-slate-200">{category.label}</p>
            <p className="mt-1 text-[10px] text-slate-500">Exactly 2 already-isolated WAV/MP3 clips · ≤ {REFERENCE_AUDIO_MAX_DURATION_SECONDS} s each</p>
            <label className="mt-3 inline-flex cursor-pointer rounded-lg border border-fuchsia-200/25 px-3 py-2 text-xs font-bold text-fuchsia-100">
              Choose 2 files
              <input
                accept=".wav,.mp3,audio/wav,audio/mpeg"
                className="sr-only"
                disabled={running}
                multiple
                onChange={(event) => { chooseFiles(category.id, event.target.files); event.currentTarget.value = '' }}
                type="file"
              />
            </label>
            <div className="mt-3 grid gap-2">
              {selectedFiles[category.id].map((file, index) => (
                <div className="rounded-lg border border-white/8 p-2" key={`${file.name}:${file.lastModified}:${index}`}>
                  <p className="truncate text-[11px] text-slate-300" title={file.name}>{index + 1}. {file.name}</p>
                  <label className="mt-2 grid gap-1 text-[9px] uppercase tracking-[0.1em] text-slate-600">
                    Manual pitch Hz · optional
                    <input
                      className="rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-xs normal-case text-slate-200"
                      disabled={running}
                      inputMode="decimal"
                      max={5000}
                      min={20}
                      onChange={(event) => setManualPitches((current) => ({ ...current, [pitchKey(category.id, index)]: event.target.value }))}
                      placeholder="auto detect"
                      step="0.01"
                      type="number"
                      value={manualPitches[pitchKey(category.id, index)] ?? ''}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200/15 bg-amber-200/[0.025] p-3 text-xs leading-5 text-slate-300">
        <input checked={declaredIsolated} className="mt-1" disabled={running} onChange={(event) => setDeclaredIsolated(event.target.checked)} type="checkbox" />
        <span>I confirm all six selected files are genuinely isolated single sounds/notes and are classified in the correct 2+2+2 evidence groups. Poor or difficult results will be retained rather than removed.</span>
      </label>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-slate-400">
          Catalog scope
          <select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100" disabled={running} onChange={(event) => setScope(event.target.value as BenchmarkScope)} value={scope}>
            <option value="full">Full bundled catalog · final evidence preferred</option>
            <option value="quick">Quick · first {REAL_REFERENCE_BENCHMARK_DEFAULT_MAX_VOICES} voices</option>
          </select>
        </label>
        <button className="rounded-xl bg-fuchsia-200 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled={!readyToRun} onClick={() => void runAll()} type="button">
          {results.length > 0 ? 'Run all six again' : 'Run 2+2+2 evidence set'}
        </button>
        {running && <button className="rounded-xl border border-rose-300/30 px-4 py-2.5 text-sm font-bold text-rose-200" onClick={() => abortRef.current?.abort()} type="button">Cancel</button>}
      </div>

      {status && <p className="mt-3 text-xs text-emerald-200">{status}</p>}
      {progress && running && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
          <div className="flex flex-wrap justify-between gap-2"><span>Reference {progress.caseIndex + 1}/6 · {progress.benchmark?.phase ?? 'prepare'}</span><span>{progress.benchmark && progress.benchmark.total > 0 ? `${progress.benchmark.completed}/${progress.benchmark.total}` : 'working'}</span></div>
          {progress.benchmark?.current && <p className="mt-2 truncate text-[11px] text-slate-500">{progress.benchmark.current}</p>}
        </div>
      )}
      {(error ?? aggregateState.error) && <p className="mt-3 text-xs text-rose-300" role="alert">{error ?? aggregateState.error}</p>}

      {results.length > 0 && (
        <div className="mt-5 grid gap-3">
          {results.map((item, index) => {
            const learned = item.report.comparison.results.find((entry) => entry.approachId === 'learned-initialization')
            const learnedAvailable = learned?.failure === null
            return (
              <article className="rounded-xl border border-white/10 bg-black/20 p-3" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-fuchsia-200">#{index + 1} · {categoryLabel(item.category)}</p>
                    <p className="mt-1 font-bold text-white">{item.report.reference.filename}</p>
                    <p className="mt-1 break-all font-mono text-[9px] text-slate-600">Reference {item.report.reference.contentSha256}</p>
                    <p className="mt-1 break-all font-mono text-[9px] text-emerald-300/70">Receipt {item.receiptSha256}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200" onClick={() => playingReferenceId === item.id ? stopReferencePlayback() : void playReference(item)} type="button">{playingReferenceId === item.id ? 'Stop reference' : '▶ Reference'}</button>
                    <button className="rounded-lg border border-fuchsia-200/25 px-3 py-2 text-xs font-bold text-fuchsia-100" onClick={() => downloadText(item.receiptFilename, item.receiptText, 'application/json')} type="button">Export receipt</button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(item.report.auditionCandidates ?? []).map((candidate) => (
                    <div className="flex overflow-hidden rounded-lg border border-white/10" key={candidate.approachId}>
                      <button className="px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-40" disabled={!onAuditionVoice} onClick={() => void auditionWinner(candidate.voice)} type="button">▶ {candidate.approachId === 'retrieval' ? 'Retrieval' : candidate.approachId === 'evolutionary' ? 'CMA' : 'Learned'} · {candidate.distance.toFixed(5)}</button>
                      <button className="border-l border-white/10 px-2 py-2 text-[10px] text-slate-400" onClick={() => downloadWinnerSyx(candidate.voice)} title="Export exact winner as single-voice SysEx" type="button">.syx</button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <label className="grid gap-1 text-[10px] uppercase tracking-[0.1em] text-slate-500">Retrieval / CMA listening
                    <select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100" onChange={(event) => updateResult(item.id, { listeningAssessment: event.target.value as RealReferenceListeningAssessment })} value={item.listeningAssessment}>
                      {LISTENING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-[10px] uppercase tracking-[0.1em] text-slate-500">Learned listening
                    <select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100 disabled:opacity-50" disabled={!learnedAvailable} onChange={(event) => updateResult(item.id, { learnedListeningAssessment: event.target.value as RealReferenceLearnedListeningAssessment })} value={item.learnedListeningAssessment}>
                      {!learnedAvailable && <option value="unavailable">Unavailable / failed in this receipt</option>}
                      {learnedAvailable && LEARNED_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="mt-3 grid gap-1 text-[10px] uppercase tracking-[0.1em] text-slate-500">Listening notes · optional
                  <input className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100" onChange={(event) => updateResult(item.id, { notes: event.target.value })} placeholder="attack, decay, brightness, pitch/noise mismatch…" type="text" value={item.notes} />
                </label>
              </article>
            )
          })}
        </div>
      )}

      {aggregateState.aggregate && (
        <div className={`mt-5 rounded-xl border p-4 ${aggregateState.aggregate.closureReadiness.readyForAggregateEvidence ? 'border-emerald-300/25 bg-emerald-300/[0.035]' : 'border-amber-200/20 bg-amber-200/[0.025]'}`}>
          <p className="text-sm font-black text-white">{aggregateState.aggregate.closureReadiness.readyForAggregateEvidence ? '2+2+2 evidence set closure-ready' : `Evidence progress · ${results.length}/6 receipts`}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Electronic {aggregateState.aggregate.categoryCounts['fm-friendly-electronic']}/2 · Acoustic {aggregateState.aggregate.categoryCounts['pitched-acoustic']}/2 · Difficult {aggregateState.aggregate.categoryCounts['difficult-transient-noisy']}/2 · exact winners {aggregateState.aggregate.auditionEvidenceReceiptCount}/{aggregateState.aggregate.receiptCount} · receipt hashes {aggregateState.aggregate.receiptIntegrityCount}/{aggregateState.aggregate.receiptCount}</p>
          {aggregateState.aggregate.closureReadiness.missing.length > 0 && <p className="mt-2 text-[11px] text-amber-200">Missing: {aggregateState.aggregate.closureReadiness.missing.join(' · ')}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200" onClick={() => downloadText(`${aggregateStem(aggregateState.aggregate!)}.json`, serializeRealReferenceBenchmarkAggregate(aggregateState.aggregate!), 'application/json')} type="button">Export aggregate JSON</button>
            <button className="rounded-lg border border-emerald-200/25 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-40" disabled={!aggregateState.aggregate.closureReadiness.readyForAggregateEvidence} onClick={() => void saveClosureMarkdown()} type="button">Export closure Markdown + SHA-256</button>
            <button className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950" onClick={() => void exportEvidenceZip()} type="button">Export evidence ZIP</button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">The ZIP contains the exact per-reference receipt files and aggregate JSON; once closure-ready it also contains the generated hash-bound Markdown. It never contains the selected WAV/MP3 source files.</p>
        </div>
      )}
    </section>
  )
}
