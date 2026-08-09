import { createInitializedVoice } from '../domain/voice'
import { describe, expect, it } from 'vitest'
import {
  aggregateRealReferenceBenchmarkEvidence,
  parseRealReferenceBenchmarkReceipt,
  REAL_REFERENCE_BENCHMARK_AGGREGATE_SCHEMA,
  type RealReferenceEvidenceCategory,
  type RealReferenceLearnedListeningAssessment,
  type RealReferenceListeningAssessment,
} from './realReferenceBenchmarkAggregate'
import {
  REAL_REFERENCE_LEARNED_BLOCK,
  REAL_REFERENCE_LEARNED_STATUS,
  REAL_REFERENCE_RECONSTRUCTION_BENCHMARK_SCHEMA,
  type RealReferenceReconstructionBenchmarkReport,
} from './realReferenceReconstructionBenchmark'

function receipt(
  hashCharacter: string,
  retrievalDistance: number,
  evolutionaryDistance: number,
  retrievalRuntimeMs = 10,
  evolutionaryRuntimeMs = 30,
  learned?: { readonly distance: number; readonly runtimeMs?: number },
  includeAudition = learned !== undefined,
): RealReferenceReconstructionBenchmarkReport {
  const hash = hashCharacter.repeat(64)
  const retrievalVoice = createInitializedVoice('RETR WIN')
  const evolutionaryVoice = createInitializedVoice('CMA WIN')
  const learnedVoice = createInitializedVoice('MLP WIN')
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
        learned ? {
          caseId: `real:${hash.slice(0, 16)}`,
          caseLabel: `${hashCharacter}.wav`,
          caseKind: 'real-isolated-sound',
          approachId: 'learned-initialization',
          approachLabel: 'SpiegeLib learned initialization',
          runtimeMs: learned.runtimeMs ?? 4,
          candidateCount: 1,
          bestDistance: learned.distance,
          bestCandidateIndex: 0,
          sourceInitialization: 'SpiegeLib simple-FM MLP · nine OP2 controls + fixed training base',
          metrics: { total: learned.distance },
          failure: null,
        } : {
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
    ...(includeAudition && learned ? { auditionCandidates: [
      { approachId: 'retrieval' as const, sourceInitialization: 'retrieved', distance: retrievalDistance, voice: retrievalVoice },
      { approachId: 'evolutionary' as const, sourceInitialization: 'CMA from retrieved', distance: evolutionaryDistance, voice: evolutionaryVoice },
      { approachId: 'learned-initialization' as const, sourceInitialization: 'SpiegeLib simple-FM MLP · nine OP2 controls + fixed training base', distance: learned.distance, voice: learnedVoice },
    ] } : {}),
    learnedStatus: learned ? REAL_REFERENCE_LEARNED_STATUS : REAL_REFERENCE_LEARNED_BLOCK,
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
    learnedListeningAssessment: 'unavailable' as const,
    receiptSha256: hashCharacter.repeat(64),
  }
}

function currentItem(
  hashCharacter: string,
  category: RealReferenceEvidenceCategory,
  listeningAssessment: RealReferenceListeningAssessment,
  learnedListeningAssessment: RealReferenceLearnedListeningAssessment,
  retrievalDistance: number,
  evolutionaryDistance: number,
  learnedDistance: number,
) {
  return {
    report: receipt(hashCharacter, retrievalDistance, evolutionaryDistance, 10, 30, { distance: learnedDistance, runtimeMs: 4 }),
    category,
    listeningAssessment,
    learnedListeningAssessment,
    receiptSha256: hashCharacter.repeat(64),
  }
}

describe('real-reference benchmark evidence aggregation', () => {
  it('preserves legacy 2+2+2 receipts but does not treat them as current three-way closure evidence', () => {
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
    expect(aggregate.closureReadiness).toMatchObject({
      mixedSetComplete: true,
      listeningAssessmentsComplete: true,
      learnedListeningAssessmentsComplete: true,
      currentThreeWayComplete: false,
      auditionEvidenceComplete: false,
      receiptIntegrityComplete: true,
      readyForAggregateEvidence: false,
    })
    expect(aggregate.closureReadiness.missing.join(' ')).toMatch(/rerun with the admitted learned row/)
    expect(aggregate.cmaMetricImprovedCount).toBe(5)
    expect(aggregate.cmaListeningBetterCount).toBe(2)
    expect(aggregate.metricImprovedButListeningNotBetterCount).toBe(3)
    expect(aggregate.learnedInitializationSuccessCount).toBe(0)
    expect(aggregate.learnedInitializationUnavailableCount).toBe(6)
    expect(aggregate.learnedInitializationFailedCount).toBe(0)
    expect(aggregate.learnedListeningCounts.unavailable).toBe(6)
    expect(aggregate.learnedDistance).toBeNull()
    expect(aggregate.learnedRuntimeMs).toBeNull()
    expect(JSON.stringify(aggregate)).not.toContain('"samples"')
  })

  it('marks a complete current 2+2+2 three-way evidence set ready only after both listening assessments are complete', () => {
    const aggregate = aggregateRealReferenceBenchmarkEvidence([
      currentItem('a', 'fm-friendly-electronic', 'cma-better', 'learned-similar', 0.5, 0.3, 0.4),
      currentItem('b', 'fm-friendly-electronic', 'similar', 'learned-better', 0.4, 0.35, 0.31),
      currentItem('c', 'pitched-acoustic', 'retrieval-better', 'learned-worse', 0.6, 0.65, 0.8),
      currentItem('d', 'pitched-acoustic', 'cma-better', 'learned-similar', 0.8, 0.5, 0.52),
      currentItem('e', 'difficult-transient-noisy', 'both-poor', 'learned-poor', 1.2, 1.1, 1.4),
      currentItem('f', 'difficult-transient-noisy', 'similar', 'learned-worse', 1.0, 0.9, 1.2),
    ])

    expect(aggregate.closureReadiness).toEqual({
      mixedSetComplete: true,
      listeningAssessmentsComplete: true,
      learnedListeningAssessmentsComplete: true,
      currentThreeWayComplete: true,
      auditionEvidenceComplete: true,
      receiptIntegrityComplete: true,
      readyForAggregateEvidence: true,
      missing: [],
    })
    expect(aggregate.learnedInitializationSuccessCount).toBe(6)
    expect(aggregate.learnedInitializationUnavailableCount).toBe(0)
    expect(aggregate.learnedListeningCounts['learned-better']).toBe(1)
    expect(aggregate.learnedListeningCounts['learned-poor']).toBe(1)
    expect(aggregate.learnedDistance).toMatchObject({ count: 6, minimum: 0.31, maximum: 1.4 })
    expect(aggregate.learnedRuntimeMs).toMatchObject({ count: 6, minimum: 4, maximum: 4 })
  })

  it('keeps current exact-winner receipts without retained receipt SHA binding parseable but not closure-ready', () => {
    const current = currentItem('8', 'fm-friendly-electronic', 'similar', 'learned-similar', 0.5, 0.4, 0.45)
    const { receiptSha256: _receiptSha256, ...withoutReceiptHash } = current
    const aggregate = aggregateRealReferenceBenchmarkEvidence([withoutReceiptHash])
    expect(aggregate.closureReadiness.auditionEvidenceComplete).toBe(true)
    expect(aggregate.closureReadiness.receiptIntegrityComplete).toBe(false)
    expect(aggregate.receiptIntegrityCount).toBe(0)
    expect(aggregate.closureReadiness.readyForAggregateEvidence).toBe(false)
    expect(aggregate.closureReadiness.missing.join(' ')).toMatch(/receipt SHA-256 binding/)
  })

  it('keeps successful learned receipts without exact winner voices parseable but not closure-ready', () => {
    const report = receipt('9', 0.5, 0.4, 10, 30, { distance: 0.45 }, false)
    expect(parseRealReferenceBenchmarkReceipt(report).learnedStatus).toBe(REAL_REFERENCE_LEARNED_STATUS)
    const aggregate = aggregateRealReferenceBenchmarkEvidence([{
      report,
      category: 'fm-friendly-electronic',
      listeningAssessment: 'similar',
      learnedListeningAssessment: 'learned-similar',
    }])
    expect(aggregate.closureReadiness.currentThreeWayComplete).toBe(true)
    expect(aggregate.closureReadiness.auditionEvidenceComplete).toBe(false)
    expect(aggregate.closureReadiness.readyForAggregateEvidence).toBe(false)
    expect(aggregate.closureReadiness.missing.join(' ')).toMatch(/exact benchmark winner audition evidence/)
  })

  it('reports missing learned listening assessments on otherwise current receipts', () => {
    const aggregate = aggregateRealReferenceBenchmarkEvidence([
      currentItem('a', 'fm-friendly-electronic', 'similar', 'not-assessed', 0.5, 0.4, 0.45),
      currentItem('b', 'pitched-acoustic', 'similar', 'learned-similar', 0.6, 0.55, 0.58),
    ])
    expect(aggregate.closureReadiness.readyForAggregateEvidence).toBe(false)
    expect(aggregate.closureReadiness.learnedListeningAssessmentsComplete).toBe(false)
    expect(aggregate.closureReadiness.missing.join(' ')).toMatch(/learned listening assessment/)
  })

  it('rejects inconsistent learned listening status for blocked or successful rows', () => {
    expect(() => aggregateRealReferenceBenchmarkEvidence([{
      ...item('a', 'fm-friendly-electronic', 'similar', 0.5, 0.4),
      learnedListeningAssessment: 'learned-better',
    }])).toThrow(/must use the unavailable/)

    expect(() => aggregateRealReferenceBenchmarkEvidence([{
      ...currentItem('b', 'pitched-acoustic', 'similar', 'learned-similar', 0.6, 0.5, 0.45),
      learnedListeningAssessment: 'unavailable',
    }])).toThrow(/successful learned row/)
  })

  it('rejects duplicate source hashes', () => {
    const first = item('a', 'fm-friendly-electronic', 'similar', 0.5, 0.4)
    const duplicate = { ...item('b', 'pitched-acoustic', 'similar', 0.6, 0.5), report: receipt('a', 0.6, 0.5) }
    expect(() => aggregateRealReferenceBenchmarkEvidence([first, duplicate])).toThrow(/Duplicate real-reference SHA-256/)
  })

  it('parses only privacy-safe real-reference benchmark receipts', () => {
    expect(parseRealReferenceBenchmarkReceipt(receipt('a', 0.5, 0.4)).reference.filename).toBe('a.wav')
    expect(parseRealReferenceBenchmarkReceipt(receipt('b', 0.6, 0.5, 10, 20, { distance: 0.4 })).learnedStatus).toBe(REAL_REFERENCE_LEARNED_STATUS)
    expect(() => parseRealReferenceBenchmarkReceipt({ schema: 'wrong' })).toThrow(/Unsupported real-reference benchmark receipt schema/)
  })
})
