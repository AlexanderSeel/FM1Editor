import { useMemo } from 'react'
import type { Dx7Operator } from '../domain/voice'
import {
  getDx7Algorithm,
  isCarrier,
  type Dx7AlgorithmDefinition,
  type Dx7OperatorNumber,
} from '../domain/dx7Algorithms'

interface AlgorithmGraphProps {
  algorithm: number
  operators: readonly Dx7Operator[]
  selectedOperator: number
  soloOperator: number | null
  onSelect: (operatorIndex: number) => void
  onToggleEnabled: (operatorIndex: number) => void
  onSolo: (operatorIndex: number) => void
}

interface OperatorPosition {
  operator: Dx7OperatorNumber
  x: number
  y: number
}

const GRAPH_WIDTH = 720
const GRAPH_HEIGHT = 360
const NODE_HALF_WIDTH = 48
const NODE_HALF_HEIGHT = 34
const HORIZONTAL_PADDING = 62
const BOTTOM_Y = 292
const TOP_Y = 58

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function modulationTargets(algorithm: Dx7AlgorithmDefinition, operator: Dx7OperatorNumber): Dx7OperatorNumber[] {
  return algorithm.edges
    .filter((edge) => edge.kind === 'modulation' && edge.from === operator)
    .map((edge) => edge.to)
}

function spreadLayer(
  operators: readonly Dx7OperatorNumber[],
  idealX: ReadonlyMap<Dx7OperatorNumber, number>,
): Map<Dx7OperatorNumber, number> {
  const result = new Map<Dx7OperatorNumber, number>()
  if (operators.length === 0) return result

  const minimum = HORIZONTAL_PADDING
  const maximum = GRAPH_WIDTH - HORIZONTAL_PADDING
  const minimumGap = Math.min(112, (maximum - minimum) / Math.max(1, operators.length - 1))
  const sorted = [...operators].sort((left, right) =>
    (idealX.get(left) ?? 0) - (idealX.get(right) ?? 0) || left - right,
  )
  const positions = sorted.map((operator) => clamp(idealX.get(operator) ?? GRAPH_WIDTH / 2, minimum, maximum))

  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index] ?? minimum, (positions[index - 1] ?? minimum) + minimumGap)
  }

  const overflow = (positions.at(-1) ?? maximum) - maximum
  if (overflow > 0) {
    for (let index = 0; index < positions.length; index += 1) positions[index] = (positions[index] ?? minimum) - overflow
  }

  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(positions[index] ?? maximum, (positions[index + 1] ?? maximum) - minimumGap)
  }

  const underflow = minimum - (positions[0] ?? minimum)
  if (underflow > 0) {
    for (let index = 0; index < positions.length; index += 1) positions[index] = (positions[index] ?? maximum) + underflow
  }

  sorted.forEach((operator, index) => result.set(operator, positions[index] ?? GRAPH_WIDTH / 2))
  return result
}

export function calculateAlgorithmLayout(algorithm: Dx7AlgorithmDefinition): readonly OperatorPosition[] {
  const positions = new Map<Dx7OperatorNumber, OperatorPosition>()
  const maximumDepth = Math.max(1, algorithm.maximumDepth)

  for (let depth = 0; depth <= algorithm.maximumDepth; depth += 1) {
    const operators = ([1, 2, 3, 4, 5, 6] as const).filter(
      (operator) => algorithm.depthByOperator[operator] === depth,
    )
    const idealX = new Map<Dx7OperatorNumber, number>()

    if (depth === 0) {
      operators.forEach((operator, index) => {
        idealX.set(
          operator,
          HORIZONTAL_PADDING + ((GRAPH_WIDTH - HORIZONTAL_PADDING * 2) * (index + 1)) / (operators.length + 1),
        )
      })
    } else {
      for (const operator of operators) {
        const targetPositions = modulationTargets(algorithm, operator)
          .map((target) => positions.get(target)?.x)
          .filter((value): value is number => value !== undefined)
        const average = targetPositions.length > 0
          ? targetPositions.reduce((sum, value) => sum + value, 0) / targetPositions.length
          : GRAPH_WIDTH / 2
        idealX.set(operator, average)
      }
    }

    const layerX = spreadLayer(operators, idealX)
    const y = BOTTOM_Y - (depth / maximumDepth) * (BOTTOM_Y - TOP_Y)
    for (const operator of operators) {
      positions.set(operator, { operator, x: layerX.get(operator) ?? GRAPH_WIDTH / 2, y })
    }
  }

  return [...positions.values()].sort((left, right) => left.operator - right.operator)
}

function edgePath(
  from: OperatorPosition,
  to: OperatorPosition,
  feedback: boolean,
): string {
  if (feedback && from.operator === to.operator) {
    const startX = from.x + NODE_HALF_WIDTH - 5
    const startY = from.y - 4
    return `M ${startX} ${startY} C ${startX + 70} ${startY - 70}, ${startX + 70} ${startY + 70}, ${startX} ${startY + 24}`
  }

  const startY = from.y + NODE_HALF_HEIGHT
  const endY = to.y - NODE_HALF_HEIGHT
  if (feedback) {
    const side = from.x <= to.x ? -1 : 1
    const controlX = clamp(Math.min(from.x, to.x) - 58 * side, 24, GRAPH_WIDTH - 24)
    return `M ${from.x} ${startY} C ${controlX} ${startY + 24}, ${controlX} ${endY - 24}, ${to.x} ${endY}`
  }

  const middleY = (startY + endY) / 2
  return `M ${from.x} ${startY} C ${from.x} ${middleY}, ${to.x} ${middleY}, ${to.x} ${endY}`
}

export function AlgorithmGraph({
  algorithm: algorithmNumber,
  operators,
  selectedOperator,
  soloOperator,
  onSelect,
  onToggleEnabled,
  onSolo,
}: AlgorithmGraphProps) {
  const algorithm = useMemo(() => getDx7Algorithm(algorithmNumber), [algorithmNumber])
  const positions = useMemo(() => calculateAlgorithmLayout(algorithm), [algorithm])
  const positionByOperator = new Map(positions.map((position) => [position.operator, position]))

  return (
    <section className="fm1-algorithm-panel grid gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="fm1-hardware-label text-[10px] text-sky-200">Algorithm routing</p>
          <h3 className="mt-1 text-xl font-black text-white">Algorithm {String(algorithm.number).padStart(2, '0')}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {algorithm.carriers.length} carrier{algorithm.carriers.length === 1 ? '' : 's'} feed the audio output; {algorithm.modulators.length} modulator{algorithm.modulators.length === 1 ? '' : 's'} shape operators below them.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-300" />Carrier</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lime-300" />Modulator</span>
          <span className="flex items-center gap-1.5"><span className="h-0 w-7 border-t border-dashed border-amber-300" />Feedback</span>
        </div>
      </div>

      <div className="fm1-algorithm-canvas relative min-h-[300px] overflow-hidden rounded-xl border border-black/80" role="group" aria-label={`DX7 algorithm ${algorithm.number} routing controls`}>
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}>
          <defs>
            <marker id={`algorithm-arrow-${algorithm.number}`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" />
            </marker>
            <marker id={`feedback-arrow-${algorithm.number}`} markerHeight="7" markerWidth="7" orient="auto" refX="6" refY="3.5">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" />
            </marker>
          </defs>

          {algorithm.edges.map((edge) => {
            const from = positionByOperator.get(edge.from)
            const to = positionByOperator.get(edge.to)
            if (!from || !to) return null
            const feedback = edge.kind === 'feedback'
            return (
              <path
                className={feedback ? 'text-amber-300/80' : 'text-sky-200/55'}
                d={edgePath(from, to, feedback)}
                fill="none"
                key={`${edge.kind}-${edge.from}-${edge.to}`}
                markerEnd={`url(#${feedback ? 'feedback' : 'algorithm'}-arrow-${algorithm.number})`}
                stroke="currentColor"
                strokeDasharray={feedback ? '7 6' : undefined}
                strokeLinecap="round"
                strokeWidth={feedback ? 2.5 : 2}
              />
            )
          })}

          {algorithm.carriers.map((carrier) => {
            const position = positionByOperator.get(carrier)
            if (!position) return null
            return (
              <g className="text-sky-200/55" key={`output-${carrier}`}>
                <path d={`M ${position.x} ${position.y + NODE_HALF_HEIGHT} V 334`} fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx={position.x} cy="338" fill="currentColor" r="4" />
              </g>
            )
          })}
          <path className="text-sky-200/35" d="M 70 338 H 650" fill="none" stroke="currentColor" strokeWidth="2" />
          <text className="fill-sky-100/55 text-[11px] font-bold tracking-[0.2em]" textAnchor="middle" x="360" y="354">AUDIO OUT</text>
        </svg>

        {positions.map((position) => {
          const operatorIndex = position.operator - 1
          const operator = operators[operatorIndex]
          const carrier = isCarrier(algorithm, position.operator)
          const enabled = (operator?.outputLevel ?? 0) > 0
          const selected = selectedOperator === operatorIndex
          const soloed = soloOperator === operatorIndex
          return (
            <button
              aria-label={`Select operator ${position.operator}, ${carrier ? 'carrier' : 'modulator'}, ${enabled ? 'enabled' : 'muted'}`}
              className={`fm1-algorithm-node absolute grid w-24 -translate-x-1/2 -translate-y-1/2 place-items-center px-2 py-2 text-center ${carrier ? 'fm1-algorithm-carrier' : 'fm1-algorithm-modulator'} ${enabled ? '' : 'fm1-algorithm-muted'} ${soloed ? 'fm1-algorithm-solo' : ''}`}
              data-active={selected}
              key={position.operator}
              onClick={() => onSelect(operatorIndex)}
              style={{ left: `${(position.x / GRAPH_WIDTH) * 100}%`, top: `${(position.y / GRAPH_HEIGHT) * 100}%` }}
              type="button"
            >
              <span className="text-[9px] font-black uppercase tracking-[0.13em]">OP {position.operator}</span>
              <span className="text-[8px] uppercase tracking-[0.12em] opacity-70">{carrier ? 'Carrier' : 'Modulator'}</span>
              <span className="font-mono text-[10px]">LVL {operator?.outputLevel ?? 0}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {operators.map((operator, operatorIndex) => {
          const operatorNumber = (operatorIndex + 1) as Dx7OperatorNumber
          const carrier = isCarrier(algorithm, operatorNumber)
          const enabled = operator.outputLevel > 0
          const soloed = soloOperator === operatorIndex
          return (
            <div className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border px-3 py-2 ${selectedOperator === operatorIndex ? 'border-sky-300/45 bg-sky-300/5' : 'border-white/8 bg-black/15'}`} key={operatorNumber}>
              <button className="min-w-0 text-left" onClick={() => onSelect(operatorIndex)} type="button">
                <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">OP {operatorNumber} · {carrier ? 'Carrier' : 'Modulator'}</span>
                <span className="mt-1 block truncate font-mono text-[10px] text-slate-500">Level {operator.outputLevel} · {operator.oscillatorMode === 'fixed' ? 'FIX' : 'RATIO'}</span>
              </button>
              <button
                aria-pressed={!enabled}
                className="px-2.5 py-2 text-[9px] uppercase tracking-[0.1em]"
                onClick={() => onToggleEnabled(operatorIndex)}
                title={enabled ? `Mute operator ${operatorNumber} by setting its output level to 0` : `Restore operator ${operatorNumber} output level`}
                type="button"
              >
                {enabled ? 'Mute' : 'Enable'}
              </button>
              <button
                aria-pressed={soloed}
                className="px-2.5 py-2 text-[9px] uppercase tracking-[0.1em]"
                data-active={soloed}
                onClick={() => onSolo(operatorIndex)}
                title={soloed ? 'Exit solo and restore the previous operator levels' : `Solo operator ${operatorNumber}`}
                type="button"
              >
                Solo
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] leading-5 text-slate-500">
        Mute writes output level 0 and Enable restores the last remembered non-zero level. Solo temporarily sets the other five output levels to 0; leaving solo restores the captured levels. These edits participate in application undo/redo and are encoded in exported voices and banks.
      </p>
    </section>
  )
}
