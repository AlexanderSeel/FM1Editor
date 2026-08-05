export type Dx7OperatorNumber = 1 | 2 | 3 | 4 | 5 | 6

export interface Dx7AlgorithmEdge {
  from: Dx7OperatorNumber
  to: Dx7OperatorNumber
  kind: 'modulation' | 'feedback'
}

export interface Dx7AlgorithmDefinition {
  number: number
  carriers: readonly Dx7OperatorNumber[]
  modulators: readonly Dx7OperatorNumber[]
  edges: readonly Dx7AlgorithmEdge[]
  depthByOperator: Readonly<Record<Dx7OperatorNumber, number>>
  maximumDepth: number
}

const OUT_BUS_ADD = 1 << 2
const IN_BUS_ONE = 1 << 4
const IN_BUS_TWO = 1 << 5
const FB_IN = 1 << 6
const FB_OUT = 1 << 7

const EVALUATION_ORDER: readonly Dx7OperatorNumber[] = [6, 5, 4, 3, 2, 1]

/**
 * Operator bus flags from Google's music-synthesizer-for-android FM core,
 * licensed under Apache-2.0. The engine evaluates operators in DX7 packed
 * order (OP6 through OP1). This project derives display topology only; it
 * does not copy or embed the synthesis implementation.
 *
 * Source: app/src/main/jni/fm_core.cc
 */
const ALGORITHM_FLAGS: readonly (readonly number[])[] = [
  [0xc1, 0x11, 0x11, 0x14, 0x01, 0x14],
  [0x01, 0x11, 0x11, 0x14, 0xc1, 0x14],
  [0xc1, 0x11, 0x14, 0x01, 0x11, 0x14],
  [0x41, 0x11, 0x94, 0x01, 0x11, 0x14],
  [0xc1, 0x14, 0x01, 0x14, 0x01, 0x14],
  [0x41, 0x94, 0x01, 0x14, 0x01, 0x14],
  [0xc1, 0x11, 0x05, 0x14, 0x01, 0x14],
  [0x01, 0x11, 0xc5, 0x14, 0x01, 0x14],
  [0x01, 0x11, 0x05, 0x14, 0xc1, 0x14],
  [0x01, 0x05, 0x14, 0xc1, 0x11, 0x14],
  [0xc1, 0x05, 0x14, 0x01, 0x11, 0x14],
  [0x01, 0x05, 0x05, 0x14, 0xc1, 0x14],
  [0xc1, 0x05, 0x05, 0x14, 0x01, 0x14],
  [0xc1, 0x05, 0x11, 0x14, 0x01, 0x14],
  [0x01, 0x05, 0x11, 0x14, 0xc1, 0x14],
  [0xc1, 0x11, 0x02, 0x25, 0x05, 0x14],
  [0x01, 0x11, 0x02, 0x25, 0xc5, 0x14],
  [0x01, 0x11, 0x11, 0xc5, 0x05, 0x14],
  [0xc1, 0x14, 0x14, 0x01, 0x11, 0x14],
  [0x01, 0x05, 0x14, 0xc1, 0x14, 0x14],
  [0x01, 0x14, 0x14, 0xc1, 0x14, 0x14],
  [0xc1, 0x14, 0x14, 0x14, 0x01, 0x14],
  [0xc1, 0x14, 0x14, 0x01, 0x14, 0x04],
  [0xc1, 0x14, 0x14, 0x14, 0x04, 0x04],
  [0xc1, 0x14, 0x14, 0x04, 0x04, 0x04],
  [0xc1, 0x05, 0x14, 0x01, 0x14, 0x04],
  [0x01, 0x05, 0x14, 0xc1, 0x14, 0x04],
  [0x04, 0xc1, 0x11, 0x14, 0x01, 0x14],
  [0xc1, 0x14, 0x01, 0x14, 0x04, 0x04],
  [0x04, 0xc1, 0x11, 0x14, 0x04, 0x04],
  [0xc1, 0x14, 0x04, 0x04, 0x04, 0x04],
  [0xc4, 0x04, 0x04, 0x04, 0x04, 0x04],
]

function uniqueEdges(edges: readonly Dx7AlgorithmEdge[]): Dx7AlgorithmEdge[] {
  const seen = new Set<string>()
  return edges.filter((edge) => {
    const key = `${edge.kind}:${edge.from}:${edge.to}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function calculateDepths(edges: readonly Dx7AlgorithmEdge[], carriers: readonly Dx7OperatorNumber[]) {
  const depths: Record<Dx7OperatorNumber, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  const carrierSet = new Set(carriers)

  for (const operator of EVALUATION_ORDER) {
    if (!carrierSet.has(operator)) depths[operator] = 1
  }

  const modulationEdges = edges.filter((edge) => edge.kind === 'modulation')
  for (let pass = 0; pass < 6; pass += 1) {
    for (const edge of modulationEdges) {
      depths[edge.from] = Math.max(depths[edge.from], depths[edge.to] + 1)
    }
  }

  return depths
}

function decodeAlgorithm(flags: readonly number[], number: number): Dx7AlgorithmDefinition {
  if (flags.length !== 6) throw new Error(`DX7 algorithm ${number} must contain six operator flags.`)

  const busContents: Array<Set<Dx7OperatorNumber>> = [new Set(), new Set(), new Set()]
  const carriers: Dx7OperatorNumber[] = []
  const edges: Dx7AlgorithmEdge[] = []
  const feedbackInputs: Dx7OperatorNumber[] = []
  const feedbackOutputs: Dx7OperatorNumber[] = []

  flags.forEach((operatorFlags, index) => {
    const operator = EVALUATION_ORDER[index]
    if (!operator) throw new Error(`DX7 algorithm ${number} has an invalid operator index.`)

    const inputBus = operatorFlags & IN_BUS_TWO ? 2 : operatorFlags & IN_BUS_ONE ? 1 : 0
    const outputBus = operatorFlags & 0x03
    const add = (operatorFlags & OUT_BUS_ADD) !== 0

    if (inputBus > 0) {
      for (const modulator of busContents[inputBus] ?? []) {
        edges.push({ from: modulator, to: operator, kind: 'modulation' })
      }
    }

    if ((operatorFlags & FB_IN) !== 0) feedbackInputs.push(operator)
    if ((operatorFlags & FB_OUT) !== 0) feedbackOutputs.push(operator)

    if (outputBus === 0) {
      carriers.push(operator)
    } else {
      const output = busContents[outputBus]
      if (!output) throw new Error(`DX7 algorithm ${number} references unsupported output bus ${outputBus}.`)
      if (!add) output.clear()
      output.add(operator)
    }
  })

  for (const feedbackOutput of feedbackOutputs) {
    for (const feedbackInput of feedbackInputs) {
      edges.push({ from: feedbackOutput, to: feedbackInput, kind: 'feedback' })
    }
  }

  const sortedCarriers = [...carriers].sort((left, right) => left - right)
  const carrierSet = new Set(sortedCarriers)
  const modulators = EVALUATION_ORDER.filter((operator) => !carrierSet.has(operator)).sort((left, right) => left - right)
  const distinctEdges = uniqueEdges(edges)
  const depthByOperator = calculateDepths(distinctEdges, sortedCarriers)

  return {
    number,
    carriers: sortedCarriers,
    modulators,
    edges: distinctEdges,
    depthByOperator,
    maximumDepth: Math.max(...Object.values(depthByOperator)),
  }
}

export const DX7_ALGORITHMS: readonly Dx7AlgorithmDefinition[] = ALGORITHM_FLAGS.map(
  (flags, index) => decodeAlgorithm(flags, index + 1),
)

export function getDx7Algorithm(number: number): Dx7AlgorithmDefinition {
  if (!Number.isInteger(number) || number < 1 || number > 32) {
    throw new Error(`DX7 algorithm must be an integer from 1 to 32; received ${number}.`)
  }
  const algorithm = DX7_ALGORITHMS[number - 1]
  if (!algorithm) throw new Error(`DX7 algorithm ${number} is unavailable.`)
  return algorithm
}

export function isCarrier(algorithm: Dx7AlgorithmDefinition, operator: Dx7OperatorNumber): boolean {
  return algorithm.carriers.includes(operator)
}
