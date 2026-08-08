import modelData from './data/spiegelib-simple-fm-mlp.json'
import {
  runSpiegelibSimpleFmMlp,
  validateSpiegelibSimpleFmMlpModel,
  type SpiegelibSimpleFmMlpModel,
} from './spiegelibSimpleFmMlp'

let cachedModel: SpiegelibSimpleFmMlpModel | null = null

export function getSpiegelibSimpleFmMlpModel(): SpiegelibSimpleFmMlpModel {
  if (cachedModel) return cachedModel
  const candidate: unknown = modelData
  validateSpiegelibSimpleFmMlpModel(candidate)
  cachedModel = candidate
  return cachedModel
}

export function inferSpiegelibSimpleFmFromStandardizedMfcc(
  standardizedFeatures: ArrayLike<number>,
): Float32Array {
  return runSpiegelibSimpleFmMlp(getSpiegelibSimpleFmMlpModel(), standardizedFeatures)
}
