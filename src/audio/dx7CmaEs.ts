import type { Dx7Operator, Dx7Voice } from '../domain/voice'

export const DX7_CMA_ES_SCHEMA = 'fm1-editor.dx7-cma-es.v1' as const
export const DX7_CMA_ES_DEFAULT_GROUP = 'output-feedback' as const

export type Dx7EvolutionParameterGroup =
  | 'output-feedback'
  | 'operator-frequency'
  | 'operator-envelope'

export interface Dx7EvolutionParameter {
  readonly id: string
  readonly minimum: number
  readonly maximum: number
  readonly integer: boolean
  read(voice: Dx7Voice): number
  write(voice: Dx7Voice, value: number): Dx7Voice
}

export interface Dx7CmaEsEvaluationContext {
  readonly generation: number
  readonly candidateIndex: number
  readonly evaluation: number
  readonly signal?: AbortSignal
}

export type Dx7CmaEsObjective = (
  voice: Dx7Voice,
  context: Dx7CmaEsEvaluationContext,
) => number | Promise<number>

export interface Dx7CmaEsOptions {
  readonly groups?: readonly Dx7EvolutionParameterGroup[]
  readonly seed?: number
  readonly sigma?: number
  readonly populationSize?: number
  readonly maxGenerations?: number
  readonly targetScore?: number
  readonly signal?: AbortSignal
  readonly onProgress?: (progress: Dx7CmaEsProgress) => void
}

export interface Dx7CmaEsProgress {
  readonly schema: typeof DX7_CMA_ES_SCHEMA
  readonly generation: number
  readonly evaluations: number
  readonly bestScore: number
  readonly bestVoice: Dx7Voice
  readonly sigma: number
  readonly parameterCount: number
}

export interface Dx7CmaEsResult extends Dx7CmaEsProgress {
  readonly seed: number
  readonly generationsCompleted: number
  readonly stopReason: 'target' | 'generations'
  readonly groups: readonly Dx7EvolutionParameterGroup[]
}

interface EvaluatedCandidate {
  readonly vector: Float64Array
  readonly normalizedStep: Float64Array
  readonly voice: Dx7Voice
  readonly score: number
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('DX7 CMA-ES refinement was cancelled.', 'AbortError')
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function replaceOperator(voice: Dx7Voice, index: number, operator: Dx7Operator): Dx7Voice {
  const operators = [...voice.operators] as [Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator]
  operators[index] = operator
  const { source: _source, ...semantic } = voice
  return { ...semantic, operators }
}

function semanticVoice(voice: Dx7Voice, patch: Partial<Omit<Dx7Voice, 'operators' | 'source'>>): Dx7Voice {
  const { source: _source, ...semantic } = voice
  return { ...semantic, ...patch }
}

function outputLevelParameter(operatorIndex: number): Dx7EvolutionParameter {
  return {
    id: `op${operatorIndex + 1}.outputLevel`, minimum: 0, maximum: 99, integer: true,
    read: (voice) => voice.operators[operatorIndex]?.outputLevel ?? 0,
    write: (voice, value) => {
      const operator = voice.operators[operatorIndex]
      if (!operator) throw new Error(`Missing DX7 operator ${operatorIndex + 1}`)
      return replaceOperator(voice, operatorIndex, { ...operator, outputLevel: value })
    },
  }
}

function frequencyParameter(operatorIndex: number, field: 'frequencyCoarse' | 'frequencyFine'): Dx7EvolutionParameter {
  const maximum = field === 'frequencyCoarse' ? 31 : 99
  return {
    id: `op${operatorIndex + 1}.${field}`, minimum: 0, maximum, integer: true,
    read: (voice) => voice.operators[operatorIndex]?.[field] ?? 0,
    write: (voice, value) => {
      const operator = voice.operators[operatorIndex]
      if (!operator) throw new Error(`Missing DX7 operator ${operatorIndex + 1}`)
      return replaceOperator(voice, operatorIndex, { ...operator, [field]: value })
    },
  }
}

function envelopeParameter(operatorIndex: number, kind: 'rates' | 'levels', point: number): Dx7EvolutionParameter {
  return {
    id: `op${operatorIndex + 1}.envelope.${kind}[${point}]`, minimum: 0, maximum: 99, integer: true,
    read: (voice) => voice.operators[operatorIndex]?.envelope[kind][point] ?? 0,
    write: (voice, value) => {
      const operator = voice.operators[operatorIndex]
      if (!operator) throw new Error(`Missing DX7 operator ${operatorIndex + 1}`)
      const values = [...operator.envelope[kind]] as [number, number, number, number]
      values[point] = value
      return replaceOperator(voice, operatorIndex, {
        ...operator,
        envelope: { ...operator.envelope, [kind]: values },
      })
    },
  }
}

export function dx7EvolutionParameters(
  groups: readonly Dx7EvolutionParameterGroup[] = [DX7_CMA_ES_DEFAULT_GROUP],
): readonly Dx7EvolutionParameter[] {
  const unique = [...new Set(groups)]
  const parameters: Dx7EvolutionParameter[] = []
  for (const group of unique) {
    if (group === 'output-feedback') {
      for (let operator = 0; operator < 6; operator += 1) parameters.push(outputLevelParameter(operator))
      parameters.push({
        id: 'feedback', minimum: 0, maximum: 7, integer: true,
        read: (voice) => voice.feedback,
        write: (voice, value) => semanticVoice(voice, { feedback: value }),
      })
      continue
    }
    if (group === 'operator-frequency') {
      for (let operator = 0; operator < 6; operator += 1) {
        parameters.push(frequencyParameter(operator, 'frequencyCoarse'))
        parameters.push(frequencyParameter(operator, 'frequencyFine'))
      }
      continue
    }
    if (group === 'operator-envelope') {
      for (let operator = 0; operator < 6; operator += 1) {
        for (const kind of ['rates', 'levels'] as const) {
          for (let point = 0; point < 4; point += 1) parameters.push(envelopeParameter(operator, kind, point))
        }
      }
      continue
    }
    const unreachable: never = group
    throw new Error(`Unsupported DX7 evolution group: ${String(unreachable)}`)
  }
  if (parameters.length === 0) throw new Error('DX7 CMA-ES requires at least one semantic parameter.')
  return parameters
}

export function encodeDx7EvolutionVector(voice: Dx7Voice, parameters: readonly Dx7EvolutionParameter[]): Float64Array {
  return Float64Array.from(parameters, (parameter) => {
    const span = parameter.maximum - parameter.minimum
    if (!(span > 0)) throw new Error(`Invalid evolution parameter span for ${parameter.id}`)
    return clamp((parameter.read(voice) - parameter.minimum) / span, 0, 1)
  })
}

export function decodeDx7EvolutionVector(
  baseVoice: Dx7Voice,
  parameters: readonly Dx7EvolutionParameter[],
  vector: ArrayLike<number>,
): Dx7Voice {
  if (vector.length !== parameters.length) throw new RangeError('DX7 evolution vector length does not match its parameter definition.')
  let voice = baseVoice
  for (let index = 0; index < parameters.length; index += 1) {
    const parameter = parameters[index]
    if (!parameter) continue
    const normalized = clamp(Number(vector[index] ?? 0), 0, 1)
    const raw = parameter.minimum + normalized * (parameter.maximum - parameter.minimum)
    const value = parameter.integer ? Math.round(raw) : raw
    voice = parameter.write(voice, clamp(value, parameter.minimum, parameter.maximum))
  }
  return voice
}

class SeededNormalRandom {
  private state: number
  private spare: number | null = null
  constructor(seed: number) { this.state = seed >>> 0 }
  private uniform(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0
    let value = this.state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
  normal(): number {
    if (this.spare !== null) { const value = this.spare; this.spare = null; return value }
    let u = 0
    let v = 0
    while (u <= Number.EPSILON) u = this.uniform()
    while (v <= Number.EPSILON) v = this.uniform()
    const magnitude = Math.sqrt(-2 * Math.log(u))
    const angle = 2 * Math.PI * v
    this.spare = magnitude * Math.sin(angle)
    return magnitude * Math.cos(angle)
  }
}

function validatePositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${label} must be a positive integer.`)
  return value
}

export async function refineDx7VoiceWithCmaEs(
  initialVoice: Dx7Voice,
  objective: Dx7CmaEsObjective,
  options: Dx7CmaEsOptions = {},
): Promise<Dx7CmaEsResult> {
  throwIfAborted(options.signal)
  const groups = options.groups?.length ? [...new Set(options.groups)] : [DX7_CMA_ES_DEFAULT_GROUP]
  const parameters = dx7EvolutionParameters(groups)
  const dimensions = parameters.length
  const seed = (options.seed ?? 42) >>> 0
  let sigma = options.sigma ?? 0.18
  if (!Number.isFinite(sigma) || sigma <= 0 || sigma > 1) throw new RangeError('sigma must be greater than 0 and no more than 1.')
  const populationSize = validatePositiveInteger(options.populationSize ?? (4 + Math.floor(3 * Math.log(dimensions))), 'populationSize')
  if (populationSize < 2) throw new RangeError('populationSize must be at least 2.')
  const parentCount = Math.max(1, Math.floor(populationSize / 2))
  const maxGenerations = validatePositiveInteger(options.maxGenerations ?? 40, 'maxGenerations')
  const targetScore = options.targetScore ?? 0
  if (!Number.isFinite(targetScore)) throw new RangeError('targetScore must be finite.')

  const rawWeights = Array.from({ length: parentCount }, (_, index) => Math.log(parentCount + 0.5) - Math.log(index + 1))
  const weightSum = rawWeights.reduce((sum, value) => sum + value, 0)
  const weights = rawWeights.map((value) => value / weightSum)
  const muEff = 1 / weights.reduce((sum, value) => sum + value * value, 0)
  const cc = (4 + muEff / dimensions) / (dimensions + 4 + 2 * muEff / dimensions)
  const cs = (muEff + 2) / (dimensions + muEff + 5)
  const c1 = 2 / (Math.pow(dimensions + 1.3, 2) + muEff)
  const cmu = Math.min(1 - c1, 2 * (muEff - 2 + 1 / muEff) / (Math.pow(dimensions + 2, 2) + muEff))
  const damping = 1 + 2 * Math.max(0, Math.sqrt((muEff - 1) / (dimensions + 1)) - 1) + cs
  const chiN = Math.sqrt(dimensions) * (1 - 1 / (4 * dimensions) + 1 / (21 * dimensions * dimensions))

  let mean = encodeDx7EvolutionVector(initialVoice, parameters)
  const diagonal = new Float64Array(dimensions).fill(1)
  const pathC = new Float64Array(dimensions)
  const pathSigma = new Float64Array(dimensions)
  const random = new SeededNormalRandom(seed)
  let bestVoice = decodeDx7EvolutionVector(initialVoice, parameters, mean)
  let bestScore = Number.POSITIVE_INFINITY
  let evaluations = 0

  for (let generation = 0; generation < maxGenerations; generation += 1) {
    throwIfAborted(options.signal)
    const oldMean = mean.slice()
    const candidates: EvaluatedCandidate[] = []
    for (let candidateIndex = 0; candidateIndex < populationSize; candidateIndex += 1) {
      throwIfAborted(options.signal)
      const vector = new Float64Array(dimensions)
      const normalizedStep = new Float64Array(dimensions)
      for (let dimension = 0; dimension < dimensions; dimension += 1) {
        const z = random.normal()
        const step = Math.sqrt(Math.max(1e-12, diagonal[dimension] ?? 1)) * z
        normalizedStep[dimension] = step
        vector[dimension] = clamp((oldMean[dimension] ?? 0.5) + sigma * step, 0, 1)
      }
      const voice = decodeDx7EvolutionVector(initialVoice, parameters, vector)
      const score = await objective(voice, {
        generation,
        candidateIndex,
        evaluation: evaluations,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      })
      evaluations += 1
      if (!Number.isFinite(score)) throw new Error('DX7 CMA-ES objective must return a finite score.')
      candidates.push({ vector, normalizedStep, voice, score })
      if (score < bestScore) { bestScore = score; bestVoice = voice }
    }
    candidates.sort((left, right) => left.score - right.score)

    mean = new Float64Array(dimensions)
    const weightedStep = new Float64Array(dimensions)
    for (let parent = 0; parent < parentCount; parent += 1) {
      const candidate = candidates[parent]
      const weight = weights[parent] ?? 0
      if (!candidate) continue
      for (let dimension = 0; dimension < dimensions; dimension += 1) {
        mean[dimension] = (mean[dimension] ?? 0) + weight * (candidate.vector[dimension] ?? 0)
        weightedStep[dimension] = (weightedStep[dimension] ?? 0) + weight * ((candidate.vector[dimension] ?? 0) - (oldMean[dimension] ?? 0)) / sigma
      }
    }

    let pathSigmaNormSquared = 0
    for (let dimension = 0; dimension < dimensions; dimension += 1) {
      const inverseStd = 1 / Math.sqrt(Math.max(1e-12, diagonal[dimension] ?? 1))
      pathSigma[dimension] = (1 - cs) * (pathSigma[dimension] ?? 0)
        + Math.sqrt(cs * (2 - cs) * muEff) * (weightedStep[dimension] ?? 0) * inverseStd
      pathSigmaNormSquared += Math.pow(pathSigma[dimension] ?? 0, 2)
    }
    const pathSigmaNorm = Math.sqrt(pathSigmaNormSquared)
    const generationFactor = Math.sqrt(1 - Math.pow(1 - cs, 2 * (generation + 1)))
    const hSigma = pathSigmaNorm / Math.max(1e-12, generationFactor) / chiN < (1.4 + 2 / (dimensions + 1)) ? 1 : 0

    for (let dimension = 0; dimension < dimensions; dimension += 1) {
      pathC[dimension] = (1 - cc) * (pathC[dimension] ?? 0)
        + hSigma * Math.sqrt(cc * (2 - cc) * muEff) * (weightedStep[dimension] ?? 0)
      let rankMu = 0
      for (let parent = 0; parent < parentCount; parent += 1) {
        const candidate = candidates[parent]
        const weight = weights[parent] ?? 0
        if (!candidate) continue
        const y = ((candidate.vector[dimension] ?? 0) - (oldMean[dimension] ?? 0)) / sigma
        rankMu += weight * y * y
      }
      const current = diagonal[dimension] ?? 1
      diagonal[dimension] = Math.max(1e-12,
        (1 - c1 - cmu) * current
        + c1 * (Math.pow(pathC[dimension] ?? 0, 2) + (1 - hSigma) * cc * (2 - cc) * current)
        + cmu * rankMu,
      )
    }
    sigma = clamp(sigma * Math.exp((cs / damping) * (pathSigmaNorm / chiN - 1)), 1e-4, 1)

    const progress: Dx7CmaEsProgress = {
      schema: DX7_CMA_ES_SCHEMA,
      generation: generation + 1,
      evaluations,
      bestScore,
      bestVoice,
      sigma,
      parameterCount: dimensions,
    }
    options.onProgress?.(progress)
    if (bestScore <= targetScore) {
      return { ...progress, seed, generationsCompleted: generation + 1, stopReason: 'target', groups }
    }
  }

  return {
    schema: DX7_CMA_ES_SCHEMA,
    generation: maxGenerations,
    evaluations,
    bestScore,
    bestVoice,
    sigma,
    parameterCount: dimensions,
    seed,
    generationsCompleted: maxGenerations,
    stopReason: 'generations',
    groups,
  }
}
