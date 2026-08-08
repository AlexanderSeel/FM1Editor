import { useCallback, useEffect, useRef, useState } from 'react'
import {
  REAL_REFERENCE_BENCHMARK_DEFAULT_MAX_VOICES,
  runRealReferenceReconstructionBenchmark,
  type RealReferenceBenchmarkProgress,
  type RealReferenceReconstructionBenchmarkReport,
} from '../audio/realReferenceReconstructionBenchmark'
import type { PreparedReferenceAudio } from '../audio/referenceAudio'

type BenchmarkScope = 'quick' | 'full'

interface ReconstructionBenchmarkPanelProps {
  reference: PreparedReferenceAudio | null
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function distance(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(5)
}

function runtime(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(1)} ms`
}

function downloadReport(report: RealReferenceReconstructionBenchmarkReport): void {
  const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const stem = report.reference.filename.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'reference'
  anchor.href = url
  anchor.download = `${stem}-reconstruction-benchmark-${report.reference.contentSha256.slice(0, 12)}.json`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function ReconstructionBenchmarkPanel({ reference }: ReconstructionBenchmarkPanelProps) {
  const [scope, setScope] = useState<BenchmarkScope>('quick')
  const [declaredIsolated, setDeclaredIsolated] = useState(false)
  const [progress, setProgress] = useState<RealReferenceBenchmarkProgress | null>(null)
  const [report, setReport] = useState<RealReferenceReconstructionBenchmarkReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setDeclaredIsolated(false)
    setProgress(null)
    setReport(null)
    setError(null)
    setRunning(false)
  }, [reference?.contentSha256])

  useEffect(() => () => abortRef.current?.abort(), [])

  const runBenchmark = useCallback(async () => {
    if (!reference) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRunning(true)
    setProgress(null)
    setReport(null)
    setError(null)
    try {
      const nextReport = await runRealReferenceReconstructionBenchmark(reference, {
        declaredIsolated,
        ...(scope === 'quick' ? { maxVoices: REAL_REFERENCE_BENCHMARK_DEFAULT_MAX_VOICES } : {}),
        signal: controller.signal,
        onProgress: setProgress,
      })
      setReport(nextReport)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        setError('Benchmark cancelled. No receipt was created.')
      } else {
        setError(errorMessage(cause))
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setRunning(false)
    }
  }, [declaredIsolated, reference, scope])

  const cancel = useCallback(() => abortRef.current?.abort(), [])
  const reproducibleReference = Boolean(reference?.filename && reference.contentSha256)
  const retrieval = report?.comparison.results.find((result) => result.approachId === 'retrieval')
  const evolutionary = report?.comparison.results.find((result) => result.approachId === 'evolutionary')
  const learned = report?.comparison.results.find((result) => result.approachId === 'learned-initialization')

  return (
    <section className="mt-4 rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4" aria-label="Reconstruction comparison benchmark">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">Comparison receipt · real isolated reference</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Run retrieval-only, seeded constrained CMA-ES and the admitted local SpiegeLib simple-FM MLP against the same uploaded reference and export a reproducible JSON receipt. The learned model is loaded only when the benchmark runs, stays entirely local, and predicts nine historical Dexed OP2 controls over a fixed training base. The report contains file hash, selected-region metadata, metrics and runtimes only; raw audio is never embedded or uploaded.
          </p>
        </div>
        <span className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
          {reproducibleReference ? 'HASHED REFERENCE READY' : 'UPLOAD FILE REQUIRED'}
        </span>
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200/15 bg-amber-200/[0.025] p-3 text-xs leading-5 text-slate-300">
        <input
          checked={declaredIsolated}
          className="mt-1"
          disabled={!reproducibleReference || running}
          onChange={(event) => setDeclaredIsolated(event.target.checked)}
          type="checkbox"
        />
        <span>
          I confirm the selected region is one real isolated sound or note, not a full song, polyphonic mixture, or synthetic ground-truth fixture. This declaration is stored in the benchmark receipt.
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-slate-400">
          Catalog scope
          <select
            className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            disabled={running}
            onChange={(event) => setScope(event.target.value as BenchmarkScope)}
            value={scope}
          >
            <option value="quick">Quick benchmark · first {REAL_REFERENCE_BENCHMARK_DEFAULT_MAX_VOICES} voices</option>
            <option value="full">Full bundled catalog</option>
          </select>
        </label>
        <button
          className="rounded-xl bg-violet-200 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!reproducibleReference || !declaredIsolated || running}
          onClick={() => void runBenchmark()}
          type="button"
        >
          {report ? 'Run benchmark again' : 'Run local comparison benchmark'}
        </button>
        {running && (
          <button className="rounded-xl border border-rose-300/30 px-4 py-2.5 text-sm font-bold text-rose-200" onClick={cancel} type="button">
            Cancel
          </button>
        )}
        {report && !running && (
          <button className="rounded-xl border border-violet-200/30 px-4 py-2.5 text-sm font-bold text-violet-100" onClick={() => downloadReport(report)} type="button">
            Export JSON receipt
          </button>
        )}
      </div>

      {progress && running && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="uppercase tracking-[0.12em] text-violet-200">{progress.phase}</span>
            <span>{progress.total > 0 ? `${progress.completed}/${progress.total}` : 'working'}</span>
          </div>
          {progress.current && <p className="mt-2 break-words text-[11px] text-slate-500">{progress.current}</p>}
        </div>
      )}

      {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}

      {report && (
        <div className="mt-4 grid gap-3" data-real-reference-benchmark="complete">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
            <p className="font-bold text-slate-200">{report.reference.filename}</p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-500">SHA-256 {report.reference.contentSha256}</p>
            <p className="mt-2 text-[11px]">{report.configuration.catalogCandidateCount} catalog voices · probe {report.configuration.probe.id} · seed {report.configuration.seed} · shared preparation {runtime(report.sharedPreparationMs)}</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-white/[0.035] text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Approach</th>
                  <th className="px-3 py-2">Candidates</th>
                  <th className="px-3 py-2">Best distance</th>
                  <th className="px-3 py-2">Runtime</th>
                  <th className="px-3 py-2">Status / source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="px-3 py-2 font-bold">Retrieval</td>
                  <td className="px-3 py-2">{retrieval?.candidateCount ?? 0}</td>
                  <td className="px-3 py-2 font-mono">{distance(retrieval?.bestDistance)}</td>
                  <td className="px-3 py-2">{runtime(retrieval?.runtimeMs)}</td>
                  <td className="px-3 py-2">{retrieval?.sourceInitialization ?? retrieval?.failure ?? '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-bold">Seeded CMA-ES</td>
                  <td className="px-3 py-2">{evolutionary?.candidateCount ?? 0}</td>
                  <td className="px-3 py-2 font-mono">{distance(evolutionary?.bestDistance)}</td>
                  <td className="px-3 py-2">{runtime(evolutionary?.runtimeMs)}</td>
                  <td className="px-3 py-2">{evolutionary?.sourceInitialization ?? evolutionary?.failure ?? '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-bold">SpiegeLib learned</td>
                  <td className="px-3 py-2">{learned?.candidateCount ?? 0}</td>
                  <td className="px-3 py-2 font-mono">{distance(learned?.bestDistance)}</td>
                  <td className="px-3 py-2">{runtime(learned?.runtimeMs)}</td>
                  <td className="px-3 py-2 text-violet-200">{learned?.sourceInitialization ?? learned?.failure ?? report.learnedStatus}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] leading-5 text-slate-500">
            Retrieval minus evolutionary distance: {distance(report.retrievalVsEvolutionaryDelta)}. Positive means constrained CMA-ES produced the lower fingerprint distance for this reference. Learned distance is reported independently and is not CMA-refined. This receipt is comparative evidence only and does not claim exact patch identity or physical FM-1 equivalence.
          </p>
        </div>
      )}
    </section>
  )
}
