import { describe, expect, it } from 'vitest'
import {
  aggregateRealReferenceBenchmarkEvidence,
  parseRealReferenceBenchmarkReceipt,
  REAL_REFERENCE_BENCHMARK_AGGREGATE_SCHEMA,
  type RealReferenceEvidenceCategory,
  type RealReferenceListeningAssessment,
} from './realReferenceBenchmarkAggregate'
import {
  REAL_REFERENCE_LEARNED_BLOCK,
  REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA,
  type RealReferenceReconstructionBenchmarkReport,
} from './realReferenceReconstructionBenchmark'

function receipt(
  hashCharacter: string,
  retrievalDistance: number,
  evolutionaryDistance: number,
  retrievalRuntimeMs = 10,
  evolutionaryRuntimeMs = 30,
): RealReferenceReconstructionBenchmarkReport {
  const hash = hashCharacter.repeat(64)
  return {
    schema: REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA,
    createdAt: '2026-08-08T08:00:00.000Z',
    reference: {
      kind: 'real-isolated-sound',
      declaredIsolated: true,
      filename: `${hashCharacter}.wav`,
      mimeType: 'audio/wav',
      contentSha256: hash,
      sampleRate: 48_000,
      durationSeconds: 1,
      selectedRegion: { startSeconds: 0, endSeconds: 1 },
      analysisPitchHz: 220,
      pitchSource: 'detected',
    },
    configuration: {
      catalogCandidateCount: 256,
      requestedMaxVoices: 256,
      rankLimit: 8,
      refinementStarts: 3,
      seed: 2026,
      sampleRate: 48_000,
      probe: { id: 'c4-main', midiNote: 60, velocity: 108, noteOnSeconds: 1, releaseSeconds: 0.5, randomSeed: 42 },
      refinementGroups: ['output-feedback'],
    },
    sharedPreparationMs: 5,
    comparison: {
      schema: 'fm1-editor.reconstruction-comparison.v1',
      createdAt: '2026-08-08T08:00:00.000Z',
      results: [
        {
          caseId: `real:${hash.slice(0, 16)}`,
          caseLabel: `${hashCharacter}.wav`,
          caseKind: 'real-isolated-sound',
          approachId: 'retrieval',
          approachLabel: 'Retrieval only',
          runtimeMs: retrievalRuntimeMs,
          candidateCount: 8,
          bestDistance: retrievalDistance,
          bestCandidateIndex: 0,
          sourceInitialization: 'retrieved',
          metrics: { total: retrievalDistance },
          failure: null,
        },
        {
          caseId: `real:${hash.slice(0, 16)}`,
          caseLabel: `${hashCharacter}.wav`,
          caseKind: 'real-isolated-sound',
          approachId: 'evolutionary',
          approachLabel: 'Seeded constrained CMA-ES',
          runtimeMs: evolutionaryRuntimeMs,
          candidateCount: 3,
          bestDistance: evolutionaryDistance,
          bestCandidateIndex: 0,
          sourceInitialization: 'CMA from retrieved',
          metrics: { total: evolutionaryDistance },
          failure: null,
        },
        {
          caseId: `real:${hash.slice(0, 16)}`,
          caseLabel: `${hashCharacter}.wav`,
          caseKind: 'real-isolated-sound',
          approachId: 'learned-initialization',
          approachLabel: 'Learned initialization',
          runtimeMs: 0.1,
          candidateCount: 0,
          bestDistance: null,
          bestCandidateIndex: null,
          sourceInitialization: null,
          metrics: null,
          failure: REAL_REFERENCE_LEARNED_BLOCK,
        },
      ],
    },
    retrievalVsEvolutionaryDelta: retrievalDistance - evolutionaryDistance,
    learnedStatus: REAL_REFERENCE_LEARNED_BLOCK,
    note: 'test receipt',
  }
}

function item(
  hashCharacter: string,
  category: RealReferenceEvidenceCategory,
  listeningAssessment: RealReferenceListeningAssessment,
  retrievalDistance: number,
  evolutionaryDistance: number,
) {
  return {
    report: receipt(hashCharacter, retrievalDistance, evolutionaryDistance),
    category,
    listeningAssessment,
  } as const
}

describe('real-reference benchmark evidence aggregation', () => {
  it('summarizes a complete mixed 2+2+2 evidence set', () => {
    const aggregate = aggregateRealReferenceBenchmarkEvidence([
      item('a', 'fm-friendly-electronic', 'cma-better', 0.5, 0.3),
      item('b', 'fm-friendly-electronic', 'similar', 0.4, 0.35),
      item('c', 'pitched-acoustic', 'retrieval-better', 0.6, 0.65),
      item('d', 'pitched-acoustic', 'cma-better', 0.8, 0.5),
      item('e', 'difficult-transient-noisy', 'both-poor', 1.2, 1.1),
      item('f', 'difficult-transient-noisy', 'similar', 1.0, 0.9),
    ], new Date('2026-08-08T09:00:00.000Z'))

    expect(aggregate.schema).toBe(REAL_REFERENCE_BENCHMARK_AGGREGATE_SCHEMA)
    expect(aggregate.receiptCount).toBe(6)
    expect(aggregate.categoryCounts).toEqual({
      'fm-friendly-electronic': 2,
      'pitched-acoustic': 2,
      'difficult-transient-noisy': 2,
    })
    expect(aggregate.closureReadiness).toEqual({
      mixedSetComplete: true,
      listeningAssessmentsComplete: true,
      readyForAggregateEvidence: true,
      missing: [],
    })
    expect(aggregate.cmaMetricImprovedCount).toBe(5)
    expect(aggregate.cmaListeningBetterCount).toBe(2)
    expect(aggregate.metricImprovedButListeningNotBetterCount).toBe(3)
    expect(aggregate.learnedInitializationUnavailableCount).toBe(6)
    expect(aggregate.retrievalDistance).toMatchObject({ count: 6, minimum: 0.4, maximum: 1.2 })
    expect(aggregate.evolutionaryDistance).toMatchObject({ count: 6, minimum: 0.3, maximum: 1.1 })
    expect(JSON.stringify(aggregate)).not.toContain('"samples"')
  })

  it('reports missing categories and listening assessments', () => {
    const aggregate = aggregateRealReferenceBenchmarkEvidence([
      item('a', 'fm-friendly-electronic', 'not-assessed', 0.5, 0.3),
      item('b', 'pitched-acoustic', 'similar', 0.6, 0.55),
    ])
    expect(aggregate.closureReadiness.readyForAggregateEvidence).toBe(false)
    expect(aggregate.closureReadiness.missing.join(' ')).toMatch(/difficult-transient-noisy/)
    expect(aggregate.closureReadiness.missing.join(' ')).toMatch(/listening assessment/)
  })

  it('rejects duplicate source hashes', () => {
    const first = item('a', 'fm-friendly-electronic', 'similar', 0.5, 0.4)
    const duplicate = { ...item('b', 'pitched-acoustic', 'similar', 0.6, 0.5), report: receipt('a', 0.6, 0.5) }
    expect(() => aggregateRealReferenceBenchmarkEvidence([first, duplicate])).toThrow(/Duplicate real-reference SHA-256/)
  })

  it('parses only privacy-safe real-reference benchmark receipts', () => {
    expect(parseRealReferenceBenchmarkReceipt(receipt('a', 0.5, 0.4)).reference.filename).toBe('a.wav')
    expect(() => parseRealReferenceBenchmarkReceipt({ schema: 'wrong' })).toThrow(/Unsupported real-reference benchmark receipt schema/)
  })
})
