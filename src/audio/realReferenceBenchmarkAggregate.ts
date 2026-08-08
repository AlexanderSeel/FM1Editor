import {
  REAL_REFERENCE_LEARNED_BLOCK,
  REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA,
  type RealReferenceReconstructionBenchmarkReport,
} from './realReferenceReconstructionBenchmark'

export const REAL_REFERENCE_BENCHMARK_AGGREGATE_SCHEMA = 'fm1-editor.real-reference-benchmark-aggregate.v1' as const

export type RealReferenceEvidenceCategory =
  | 'fm-friendly-electronic'
  | 'pitched-acoustic'
  | 'difficult-transient-noisy'

export type RealReferenceListeningAssessment =
  | 'cma-better'
  | 'retrieval-better'
  | 'similar'
  | 'both-poor'
  | 'not-assessed'

export interface RealReferenceEvidenceInput {
  readonly report: RealReferenceReconstructionBenchmarkReport
  readonly category: RealReferenceEvidenceCategory
  readonly listeningAssessment: RealReferenceListeningAssessment
  readonly notes?: string
}

export interface RealReferenceMetricStats {
  readonly count: number
  readonly minimum: number
  readonly median: number
  readonly maximum: number
}

export interface RealReferenceBenchmarkAggregate {
  readonly schema: typeof REAL_REFERENCE_BENCHMARK_AGGREGATE_SCHEMA
  readonly createdAt: string
  readonly receiptCount: number
  readonly categoryCounts: Readonly<Record<RealReferenceEvidenceCategory, number>>
  readonly listeningCounts: Readonly<Record<RealReferenceListeningAssessment, number>>
  readonly retrievalDistance: RealReferenceMetricStats
  readonly evolutionaryDistance: RealReferenceMetricStats
  readonly retrievalRuntimeMs: RealReferenceMetricStats
  readonly evolutionaryRuntimeMs: RealReferenceMetricStats
  readonly cmaMetricImprovedCount: number
  readonly cmaMetricImprovedRate: number
  readonly cmaListeningBetterCount: number
  readonly metricImprovedButListeningNotBetterCount: number
  readonly learnedInitializationUnavailableCount: number
  readonly closureReadiness: {
    readonly mixedSetComplete: boolean
    readonly listeningAssessmentsComplete: boolean
    readonly readyForAggregateEvidence: boolean
    readonly missing: readonly string[]
  }
  readonly receipts: readonly {
    readonly referenceSha256: string
    readonly filename: string
    readonly category: RealReferenceEvidenceCategory
    readonly listeningAssessment: RealReferenceListeningAssessment
    readonly notes: string | null
    readonly retrievalDistance: number
    readonly evolutionaryDistance: number
    readonly retrievalRuntimeMs: number
    readonly evolutionaryRuntimeMs: number
    readonly retrievalVsEvolutionaryDelta: number
    readonly learnedStatus: string
  }[]
  readonly note: string
}

export const REAL_REFERENCE_EVIDENCE_CATEGORIES: readonly RealReferenceEvidenceCategory[] = [
  'fm-friendly-electronic',
  'pitched-acoustic',
  'difficult-transient-noisy',
]

export const REAL_REFERENCE_LISTENING_ASSESSMENTS: readonly RealReferenceListeningAssessment[] = [
  'cma-better',
  'retrieval-better',
  'similar',
  'both-poor',
  'not-assessed',
]

function finiteNonNegative(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`)
  }
  return value
}

function metricStats(values: readonly number[], label: string): RealReferenceMetricStats {
  if (values.length === 0) throw new Error(`${label} has no values.`)
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle] ?? 0
  return {
    count: sorted.length,
    minimum: sorted[0] ?? 0,
    median,
    maximum: sorted.at(-1) ?? 0,
  }
}

function resultFor(report: RealReferenceReconstructionBenchmarkReport, approachId: 'retrieval' | 'evolutionary' | 'learned-initialization') {
  const result = report.comparison.results.find((candidate) => candidate.approachId === approachId)
  if (!result) throw new Error(`${report.reference.filename} is missing the ${approachId} comparison row.`)
  return result
}

function assertReport(report: RealReferenceReconstructionBenchmarkReport): void {
  if (report.schema !== REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA) throw new Error('Unsupported real-reference benchmark receipt schema.')
  if (report.reference.kind !== 'real-isolated-sound' || report.reference.declaredIsolated !== true) {
    throw new Error(`${report.reference.filename || 'Receipt'} is not declared as a real isolated reference.`)
  }
  if (!/^[0-9a-f]{64}$/i.test(report.reference.contentSha256)) throw new Error(`${report.reference.filename} has an invalid SHA-256 identity.`)
  if (JSON.stringify(report).includes('"samples"')) throw new Error(`${report.reference.filename} unexpectedly embeds raw audio samples.`)
  const retrieval = resultFor(report, 'retrieval')
  const evolutionary = resultFor(report, 'evolutionary')
  resultFor(report, 'learned-initialization')
  finiteNonNegative(retrieval.bestDistance, `${report.reference.filename} retrieval distance`)
  finiteNonNegative(evolutionary.bestDistance, `${report.reference.filename} evolutionary distance`)
  finiteNonNegative(retrieval.runtimeMs, `${report.reference.filename} retrieval runtime`)
  finiteNonNegative(evolutionary.runtimeMs, `${report.reference.filename} evolutionary runtime`)
}

export function parseRealReferenceBenchmarkReceipt(value: unknown): RealReferenceReconstructionBenchmarkReport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Benchmark receipt must be a JSON object.')
  const report = value as RealReferenceReconstructionBenchmarkReport
  assertReport(report)
  return report
}

export function aggregateRealReferenceBenchmarkEvidence(
  inputs: readonly RealReferenceEvidenceInput[],
  createdAt: Date = new Date(),
): RealReferenceBenchmarkAggregate {
  if (inputs.length === 0) throw new Error('At least one real-reference benchmark receipt is required.')
  const seenHashes = new Set<string>()
  const categoryCounts: Record<RealReferenceEvidenceCategory, number> = {
    'fm-friendly-electronic': 0,
    'pitched-acoustic': 0,
    'difficult-transient-noisy': 0,
  }
  const listeningCounts: Record<RealReferenceListeningAssessment, number> = {
    'cma-better': 0,
    'retrieval-better': 0,
    similar: 0,
    'both-poor': 0,
    'not-assessed': 0,
  }
  const receipts: RealReferenceBenchmarkAggregate['receipts'][number][] = []
  const retrievalDistances: number[] = []
  const evolutionaryDistances: number[] = []
  const retrievalRuntimes: number[] = []
  const evolutionaryRuntimes: number[] = []
  let cmaMetricImprovedCount = 0
  let cmaListeningBetterCount = 0
  let metricImprovedButListeningNotBetterCount = 0
  let learnedInitializationUnavailableCount = 0

  for (const input of inputs) {
    assertReport(input.report)
    if (!REAL_REFERENCE_EVIDENCE_CATEGORIES.includes(input.category)) throw new Error(`Unsupported evidence category: ${String(input.category)}.`)
    if (!REAL_REFERENCE_LISTENING_ASSESSMENTS.includes(input.listeningAssessment)) throw new Error(`Unsupported listening assessment: ${String(input.listeningAssessment)}.`)
    const hash = input.report.reference.contentSha256.toLowerCase()
    if (seenHashes.has(hash)) throw new Error(`Duplicate real-reference SHA-256: ${hash}.`)
    seenHashes.add(hash)

    const retrieval = resultFor(input.report, 'retrieval')
    const evolutionary = resultFor(input.report, 'evolutionary')
    const learned = resultFor(input.report, 'learned-initialization')
    const retrievalDistance = finiteNonNegative(retrieval.bestDistance, 'retrieval distance')
    const evolutionaryDistance = finiteNonNegative(evolutionary.bestDistance, 'evolutionary distance')
    const retrievalRuntimeMs = finiteNonNegative(retrieval.runtimeMs, 'retrieval runtime')
    const evolutionaryRuntimeMs = finiteNonNegative(evolutionary.runtimeMs, 'evolutionary runtime')
    const delta = retrievalDistance - evolutionaryDistance
    const metricImproved = delta > 0

    retrievalDistances.push(retrievalDistance)
    evolutionaryDistances.push(evolutionaryDistance)
    retrievalRuntimes.push(retrievalRuntimeMs)
    evolutionaryRuntimes.push(evolutionaryRuntimeMs)
    categoryCounts[input.category] += 1
    listeningCounts[input.listeningAssessment] += 1
    if (metricImproved) cmaMetricImprovedCount += 1
    if (input.listeningAssessment === 'cma-better') cmaListeningBetterCount += 1
    if (metricImproved && input.listeningAssessment !== 'cma-better') metricImprovedButListeningNotBetterCount += 1
    if (learned.failure === REAL_REFERENCE_LEARNED_BLOCK || input.report.learnedStatus === REAL_REFERENCE_LEARNED_BLOCK) {
      learnedInitializationUnavailableCount += 1
    }

    receipts.push({
      referenceSha256: hash,
      filename: input.report.reference.filename,
      category: input.category,
      listeningAssessment: input.listeningAssessment,
      notes: input.notes?.trim() || null,
      retrievalDistance,
      evolutionaryDistance,
      retrievalRuntimeMs,
      evolutionaryRuntimeMs,
      retrievalVsEvolutionaryDelta: delta,
      learnedStatus: learned.failure ?? input.report.learnedStatus,
    })
  }

  const missing: string[] = []
  for (const category of REAL_REFERENCE_EVIDENCE_CATEGORIES) {
    const count = categoryCounts[category]
    if (count < 2) missing.push(`${category}: ${2 - count} more receipt${2 - count === 1 ? '' : 's'}`)
  }
  const mixedSetComplete = REAL_REFERENCE_EVIDENCE_CATEGORIES.every((category) => categoryCounts[category] >= 2)
  const listeningAssessmentsComplete = listeningCounts['not-assessed'] === 0
  if (!listeningAssessmentsComplete) missing.push(`${listeningCounts['not-assessed']} listening assessment${listeningCounts['not-assessed'] === 1 ? '' : 's'} still missing`)

  return {
    schema: REAL_REFERENCE_BENCHMARK_AGGREGATE_SCHEMA,
    createdAt: createdAt.toISOString(),
    receiptCount: receipts.length,
    categoryCounts,
    listeningCounts,
    retrievalDistance: metricStats(retrievalDistances, 'retrieval distance'),
    evolutionaryDistance: metricStats(evolutionaryDistances, 'evolutionary distance'),
    retrievalRuntimeMs: metricStats(retrievalRuntimes, 'retrieval runtime'),
    evolutionaryRuntimeMs: metricStats(evolutionaryRuntimes, 'evolutionary runtime'),
    cmaMetricImprovedCount,
    cmaMetricImprovedRate: cmaMetricImprovedCount / receipts.length,
    cmaListeningBetterCount,
    metricImprovedButListeningNotBetterCount,
    learnedInitializationUnavailableCount,
    closureReadiness: {
      mixedSetComplete,
      listeningAssessmentsComplete,
      readyForAggregateEvidence: mixedSetComplete && listeningAssessmentsComplete,
      missing,
    },
    receipts,
    note: 'Aggregate contains benchmark metadata, metrics, classifications and listening assessments only. It does not contain reference audio and does not establish exact patch identity or physical FM-1 equivalence.',
  }
}
