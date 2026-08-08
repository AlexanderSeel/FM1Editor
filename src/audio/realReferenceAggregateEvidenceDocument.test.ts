import { describe, expect, it } from 'vitest'
import type { RealReferenceBenchmarkAggregate } from './realReferenceBenchmarkAggregate'
import {
  buildRealReferenceAggregateEvidenceMarkdown,
  createRealReferenceAggregateEvidenceMarkdown,
  serializeRealReferenceBenchmarkAggregate,
  sha256Utf8,
} from './realReferenceAggregateEvidenceDocument'

function aggregate(ready = true): RealReferenceBenchmarkAggregate {
  return {
    schema: 'fm1-editor.real-reference-benchmark-aggregate.v1',
    createdAt: '2026-08-08T12:00:00.000Z',
    receiptCount: 6,
    categoryCounts: {
      'fm-friendly-electronic': 2,
      'pitched-acoustic': 2,
      'difficult-transient-noisy': 2,
    },
    listeningCounts: {
      'cma-better': 2,
      'retrieval-better': 1,
      similar: 2,
      'both-poor': 1,
      'not-assessed': 0,
    },
    learnedListeningCounts: {
      'learned-better': 1,
      'learned-similar': 2,
      'learned-worse': 2,
      'learned-poor': 1,
      'not-assessed': 0,
      unavailable: 0,
    },
    retrievalDistance: { count: 6, minimum: 0.4, median: 0.7, maximum: 1.2 },
    evolutionaryDistance: { count: 6, minimum: 0.3, median: 0.5, maximum: 1.1 },
    learnedDistance: { count: 6, minimum: 0.31, median: 0.58, maximum: 1.4 },
    retrievalRuntimeMs: { count: 6, minimum: 10, median: 12, maximum: 15 },
    evolutionaryRuntimeMs: { count: 6, minimum: 30, median: 35, maximum: 42 },
    learnedRuntimeMs: { count: 6, minimum: 4, median: 5, maximum: 7 },
    cmaMetricImprovedCount: 5,
    cmaMetricImprovedRate: 5 / 6,
    cmaListeningBetterCount: 2,
    metricImprovedButListeningNotBetterCount: 3,
    learnedInitializationSuccessCount: ready ? 6 : 5,
    learnedInitializationUnavailableCount: ready ? 0 : 1,
    learnedInitializationFailedCount: 0,
    auditionEvidenceReceiptCount: ready ? 6 : 5,
    closureReadiness: {
      mixedSetComplete: true,
      listeningAssessmentsComplete: true,
      learnedListeningAssessmentsComplete: true,
      currentThreeWayComplete: ready,
      auditionEvidenceComplete: ready,
      readyForAggregateEvidence: ready,
      missing: ready ? [] : ['1 receipt must be rerun with the admitted learned row'],
    },
    receipts: Array.from({ length: 6 }, (_, index) => ({
      referenceSha256: String(index + 1).repeat(64),
      filename: `reference-${index + 1}.wav`,
      category: index < 2 ? 'fm-friendly-electronic' as const : index < 4 ? 'pitched-acoustic' as const : 'difficult-transient-noisy' as const,
      listeningAssessment: index % 3 === 0 ? 'cma-better' as const : 'similar' as const,
      learnedListeningAssessment: index === 0 ? 'learned-better' as const : index === 5 ? 'learned-poor' as const : 'learned-similar' as const,
      notes: index === 0 ? 'closer attack | stable pitch' : null,
      retrievalDistance: 0.5 + index * 0.1,
      evolutionaryDistance: 0.4 + index * 0.08,
      learnedDistance: ready || index < 5 ? 0.45 + index * 0.09 : null,
      retrievalRuntimeMs: 10 + index,
      evolutionaryRuntimeMs: 30 + index,
      learnedRuntimeMs: ready || index < 5 ? 4 + index * 0.2 : null,
      retrievalVsEvolutionaryDelta: 0.1,
      learnedStatus: ready || index < 5 ? 'SpiegeLib simple-FM MLP' : 'legacy unavailable',
      auditionEvidenceComplete: ready || index < 5,
    })),
    note: 'test aggregate without raw samples',
  }
}

describe('real-reference aggregate evidence document', () => {
  it('hashes UTF-8 with standard SHA-256 semantics', async () => {
    expect(await sha256Utf8('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('hashes the exact same JSON serialization that is exported', async () => {
    const value = aggregate()
    const output = await createRealReferenceAggregateEvidenceMarkdown(value)
    expect(output.aggregateJson).toBe(serializeRealReferenceBenchmarkAggregate(value))
    expect(output.aggregateSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(output.markdown).toContain(`Aggregate JSON SHA-256: \`${output.aggregateSha256}\``)
    expect(output.markdown).toContain('| SpiegeLib learned initialization |')
    expect(output.markdown).toContain('reference-1.wav')
    expect(output.markdown).toContain('learned-better')
    expect(output.markdown).toContain('Reproducible exact-winner audition receipts: **6/6**')
    expect(output.markdown).toContain('| yes |')
    expect(output.markdown).not.toContain('"samples"')
    expect(output.markdown).toContain('closer attack \\| stable pitch')
  })

  it('refuses to create closure markdown from an incomplete aggregate', () => {
    expect(() => buildRealReferenceAggregateEvidenceMarkdown(aggregate(false), 'a'.repeat(64))).toThrow(/not closure-ready/)
  })

  it('rejects malformed aggregate hashes', () => {
    expect(() => buildRealReferenceAggregateEvidenceMarkdown(aggregate(), 'abc')).toThrow(/64 hexadecimal/)
  })
})
