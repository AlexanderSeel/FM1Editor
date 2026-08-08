import scalerData from './data/spiegelib-simple-fm-mfcc-scaler.json'
import {
  validateSpiegelibSimpleFmScaler,
  type SpiegelibSimpleFmScaler,
} from './spiegelibSimpleFmScaler'

let cachedScaler: SpiegelibSimpleFmScaler | null = null

export function getSpiegelibSimpleFmScaler(): SpiegelibSimpleFmScaler {
  if (cachedScaler) return cachedScaler
  const candidate: unknown = scalerData
  validateSpiegelibSimpleFmScaler(candidate)
  cachedScaler = candidate
  return cachedScaler
}
