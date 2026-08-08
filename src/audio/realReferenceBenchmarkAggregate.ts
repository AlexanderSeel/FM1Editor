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

export type RealReferenceLearnedListeningAssessment =
  | 'learned-better'
  | 'learned-similar'
  | 'learned-worse'
  | 'learned-poor'
  | 'not-assessed'
  | 'unavailable'

export interface RealReferenceEvidenceInput {
  readonly report: RealReferenceReconstructionBenchmarkReport
  readonly category: RealReferenceEvidenceCategory
  readonly listeningAssessment: RealReferenceListeningAssessment
  readonly learnedListeningAssessment: RealReferenceLearnedListeningAssessment
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
  readonly learnedListeningCounts: Readonly<Record<RealReferenceLearnedListeningAssessment, number>>
  readonly retrievalDistance: RealReferenceMetricStats
  readonly evolutionaryDistance: RealReferenceMetricStats
  readonly learnedDistance: RealReferenceMetricStats | null
  readonly retrievalRuntimeMs: RealReferenceMetricStats
  readonly evolutionaryRuntimeMs: RealReferenceMetricStats
  readonly learnedRuntimeMs: RealReferenceMetricStats | null
  readonly cmaMetricImprovedCount: number
  readonly cmaMetricImprovedRate: number
  readonly cmaListeningBetterCount: number
  readonly metricImprovedButListeningNotBetterCount: number
  readonly learnedInitializationSuccessCount: number
  readonly learnedInitializationUnavailableCount: number
  readonly learnedInitializationFailedCount: number
  readonly closureReadiness: {
    readonly mixedSetComplete: boolean
    readonly listeningAssessmentsComplete: boolean
    readonly learnedListeningAssessmentsComplete: boolean
    readonly currentThreeWayComplete: boolean
    readonly readyForAggregateEvidence: boolean
    readonly missing: readonly string[]
  }
  readonly receipts: readonly {
    readonly referenceSha256: string
    readonly filename: string
    readonly category: RealReferenceEvidenceCategory
    readonly listeningAssessment: RealReferenceListeningAssessment
    readonly learnedListeningAssessment: RealReferenceLearnedListeningAssessment
    readonly notes: string | null
    readonly retrievalDistance: number
    readonly evolutionaryDistance: number
    readonly learnedDistance: number | null
    readonly retrievalRuntimeMs: number
    readonly evolutionaryRuntimeMs: number
    readonly learnedRuntimeMs: number | null
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

export const REAL_REFERENCE_LEARNED_LISTENING_ASSESSMENTS: readonly RealReferenceLearnedListeningAssessment[] = [
  'learned-better',
  'learned-similar',
  'learned-worse',
  'learned-poor',
  'not-assessed',
  'unavailable',
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

function metricStatsOrNull(values: readonly number[], label: string): RealReferenceMetricStats | null {
  return values.length === 0 ? null : metricStats(values, label)
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
  const learned = resultFor(report, 'learned-initialization')
  finiteNonNegative(retrieval.bestDistance, `${report.reference.filename} retrieval distance`)
  finiteNonNegative(evolutionary.bestDistance, `${report.reference.filename} evolutionary distance`)
  finiteNonNegative(retrieval.runtimeMs, `${report.reference.filename} retrieval runtime`)
  finiteNonNegative(evolutionary.runtimeMs, `${report.reference.filename} evolutionary runtime`)
  if (learned.failure === null) {
    finiteNonNegative(learned.bestDistance, `${report.reference.filename} learned distance`)
    finiteNonNegative(learned.runtimeMs, `${report.reference.filename} learned runtime`)
  }
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
  const learnedListeningCounts: Record<RealReferenceLearnedListeningAssessment, number> = {
    'learned-better': 0,
    'learned-similar': 0,
    'learned-worse': 0,
    'learned-poor': 0,
    'not-assessed': 0,
    unavailable: 0,
  }
  const receipts: RealReferenceBenchmarkAggregate['receipts'][number][] = []
  const retrievalDistances: number[] = []
  const evolutionaryDistances: number[] = []
  const learnedDistances: number[] = []
  const retrievalRuntimes: number[] = []
  const evolutionaryRuntimes: number[] = []
  const learnedRuntimes: number[] = []
  let cmaMetricImprovedCount = 0
  let cmaListeningBetterCount = 0
  let metricImprovedButListeningNotBetterCount = 0
  let learnedInitializationSuccessCount = 0
  let learnedInitializationUnavailableCount = 0
  let learnedInitializationFailedCount = 0

  for (const input of inputs) {
    assertReport(input.report)
    if (!REAL_REFERENCE_EVIDENCE_CATEGORIES.includes(input.category)) throw new Error(`Unsupported evidence category: ${String(input.category)}.`)
    if (!REAL_REFERENCE_LISTENING_ASSESSMENTS.includes(input.listeningAssessment)) throw new Error(`Unsupported listening assessment: ${String(input.listeningAssessment)}.`)
    if (!REAL_REFERENCE_LEARNED_LISTENING_ASSESSMENTS.includes(input.learnedListeningAssessment)) throw new Error(`Unsupported learned listening assessment: ${String(input.learnedListeningAssessment)}.`)
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

    let learnedDistance: number | null = null
    let learnedRuntimeMs: number | null = null
    if (learned.failure === null) {
      if (input.learnedListeningAssessment === 'unavailable') throw new Error(`${input.report.reference.filename} has a successful learned row but is marked unavailable for listening.`)
      learnedDistance = finiteNonNegative(learned.bestDistance, 'learned distance')
      learnedRuntimeMs = finiteNonNegative(learned.runtimeMs, 'learned runtime')
      learnedDistances.push(learnedDistance)
      learnedRuntimes.push(learnedRuntimeMs)
      learnedInitializationSuccessCount += 1
    } else if (learned.failure === REAL_REFERENCE_LEARNED_BLOCK || input.report.learnedStatus === REAL_REFERENCE_LEARNED_BLOCK) {
      if (input.learnedListeningAssessment !== 'unavailable') throw new Error(`${input.report.reference.filename} has no admitted learned result and must use the unavailable learned listening status.`)
      learnedInitializationUnavailableCount += 1
    } else {
      if (input.learnedListeningAssessment !== 'unavailable') throw new Error(`${input.report.reference.filename} has a failed learned row and must use the unavailable learned listening status.`)
      learnedInitializationFailedCount += 1
    }

    retrievalDistances.push(retrievalDistance)
    evolutionaryDistances.push(evolutionaryDistance)
    retrievalRuntimes.push(retrievalRuntimeMs)
    evolutionaryRuntimes.push(evolutionaryRuntimeMs)
    categoryCounts[input.category] += 1
    listeningCounts[input.listeningAssessment] += 1
    learnedListeningCounts[input.learnedListeningAssessment] += 1
    if (metricImproved) cmaMetricImprovedCount += 1
    if (input.listeningAssessment === 'cma-better') cmaListeningBetterCount += 1
    if (metricImproved && input.listeningAssessment !== 'cma-better') metricImprovedButListeningNotBetterCount += 1

    receipts.push({
      referenceSha256: hash,
      filename: input.report.reference.filename,
      category: input.category,
      listeningAssessment: input.listeningAssessment,
      learnedListeningAssessment: input.learnedListeningAssessment,
      notes: input.notes?.trim() || null,
      retrievalDistance,
      evolutionaryDistance,
      learnedDistance,
      retrievalRuntimeMs,
      evolutionaryRuntimeMs,
      learnedRuntimeMs,
      retrievalVsEvolutionaryDelta: delta,
      learnedStatus: learned.failure ?? learned.sourceInitialization ?? input.report.learnedStatus,
    })
  }

  const missing: string[] = []
  for (const category of REAL_REFERENCE_EVIDENCE_CATEGORIES) {
    const count = categoryCounts[category]
    if (count < 2) missing.push(`${category}: ${2 - count} more receipt${2 - count === 1 ? '' : 's'}`)
  }
  const mixedSetComplete = REAL_REFERENCE_EVIDENCE_CATEGORIES.every((category) => categoryCounts[category] >= 2)
  const listeningAssessmentsComplete = listeningCounts['not-assessed'] === 0
  if (!listeningAssessmentsComplete) missing.push(`${listeningCounts['not-assessed']} retrieval/CMA listening assessment${listeningCounts['not-assessed'] === 1 ? '' : 's'} still missing`)
  const learnedListeningAssessmentsComplete = learnedListeningCounts['not-assessed'] === 0
  if (!learnedListeningAssessmentsComplete) missing.push(`${learnedListeningCounts['not-assessed']} learned listening assessment${learnedListeningCounts['not-assessed'] === 1 ? '' : 's'} still missing`)
  const currentThreeWayComplete = learnedInitializationSuccessCount === receipts.length
  if (!currentThreeWayComplete) missing.push(`${receipts.length - learnedInitializationSuccessCount} receipt${receipts.length - learnedInitializationSuccessCount === 1 ? '' : 's'} must be rerun with the admitted learned row`)

  return {
    schema: REAL_REFERENCE_BENCHMARK_AGGREGATE_SCHEMA,
    createdAt: createdAt.toISOString(),
    receiptCount: receipts.length,
    categoryCounts,
    listeningCounts,
    learnedListeningCounts,
    retrievalDistance: metricStats(retrievalDistances, 'retrieval distance'),
    evolutionaryDistance: metricStats(evolutionaryDistances, 'evolutionary distance'),
    learnedDistance: metricStatsOrNull(learnedDistances, 'learned distance'),
    retrievalRuntimeMs: metricStats(retrievalRuntimes, 'retrieval runtime'),
    evolutionaryRuntimeMs: metricStats(evolutionaryRuntimes, 'evolutionary runtime'),
    learnedRuntimeMs: metricStatsOrNull(learnedRuntimes, 'learned runtime'),
    cmaMetricImprovedCount,
    cmaMetricImprovedRate: cmaMetricImprovedCount / receipts.length,
    cmaListeningBetterCount,
    metricImprovedButListeningNotBetterCount,
    learnedInitializationSuccessCount,
    learnedInitializationUnavailableCount,
    learnedInitializationFailedCount,
    closureReadiness: {
      mixedSetComplete,
      listeningAssessmentsComplete,
      learnedListeningAssessmentsComplete,
      currentThreeWayComplete,
      readyForAggregateEvidence: mixedSetComplete && listeningAssessmentsComplete && learnedListeningAssessmentsComplete && currentThreeWayComplete,
      missing,
    },
    receipts,
    note: 'Aggregate contains benchmark metadata, metrics, classifications and structured listening assessments only. Legacy blocked learned receipts remain parseable but cannot satisfy current three-way closure readiness. It does not contain reference audio and does not establish exact patch identity or physical FM-1 equivalence.',
  }
}
