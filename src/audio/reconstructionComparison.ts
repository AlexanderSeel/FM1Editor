import type { Dx7Voice } from '../domain/voice'

export type ReconstructionApproachId = 'retrieval' | 'evolutionary' | 'learned-initialization'
export type ReconstructionCaseKind = 'synthetic-ground-truth' | 'real-isolated-sound'

export interface ReconstructionComparisonCase<TReference> {
  readonly id: string
  readonly label: string
  readonly kind: ReconstructionCaseKind
  readonly reference: TReference
  /** Present only when exact semantic ground truth exists, e.g. repository-owned synthetic fixtures. */
  readonly groundTruthVoice?: Dx7Voice
}

export interface ReconstructionCandidate {
  readonly voice: Dx7Voice
  readonly sourceInitialization: string
}

export interface ReconstructionApproach<TReference> {
  readonly id: ReconstructionApproachId
  readonly label: string
  run(testCase: ReconstructionComparisonCase<TReference>, signal?: AbortSignal): Promise<readonly ReconstructionCandidate[]>
}

export interface ReconstructionCandidateEvaluation {
  readonly distance: number
  readonly metrics?: Readonly<Record<string, number>>
}

export interface ReconstructionComparisonResult {
  readonly caseId: string
  readonly caseLabel: string
  readonly caseKind: ReconstructionCaseKind
  readonly approachId: ReconstructionApproachId
  readonly approachLabel: string
  readonly runtimeMs: number
  readonly candidateCount: number
  readonly bestDistance: number | null
  readonly bestCandidateIndex: number | null
  readonly sourceInitialization: string | null
  readonly metrics: Readonly<Record<string, number>> | null
  readonly failure: string | null
}

export interface ReconstructionComparisonReport {
  readonly schema: 'fm1-editor.reconstruction-comparison.v1'
  readonly createdAt: string
  readonly results: readonly ReconstructionComparisonResult[]
}

export interface ReconstructionComparisonOptions<TReference> {
  readonly evaluateCandidate: (
    testCase: ReconstructionComparisonCase<TReference>,
    candidate: ReconstructionCandidate,
    signal?: AbortSignal,
  ) => Promise<ReconstructionCandidateEvaluation>
  readonly signal?: AbortSignal
  readonly now?: () => number
  readonly createdAt?: () => Date
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Reconstruction comparison was cancelled.', 'AbortError')
}

function failureMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

export async function compareReconstructionApproaches<TReference>(
  cases: readonly ReconstructionComparisonCase<TReference>[],
  approaches: readonly ReconstructionApproach<TReference>[],
  options: ReconstructionComparisonOptions<TReference>,
): Promise<ReconstructionComparisonReport> {
  const now = options.now ?? (() => performance.now())
  const results: ReconstructionComparisonResult[] = []

  for (const testCase of cases) {
    for (const approach of approaches) {
      throwIfAborted(options.signal)
      const startedAt = now()
      try {
        const candidates = await approach.run(testCase, options.signal)
        throwIfAborted(options.signal)
        let bestDistance = Number.POSITIVE_INFINITY
        let bestCandidateIndex: number | null = null
        let bestMetrics: Readonly<Record<string, number>> | null = null
        let bestSource: string | null = null

        for (let index = 0; index < candidates.length; index += 1) {
          throwIfAborted(options.signal)
          const candidate = candidates[index]
          if (!candidate) continue
          const evaluation = await options.evaluateCandidate(testCase, candidate, options.signal)
          if (!Number.isFinite(evaluation.distance) || evaluation.distance < 0) {
            throw new RangeError(`${approach.label} returned a candidate with invalid comparison distance ${evaluation.distance}.`)
          }
          if (evaluation.distance < bestDistance) {
            bestDistance = evaluation.distance
            bestCandidateIndex = index
            bestMetrics = evaluation.metrics ?? null
            bestSource = candidate.sourceInitialization
          }
        }

        results.push({
          caseId: testCase.id,
          caseLabel: testCase.label,
          caseKind: testCase.kind,
          approachId: approach.id,
          approachLabel: approach.label,
          runtimeMs: Math.max(0, now() - startedAt),
          candidateCount: candidates.length,
          bestDistance: bestCandidateIndex === null ? null : bestDistance,
          bestCandidateIndex,
          sourceInitialization: bestSource,
          metrics: bestMetrics,
          failure: candidates.length === 0 ? 'Approach returned no candidates.' : null,
        })
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
        results.push({
          caseId: testCase.id,
          caseLabel: testCase.label,
          caseKind: testCase.kind,
          approachId: approach.id,
          approachLabel: approach.label,
          runtimeMs: Math.max(0, now() - startedAt),
          candidateCount: 0,
          bestDistance: null,
          bestCandidateIndex: null,
          sourceInitialization: null,
          metrics: null,
          failure: failureMessage(cause),
        })
      }
    }
  }

  return {
    schema: 'fm1-editor.reconstruction-comparison.v1',
    createdAt: (options.createdAt ?? (() => new Date()))().toISOString(),
    results,
  }
}
