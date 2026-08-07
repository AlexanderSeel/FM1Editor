import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice, type Dx7Voice } from '../domain/voice'
import {
  decodeDx7EvolutionVector,
  dx7EvolutionParameters,
  encodeDx7EvolutionVector,
  refineDx7VoiceWithCmaEs,
} from './dx7CmaEs'

function targetScore(voice: Dx7Voice): number {
  const targets = [72, 48, 31, 19, 8, 4]
  let score = 0
  voice.operators.forEach((operator, index) => {
    const difference = operator.outputLevel - (targets[index] ?? 0)
    score += difference * difference
  })
  score += Math.pow((voice.feedback - 5) * 10, 2)
  return score
}

describe('DX7 constrained evolution vector', () => {
  it('round-trips the default output/feedback group and drops stale raw source bytes when mutated', () => {
    const initial = {
      ...createInitializedVoice('SOURCE TEST'),
      source: { packed: new Uint8Array([1, 2, 3]), unpacked: new Uint8Array([4, 5, 6]) },
    }
    const parameters = dx7EvolutionParameters(['output-feedback'])
    const vector = encodeDx7EvolutionVector(initial, parameters)
    expect(vector).toHaveLength(7)

    const changedVector = vector.slice()
    changedVector[0] = 0.5
    changedVector[6] = 1
    const changed = decodeDx7EvolutionVector(initial, parameters, changedVector)

    expect(changed.operators[0].outputLevel).toBe(50)
    expect(changed.feedback).toBe(7)
    expect(changed.operators[0].frequencyCoarse).toBe(initial.operators[0].frequencyCoarse)
    expect(changed.algorithm).toBe(initial.algorithm)
    expect(changed.source).toBeUndefined()
  })

  it('keeps decoded semantic values within legal field bounds', () => {
    const initial = createInitializedVoice()
    const parameters = dx7EvolutionParameters(['output-feedback', 'operator-frequency'])
    const vector = new Float64Array(parameters.length)
    vector.fill(2)
    const high = decodeDx7EvolutionVector(initial, parameters, vector)
    expect(high.feedback).toBe(7)
    expect(high.operators.every((operator) => operator.outputLevel <= 99 && operator.frequencyCoarse <= 31 && operator.frequencyFine <= 99)).toBe(true)

    vector.fill(-1)
    const low = decodeDx7EvolutionVector(initial, parameters, vector)
    expect(low.feedback).toBe(0)
    expect(low.operators.every((operator) => operator.outputLevel >= 0 && operator.frequencyCoarse >= 0 && operator.frequencyFine >= 0)).toBe(true)
  })
})

describe('seeded separable CMA-ES', () => {
  it('is repeatable for a fixed seed and improves a known constrained semantic target', async () => {
    const initial = createInitializedVoice('CMA')
    const initialScore = targetScore(initial)
    const options = {
      groups: ['output-feedback'] as const,
      seed: 12345,
      sigma: 0.24,
      populationSize: 12,
      maxGenerations: 24,
      targetScore: 0,
    }
    const first = await refineDx7VoiceWithCmaEs(initial, targetScore, options)
    const second = await refineDx7VoiceWithCmaEs(initial, targetScore, options)

    expect(first.bestScore).toBeLessThan(initialScore * 0.2)
    expect(second.bestScore).toBe(first.bestScore)
    expect(second.evaluations).toBe(first.evaluations)
    expect(second.bestVoice).toEqual(first.bestVoice)
    expect(first.parameterCount).toBe(7)
    expect(first.groups).toEqual(['output-feedback'])
  })

  it('reports monotonic best progress and supports cancellation between evaluations', async () => {
    const initial = createInitializedVoice('CANCEL')
    const controller = new AbortController()
    const progressScores: number[] = []
    let evaluations = 0
    const objective = vi.fn(async (voice: Dx7Voice) => {
      evaluations += 1
      if (evaluations === 5) controller.abort()
      return targetScore(voice)
    })

    await expect(refineDx7VoiceWithCmaEs(initial, objective, {
      seed: 99,
      populationSize: 8,
      maxGenerations: 10,
      signal: controller.signal,
      onProgress: (progress) => progressScores.push(progress.bestScore),
    })).rejects.toMatchObject({ name: 'AbortError' })

    expect(objective).toHaveBeenCalledTimes(5)
    for (let index = 1; index < progressScores.length; index += 1) {
      expect(progressScores[index]).toBeLessThanOrEqual(progressScores[index - 1] ?? Number.POSITIVE_INFINITY)
    }
  })

  it('rejects non-finite objectives instead of corrupting optimizer state', async () => {
    await expect(refineDx7VoiceWithCmaEs(createInitializedVoice(), () => Number.NaN, {
      populationSize: 4,
      maxGenerations: 1,
    })).rejects.toThrow(/finite score/)
  })
})
