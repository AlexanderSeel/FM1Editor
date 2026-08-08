import { useMemo, useState } from 'react'
import {
  aggregateRealReferenceBenchmarkEvidence,
  parseRealReferenceBenchmarkReceipt,
  type RealReferenceBenchmarkAggregate,
  type RealReferenceEvidenceCategory,
  type RealReferenceListeningAssessment,
} from '../audio/realReferenceBenchmarkAggregate'
import type { RealReferenceReconstructionBenchmarkReport } from '../audio/realReferenceReconstructionBenchmark'

interface LoadedReceipt {
  id: string
  sourceFilename: string
  report: RealReferenceReconstructionBenchmarkReport
  category: RealReferenceEvidenceCategory | ''
  listeningAssessment: RealReferenceListeningAssessment
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
  { value: 'similar', label: 'Perceptually similar' },
  { value: 'both-poor', label: 'Both are poor matches' },
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

function saveAggregate(aggregate: RealReferenceBenchmarkAggregate): void {
  const blob = new Blob([`${JSON.stringify(aggregate, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fm1-real-reference-benchmark-aggregate-${aggregate.createdAt.replace(/[:.]/g, '-')}.json`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function ReconstructionBenchmarkSetPanel() {
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
        const parsed = JSON.parse(await file.text()) as unknown
        const report = parseRealReferenceBenchmarkReceipt(parsed)
        next.push({
          id: `${report.reference.contentSha256}:${file.name}`,
          sourceFilename: file.name,
          report,
          category: '',
          listeningAssessment: 'not-assessed',
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

  const updateReceipt = (id: string, patch: Partial<Pick<LoadedReceipt, 'category' | 'listeningAssessment' | 'notes'>>) => {
    setAggregate(null)
    setReceipts((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const removeReceipt = (id: string) => {
    setAggregate(null)
    setReceipts((current) => current.filter((item) => item.id !== id))
  }

  const buildAggregate = () => {
    setError(null)
    try {
      if (!allClassified) throw new Error('Assign an evidence class to every receipt before aggregating.')
      const result = aggregateRealReferenceBenchmarkEvidence(receipts.map((item) => ({
        report: item.report,
        category: item.category as RealReferenceEvidenceCategory,
        listeningAssessment: item.listeningAssessment,
        ...(item.notes.trim() ? { notes: item.notes.trim() } : {}),
      })))
      setAggregate(result)
    } catch (cause) {
      setAggregate(null)
      setError(errorMessage(cause))
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.025] p-4" aria-label="Real-reference benchmark evidence set">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Evidence set · aggregate real-reference receipts</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Import exported real-reference benchmark JSON receipts, classify each source and record the listening outcome. The aggregate rejects duplicate source hashes and reports distance/runtime ranges, CMA metric improvements and cases where a better metric did not sound better. The minimum evidence gate is two FM-friendly electronic, two pitched acoustic and two difficult/noisy references with listening assessments completed.
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
          <button className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-200" onClick={() => saveAggregate(aggregate)} type="button">
            Export aggregate JSON
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}

      {receipts.length > 0 && (
        <div className="mt-4 grid gap-3">
          {receipts.map((item) => (
            <article className="rounded-xl border border-white/10 bg-black/20 p-3" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-white">{item.report.reference.filename}</p>
                  <p className="mt-1 text-[10px] text-slate-500">Receipt {item.sourceFilename}</p>
                  <p className="mt-1 break-all font-mono text-[9px] text-slate-600">{item.report.reference.contentSha256}</p>
                </div>
                <button className="text-xs font-bold text-rose-200" onClick={() => removeReceipt(item.id)} type="button">Remove</button>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
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
                  Listening assessment
                  <select
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100"
                    onChange={(event) => updateReceipt(item.id, { listeningAssessment: event.target.value as RealReferenceListeningAssessment })}
                    value={item.listeningAssessment}
                  >
                    {listeningOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-3 grid gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Listening notes · optional
                <input
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100"
                  onChange={(event) => updateReceipt(item.id, { notes: event.target.value })}
                  placeholder="e.g. brighter attack but wrong decay"
                  type="text"
                  value={item.notes}
                />
              </label>
            </article>
          ))}
        </div>
      )}

      {aggregate && (
        <div className="mt-5 grid gap-3" data-real-reference-aggregate="complete">
          <div className={`rounded-xl border p-3 ${aggregate.closureReadiness.readyForAggregateEvidence ? 'border-emerald-300/25 bg-emerald-300/[0.035]' : 'border-amber-200/20 bg-amber-200/[0.025]'}`}>
            <p className="text-sm font-black text-white">{aggregate.closureReadiness.readyForAggregateEvidence ? 'Minimum mixed evidence set complete' : 'Evidence set still incomplete'}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              Electronic {aggregate.categoryCounts['fm-friendly-electronic']}/2 · Acoustic {aggregate.categoryCounts['pitched-acoustic']}/2 · Difficult {aggregate.categoryCounts['difficult-transient-noisy']}/2 · Unassessed listening {aggregate.listeningCounts['not-assessed']}
            </p>
            {aggregate.closureReadiness.missing.length > 0 && <p className="mt-2 text-[11px] text-amber-200">Missing: {aggregate.closureReadiness.missing.join(' · ')}</p>}
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">Retrieval distance</p><p className="mt-1 text-slate-200">median {statistic(aggregate.retrievalDistance.median)}</p><p className="text-[10px] text-slate-500">{statistic(aggregate.retrievalDistance.minimum)}–{statistic(aggregate.retrievalDistance.maximum)}</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">CMA distance</p><p className="mt-1 text-slate-200">median {statistic(aggregate.evolutionaryDistance.median)}</p><p className="text-[10px] text-slate-500">{statistic(aggregate.evolutionaryDistance.minimum)}–{statistic(aggregate.evolutionaryDistance.maximum)}</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">Retrieval runtime</p><p className="mt-1 text-slate-200">median {runtime(aggregate.retrievalRuntimeMs.median)}</p><p className="text-[10px] text-slate-500">{runtime(aggregate.retrievalRuntimeMs.minimum)}–{runtime(aggregate.retrievalRuntimeMs.maximum)}</p></div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase text-slate-500">CMA runtime</p><p className="mt-1 text-slate-200">median {runtime(aggregate.evolutionaryRuntimeMs.median)}</p><p className="text-[10px] text-slate-500">{runtime(aggregate.evolutionaryRuntimeMs.minimum)}–{runtime(aggregate.evolutionaryRuntimeMs.maximum)}</p></div>
          </div>

          <p className="text-[11px] leading-5 text-slate-500">
            CMA improved the numerical metric for {aggregate.cmaMetricImprovedCount}/{aggregate.receiptCount} references ({Math.round(aggregate.cmaMetricImprovedRate * 100)}%). Listening preferred CMA for {aggregate.cmaListeningBetterCount}/{aggregate.receiptCount}. Metric improved without a corresponding “CMA sounds better” assessment in {aggregate.metricImprovedButListeningNotBetterCount} case{aggregate.metricImprovedButListeningNotBetterCount === 1 ? '' : 's'}. Learned initialization remains unavailable in {aggregate.learnedInitializationUnavailableCount}/{aggregate.receiptCount} receipts.
          </p>
        </div>
      )}
    </section>
  )
}
