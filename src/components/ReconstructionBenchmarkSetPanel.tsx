import { useMemo, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import { createDx7VoiceSyxArtifact } from '../audio/dx7CandidateArtifacts'
import {
  createRealReferenceAggregateEvidenceMarkdown,
  serializeRealReferenceBenchmarkAggregate,
  sha256Utf8,
} from '../audio/realReferenceAggregateEvidenceDocument'
import {
  aggregateRealReferenceBenchmarkEvidence,
  parseRealReferenceBenchmarkReceipt,
  type RealReferenceBenchmarkAggregate,
  type RealReferenceEvidenceCategory,
  type RealReferenceLearnedListeningAssessment,
  type RealReferenceListeningAssessment,
} from '../audio/realReferenceBenchmarkAggregate'
import type { RealReferenceReconstructionBenchmarkReport } from '../audio/realReferenceReconstructionBenchmark'

interface LoadedReceipt {
  id: string
  sourceFilename: string
  report: RealReferenceReconstructionBenchmarkReport
  receiptSha256: string
  category: RealReferenceEvidenceCategory | ''
  listeningAssessment: RealReferenceListeningAssessment
  learnedListeningAssessment: RealReferenceLearnedListeningAssessment
  notes: string
}

const categoryOptions: readonly { value: RealReferenceEvidenceCategory; label: string }[] = [
  { value: 'fm-friendly-electronic', label: 'FM-friendly electronic / sustained' },
  { value: 'pitched-acoustic', label: 'Pitched acoustic / instrument' },
  { value: 'difficult-transient-noisy', label: 'Difficult transient / noisy / nonlinear' },
]

const listeningOptions: readonly { value: RealReferenceListeningAssessment; label: string }[] = [
  { value: 'not-assessed', label: 'Not listened yet' },
  { value: 'cma-better', label: 'CMA candidate sounds better' },
  { value: 'retrieval-better', label: 'Retrieved candidate sounds better' },
  { value: 'similar', label: 'Retrieval and CMA are perceptually similar' },
  { value: 'both-poor', label: 'Retrieval and CMA are both poor matches' },
]

const learnedListeningOptions: readonly { value: Exclude<RealReferenceLearnedListeningAssessment, 'unavailable'>; label: string }[] = [
  { value: 'not-assessed', label: 'Not listened yet' },
  { value: 'learned-better', label: 'Learned candidate sounds best' },
  { value: 'learned-similar', label: 'Learned is perceptually similar to the best local alternative' },
  { value: 'learned-worse', label: 'Learned is clearly worse than the best local alternative' },
  { value: 'learned-poor', label: 'Learned is a poor / out-of-scope match' },
]

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function statistic(value: number): string {
  return Number.isFinite(value) ? value.toFixed(5) : '—'
}

function runtime(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1)} ms` : '—'
}

function saveText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function aggregateStem(aggregate: RealReferenceBenchmarkAggregate): string {
  return `fm1-real-reference-benchmark-aggregate-${aggregate.createdAt.replace(/[:.]/g, '-')}`
}

function saveAggregate(aggregate: RealReferenceBenchmarkAggregate): void {
  saveText(`${aggregateStem(aggregate)}.json`, serializeRealReferenceBenchmarkAggregate(aggregate), 'application/json')
}

function learnedResult(report: RealReferenceReconstructionBenchmarkReport) {
  return report.comparison.results.find((result) => result.approachId === 'learned-initialization')
}

interface ReconstructionBenchmarkSetPanelProps {
  onAuditionVoice?: (voice: Dx7Voice | Promise<Dx7Voice>) => Promise<void>
  onStopAudition?: () => Promise<void>
}

function downloadWinnerSyx(voice: Dx7Voice): void {
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

export function ReconstructionBenchmarkSetPanel({ onAuditionVoice, onStopAudition }: ReconstructionBenchmarkSetPanelProps = {}) {
  const [receipts, setReceipts] = useState<readonly LoadedReceipt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [aggregate, setAggregate] = useState<RealReferenceBenchmarkAggregate | null>(null)

  const allClassified = useMemo(() => receipts.length > 0 && receipts.every((item) => item.category !== ''), [receipts])

  const loadReceipts = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    setAggregate(null)
    try {
      const next: LoadedReceipt[] = []
      for (const file of Array.from(files)) {
        const receiptText = await file.text()
        const parsed = JSON.parse(receiptText) as unknown
        const report = parseRealReferenceBenchmarkReceipt(parsed)
        const learned = learnedResult(report)
        const receiptSha256 = await sha256Utf8(receiptText)
        next.push({
          id: `${report.reference.contentSha256}:${file.name}`,
          sourceFilename: file.name,
          report,
          receiptSha256,
          category: '',
          listeningAssessment: 'not-assessed',
          learnedListeningAssessment: learned?.failure === null ? 'not-assessed' : 'unavailable',
          notes: '',
        })
      }
      const combined = [...receipts, ...next]
      const hashes = new Set<string>()
      for (const item of combined) {
        const hash = item.report.reference.contentSha256.toLowerCase()
        if (hashes.has(hash)) throw new Error(`Duplicate benchmark source SHA-256: ${hash}.`)
        hashes.add(hash)
      }
      setReceipts(combined)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  const updateReceipt = (id: string, patch: Partial<Pick<LoadedReceipt, 'category' | 'listeningAssessment' | 'learnedListeningAssessment' | 'notes'>>) => {
    setAggregate(null)
    setReceipts((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const removeReceipt = (id: string) => {
    setAggregate(null)
    setReceipts((current) => current.filter((item) => item.id !== id))
  }

  const auditionWinner = async (voice: Dx7Voice) => {
    if (!onAuditionVoice) return
    setError(null)
    try {
      await onStopAudition?.().catch(() => undefined)
      await onAuditionVoice(voice)
    } catch (cause) {
      setError(`Imported benchmark winner audition failed: ${errorMessage(cause)}`)
    }
  }

  const buildAggregate = () => {
    setError(null)
    try {
      if (!allClassified) throw new Error('Assign an evidence class to every receipt before aggregating.')
      const result = aggregateRealReferenceBenchmarkEvidence(receipts.map((item) => ({
        report: item.report,
        category: item.category as RealReferenceEvidenceCategory,
        listeningAssessment: item.listeningAssessment,
        learnedListeningAssessment: item.learnedListeningAssessment,
        receiptSha256: item.receiptSha256,
        ...(item.notes.trim() ? { notes: item.notes.trim() } : {}),
      })))
      setAggregate(result)
    } catch (cause) {
      setAggregate(null)
      setError(errorMessage(cause))
    }
  }

  const saveClosureEvidence = async () => {
    if (!aggregate) return
    setError(null)
    try {
      const evidence = await createRealReferenceAggregateEvidenceMarkdown(aggregate)
      saveText(`${aggregateStem(aggregate)}-evidence.md`, evidence.markdown, 'text/markdown')
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.025] p-4" aria-label="Real-reference benchmark evidence set">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Evidence set · aggregate real-reference receipts</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Import exported real-reference benchmark JSON receipts, classify each source and record separate retrieval/CMA and learned listening outcomes. Legacy pre-admission receipts remain importable for history, but only receipts containing a successful admitted learned row can satisfy the current three-way closure gate. The minimum set is two FM-friendly electronic, two pitched acoustic and two difficult/noisy references with both listening assessments completed. Current closure also requires each receipt to preserve the exact three semantic benchmark winners used for those listening judgments and binds the exact imported receipt file bytes into the aggregate by SHA-256.
          </p>
        </div>
        <span className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
          {receipts.length} RECEIPT{receipts.length === 1 ? '' : 'S'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-xl border border-emerald-200/30 px-4 py-2.5 text-sm font-bold text-emerald-100">
          Import benchmark receipts
          <input
            accept="application/json,.json"
            className="sr-only"
            multiple
            onChange={(event) => {
              void loadReceipts(event.target.files)
              event.currentTarget.value = ''
            }}
            type="file"
          />
        </label>
        {receipts.length > 0 && (
          <button
            className="rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!allClassified}
            onClick={buildAggregate}
            type="button"
          >
            Build aggregate evidence
          </button>
        )}
        {aggregate && (
          <>
            <button className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-200" onClick={() => saveAggregate(aggregate)} type="button">
              Export aggregate JSON
            </button>
            <button
              className="rounded-xl border border-emerald-200/30 px-4 py-2.5 text-sm font-bold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!aggregate.closureReadiness.readyForAggregateEvidence}
              onClick={() => void saveClosureEvidence()}
              type="button"
            >
              Export closure Markdown + SHA-256
            </button>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}

      {receipts.length > 0 && (
        <div className="mt-4 grid gap-3">
          {receipts.map((item) => {
            const learned = learnedResult(item.report)
            const learnedAvailable = learned?.failure === null
            const auditionWinners = item.report.auditionCandidates ?? []
            const auditionEvidenceReady = auditionWinners.length === 3
            return (
              <article className="rounded-xl border border-white/10 bg-black/20 p-3" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{item.report.reference.filename}</p>
                    <p className="mt-1 text-[10px] text-slate-500">Receipt {item.sourceFilename}</p>
                    <p className="mt-1 break-all font-mono text-[9px] text-emerald-300/70">Receipt SHA-256 {item.receiptSha256}</p>
                    <p className="mt-1 break-all font-mono text-[9px] text-slate-600">{item.report.reference.contentSha256}</p>
                    <p className={`mt-2 text-[10px] ${learnedAvailable ? 'text-violet-200' : 'text-amber-200'}`}>
                      {learnedAvailable ? `Learned row ready · distance ${statistic(learned.bestDistance ?? Number.NaN)} · ${runtime(learned.runtimeMs)}` : `Legacy/failed learned row · ${learned?.failure ?? item.report.learnedStatus}`}
                    </p>
                    <p className={`mt-1 text-[10px] ${auditionEvidenceReady ? 'text-emerald-200' : 'text-amber-200'}`}>
                      {auditionEvidenceReady ? 'Exact retrieval/CMA/learned winners retained for reproducible listening' : 'Legacy receipt: exact benchmark winners missing · rerun before final closure'}
                    </p>
                  </div>
                  <button className="text-xs font-bold text-rose-200" onClick={() => removeReceipt(item.id)} type="button">Remove</button>
                </div>

                {auditionWinners.length > 0 && (
                  <div className="mt-3 rounded-xl border border-emerald-200/15 bg-emerald-200/[0.02] p-3" data-imported-audition-evidence={auditionEvidenceReady ? 'complete' : 'partial'}>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-200">Exact imported winners</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {auditionWinners.map((candidate) => (
                        <div className="flex gap-1" key={candidate.approachId}>
                          <button className="rounded-lg border border-emerald-200/25 px-2.5 py-1.5 text-[11px] font-bold text-emerald-100 disabled:opacity-40" disabled={!onAuditionVoice} onClick={() => void auditionWinner(candidate.voice)} type="button">▶ {candidate.approachId === 'retrieval' ? 'Retrieval' : candidate.approachId === 'evolutionary' ? 'CMA' : 'Learned'}</button>
                          <button className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300" onClick={() => downloadWinnerSyx(candidate.voice)} type="button">.syx</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 grid gap-3 xl:grid-cols-3">
                  <label className="grid gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    Evidence class
                    <select
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100"
                      onChange={(event) => updateReceipt(item.id, { category: event.target.value as RealReferenceEvidenceCategory | '' })}
                      value={item.category}
                    >
                      <option value="">Choose class…</option>
                      {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    Retrieval / CMA listening
                    <select
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100"
                      disabled={!auditionEvidenceReady}
                      onChange={(event) => updateReceipt(item.id, { listeningAssessment: event.target.value as RealReferenceListeningAssessment })}
                      value={item.listeningAssessment}
                    >
                      {listeningOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    Learned listening
                    <select
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100 disabled:opacity-55"
                      disabled={!learnedAvailable || !auditionEvidenceReady}
                      onChange={(event) => updateReceipt(item.id, { learnedListeningAssessment: event.target.value as RealReferenceLearnedListeningAssessment })}
                      value={item.learnedListeningAssessment}
                    >
                      {!learnedAvailable && <option value="unavailable">Unavailable in this receipt · rerun benchmark</option>}
                      {learnedAvailable && learnedListeningOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="mt-3 grid gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  Listening notes · optional
                  <input
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100"
                    onChange={(event) => updateReceipt(item.id, { notes: event.target.value })}
                    placeholder="e.g. learned attack is closer but fixed-base decay is wrong"
                    type="text"
                    value={item.notes}
                  />
                </label>
              </article>
            )
          })}
        </div>
      )}

      {aggregate && (
        <div className="mt-5 grid gap-3" data-real-reference-aggregate="complete">
          <div className={`rounded-xl border p-3 ${aggregate.closureReadiness.readyForAggregateEvidence ? 'border-emerald-300/25 bg-emerald-300/[0.035]' : 'border-amber-200/20 bg-amber-200/[0.025]'}`}>
            <p className="text-sm font-black text-white">{aggregate.closureReadiness.readyForAggregateEvidence ? 'Current three-way mixed evidence set complete' : 'Evidence set still incomplete'}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              Electronic {aggregate.categoryCounts['fm-friendly-electronic']}/2 · Acoustic {aggregate.categoryCounts['pitched-acoustic']}/2 · Difficult {aggregate.categoryCounts['difficult-transient-noisy']}/2 · Retrieval/CMA unassessed {aggregate.listeningCounts['not-assessed']} · Learned unassessed {aggregate.learnedListeningCounts['not-assessed']} · Current learned rows {aggregate.learnedInitializationSuccessCount}/{aggregate.receiptCount} · Reproducible audition receipts {aggregate.auditionEvidenceReceiptCount}/{aggregate.receiptCount}
            </p>
            {aggregate.closureReadiness.missing.length > 0 && <p className="mt-2 text-[11px] text-amber-200">Missing: {aggregate.closureReadiness.missing.join(' · ')}</p>}
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">Retrieval distance</p><p className="mt-1 text-slate-200">median {statistic(aggregate.retrievalDistance.median)}</p><p className="text-[10px] text-slate-500">{statistic(aggregate.retrievalDistance.minimum)}–{statistic(aggregate.retrievalDistance.maximum)}</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">CMA distance</p><p className="mt-1 text-slate-200">median {statistic(aggregate.evolutionaryDistance.median)}</p><p className="text-[10px] text-slate-500">{statistic(aggregate.evolutionaryDistance.minimum)}–{statistic(aggregate.evolutionaryDistance.maximum)}</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">Learned distance</p><p className="mt-1 text-slate-200">median {aggregate.learnedDistance ? statistic(aggregate.learnedDistance.median) : '—'}</p><p className="text-[10px] text-slate-500">{aggregate.learnedDistance ? `${statistic(aggregate.learnedDistance.minimum)}–${statistic(aggregate.learnedDistance.maximum)}` : 'no successful learned rows'}</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">Retrieval runtime</p><p className="mt-1 text-slate-200">median {runtime(aggregate.retrievalRuntimeMs.median)}</p><p className="text-[10px] text-slate-500">{runtime(aggregate.retrievalRuntimeMs.minimum)}–{runtime(aggregate.retrievalRuntimeMs.maximum)}</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">CMA runtime</p><p className="mt-1 text-slate-200">median {runtime(aggregate.evolutionaryRuntimeMs.median)}</p><p className="text-[10px] text-slate-500">{runtime(aggregate.evolutionaryRuntimeMs.minimum)}–{runtime(aggregate.evolutionaryRuntimeMs.maximum)}</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">Learned runtime</p><p className="mt-1 text-slate-200">median {aggregate.learnedRuntimeMs ? runtime(aggregate.learnedRuntimeMs.median) : '—'}</p><p className="text-[10px] text-slate-500">{aggregate.learnedRuntimeMs ? `${runtime(aggregate.learnedRuntimeMs.minimum)}–${runtime(aggregate.learnedRuntimeMs.maximum)}` : 'no successful learned rows'}</p></div>
          </div>

          <p className="text-[11px] leading-5 text-slate-500">
            CMA improved the numerical metric for {aggregate.cmaMetricImprovedCount}/{aggregate.receiptCount} references ({Math.round(aggregate.cmaMetricImprovedRate * 100)}%). Listening preferred CMA for {aggregate.cmaListeningBetterCount}/{aggregate.receiptCount}; metric improved without a matching “CMA sounds better” verdict in {aggregate.metricImprovedButListeningNotBetterCount} case{aggregate.metricImprovedButListeningNotBetterCount === 1 ? '' : 's'}. Learned rows succeeded for {aggregate.learnedInitializationSuccessCount}/{aggregate.receiptCount}; listening marked learned best in {aggregate.learnedListeningCounts['learned-better']}, similar in {aggregate.learnedListeningCounts['learned-similar']}, worse in {aggregate.learnedListeningCounts['learned-worse']} and poor/out-of-scope in {aggregate.learnedListeningCounts['learned-poor']}.
          </p>
        </div>
      )}
    </section>
  )
}
