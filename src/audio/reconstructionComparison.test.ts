import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  compareReconstructionApproaches,
  type ReconstructionApproach,
  type ReconstructionComparisonCase,
} from './reconstructionComparison'

const syntheticCase: ReconstructionComparisonCase<{ target: string }> = {
  id: 'synthetic-1',
  label: 'Synthetic voice 1',
  kind: 'synthetic-ground-truth',
  reference: { target: 'TARGET' },
  groundTruthVoice: createInitializedVoice('TARGET'),
}

function approach(
  id: ReconstructionApproach<{ target: string }>['id'],
  label: string,
  names: readonly string[],
): ReconstructionApproach<{ target: string }> {
  return {
    id,
    label,
    async run() {
      return names.map((name) => ({ voice: createInitializedVoice(name), sourceInitialization: `${label}:${name}` }))
    },
  }
}

describe('compareReconstructionApproaches', () => {
  it('records comparable runtime, best distance, metrics and initialization for each approach', async () => {
    const ticks = [10, 25, 30, 70]
    const report = await compareReconstructionApproaches(
      [syntheticCase],
      [
        approach('retrieval', 'Retrieval', ['FAR', 'NEAR']),
        approach('evolutionary', 'CMA-ES', ['BEST']),
      ],
      {
        now: () => ticks.shift() ?? 70,
        createdAt: () => new Date('2026-08-08T00:00:00.000Z'),
        async evaluateCandidate(_testCase, candidate) {
          const distance = candidate.voice.name === 'BEST' ? 0.05 : candidate.voice.name === 'NEAR' ? 0.2 : 0.8
          return { distance, metrics: { total: distance } }
        },
      },
    )

    expect(report.schema).toBe('fm1-editor.reconstruction-comparison.v1')
    expect(report.createdAt).toBe('2026-08-08T00:00:00.000Z')
    expect(report.results).toEqual([
      expect.objectContaining({ approachId: 'retrieval', runtimeMs: 15, candidateCount: 2, bestDistance: 0.2, bestCandidateIndex: 1, sourceInitialization: 'Retrieval:NEAR', metrics: { total: 0.2 }, failure: null }),
      expect.objectContaining({ approachId: 'evolutionary', runtimeMs: 40, candidateCount: 1, bestDistance: 0.05, bestCandidateIndex: 0, sourceInitialization: 'CMA-ES:BEST', metrics: { total: 0.05 }, failure: null }),
    ])
  })

  it('records empty results and approach failures without hiding them', async () => {
    const failing: ReconstructionApproach<{ target: string }> = {
      id: 'learned-initialization',
      label: 'Learned initializer',
      async run() { throw new Error('checkpoint unavailable') },
    }
    const report = await compareReconstructionApproaches(
      [syntheticCase],
      [approach('retrieval', 'Retrieval', []), failing],
      { now: () => 0, async evaluateCandidate() { return { distance: 0 } } },
    )

    expect(report.results[0]).toMatchObject({ candidateCount: 0, bestDistance: null, failure: 'Approach returned no candidates.' })
    expect(report.results[1]).toMatchObject({ approachId: 'learned-initialization', candidateCount: 0, failure: 'checkpoint unavailable' })
  })

  it('rejects invalid metric distances and remains cancellable', async () => {
    const report = await compareReconstructionApproaches(
      [syntheticCase],
      [approach('retrieval', 'Retrieval', ['INVALID'])],
      { now: () => 0, async evaluateCandidate() { return { distance: Number.NaN } } },
    )
    expect(report.results[0]?.failure).toContain('invalid comparison distance')

    const controller = new AbortController()
    controller.abort()
    await expect(compareReconstructionApproaches(
      [syntheticCase],
      [approach('retrieval', 'Retrieval', ['A'])],
      { signal: controller.signal, async evaluateCandidate() { return { distance: 1 } } },
    )).rejects.toMatchObject({ name: 'AbortError' })
  })
})
