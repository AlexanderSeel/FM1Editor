import type { Dx7Voice } from '../domain/voice'
import { applySpiegelibSimpleFmPrediction } from './spiegelibSimpleFmInitializer'
import { inferSpiegelibSimpleFmFromStandardizedMfcc } from './spiegelibSimpleFmModel'
import { extractAndStandardizeSpiegelibSimpleFmMfcc } from './spiegelibSimpleFmScaler'
import { getSpiegelibSimpleFmScaler } from './spiegelibSimpleFmScalerData'

export const SPIEGELIB_SIMPLE_FM_ADMITTED_CANDIDATE_ID = 'spiegelib-simple-fm-mlp-librosa-0.7.2' as const
export const SPIEGELIB_SIMPLE_FM_ADMITTED_CANDIDATE_LABEL = 'SpiegeLib simple-FM MLP · Librosa 0.7.2' as const

export interface SpiegelibSimpleFmCandidate072 {
  readonly voice: Dx7Voice
  readonly normalizedPrediction: readonly number[]
  readonly standardizedFeatureCount: 572
  readonly source: typeof SPIEGELIB_SIMPLE_FM_ADMITTED_CANDIDATE_LABEL
  readonly limitations: readonly string[]
}

export function createSpiegelibSimpleFmCandidate072(
  samples: Float32Array,
  sampleRate: number,
  voiceName = 'SPGL MLP',
): SpiegelibSimpleFmCandidate072 {
  const standardized = extractAndStandardizeSpiegelibSimpleFmMfcc(
    samples,
    sampleRate,
    getSpiegelibSimpleFmScaler(),
  )
  const prediction = inferSpiegelibSimpleFmFromStandardizedMfcc(standardized)
  return {
    voice: applySpiegelibSimpleFmPrediction(prediction, voiceName),
    normalizedPrediction: Array.from(prediction, (value) => Number(value)),
    standardizedFeatureCount: 572,
    source: SPIEGELIB_SIMPLE_FM_ADMITTED_CANDIDATE_LABEL,
    limitations: [
      'Predicts nine historical Dexed OP2 controls only; all other DX7 semantic fields use the pinned simple-FM training base.',
      'Uses the Python 3.7.7 + Librosa 0.7.2-compatible MFCC path validated against the independent 572-value oracle, not the editor general-purpose descriptor MFCC implementation.',
      'Uses the first one second after deterministic 44.1 kHz resampling or zero-padding.',
      'A learned reconstruction candidate is a similarity initialization, not proof of original patch identity or physical FM-1 equivalence.',
    ],
  }
}
