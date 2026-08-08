import type { Dx7Voice } from '../domain/voice'
import { applySpiegelibSimpleFmPrediction } from './spiegelibSimpleFmInitializer'
import { inferSpiegelibSimpleFmFromStandardizedMfcc } from './spiegelibSimpleFmModel'
import { extractAndStandardizeSpiegelibSimpleFmMfcc } from './spiegelibSimpleFmScaler'
import { getSpiegelibSimpleFmScaler } from './spiegelibSimpleFmScalerData'

export const SPIEGELIB_SIMPLE_FM_CANDIDATE_ID = 'spiegelib-simple-fm-mlp' as const
export const SPIEGELIB_SIMPLE_FM_CANDIDATE_LABEL = 'SpiegeLib simple-FM MLP' as const

export interface SpiegelibSimpleFmCandidate {
  readonly voice: Dx7Voice
  readonly normalizedPrediction: readonly number[]
  readonly standardizedFeatureCount: 572
  readonly source: typeof SPIEGELIB_SIMPLE_FM_CANDIDATE_LABEL
  readonly limitations: readonly string[]
}

export function createSpiegelibSimpleFmCandidate(
  samples: Float32Array,
  sampleRate: number,
  voiceName = 'SPGL MLP',
): SpiegelibSimpleFmCandidate {
  const standardized = extractAndStandardizeSpiegelibSimpleFmMfcc(
    samples,
    sampleRate,
    getSpiegelibSimpleFmScaler(),
  )
  const prediction = inferSpiegelibSimpleFmFromStandardizedMfcc(standardized)
  const normalizedPrediction = Array.from(prediction, (value) => Number(value))
  return {
    voice: applySpiegelibSimpleFmPrediction(prediction, voiceName),
    normalizedPrediction,
    standardizedFeatureCount: 572,
    source: SPIEGELIB_SIMPLE_FM_CANDIDATE_LABEL,
    limitations: [
      'Predicts nine historical Dexed OP2 controls only; all other DX7 semantic fields use the pinned simple-FM training base.',
      'Uses the first one second after deterministic 44.1 kHz resampling or zero-padding.',
      'A learned reconstruction candidate is a similarity initialization, not proof of original patch identity or physical FM-1 equivalence.',
    ],
  }
}
