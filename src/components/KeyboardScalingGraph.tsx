import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import {
  adjustKeyboardScalingParameter,
  breakPointToKeyboardScalingX,
  calculateKeyboardScalingPoints,
  KEYBOARD_SCALING_GRAPH_CENTER_Y,
  KEYBOARD_SCALING_GRAPH_HEIGHT,
  KEYBOARD_SCALING_GRAPH_LEFT,
  KEYBOARD_SCALING_GRAPH_RIGHT,
  KEYBOARD_SCALING_GRAPH_WIDTH,
  keyboardScalingEndpoint,
  updateKeyboardScalingBreakPointFromX,
  updateKeyboardScalingDepthFromY,
  type KeyboardScalingParameter,
} from '../domain/keyboardScalingGeometry'
import type { Dx7KeyboardScaling } from '../domain/voice'

interface KeyboardScalingGraphProps {
  scaling: Dx7KeyboardScaling
  label: string
  onChange: (scaling: Dx7KeyboardScaling) => void
}

interface ActiveDrag {
  readonly parameter: KeyboardScalingParameter
  readonly pointerId: number
  readonly source: Dx7KeyboardScaling
  readonly startClientX: number
  readonly startClientY: number
}

function curveLabel(value: Dx7KeyboardScaling['leftCurve']): string {
  switch (value) {
    case 'negative-linear': return '-LIN'
    case 'negative-exponential': return '-EXP'
    case 'positive-exponential': return '+EXP'
    case 'positive-linear': return '+LIN'
  }
}

function keyboardDelta(
  event: KeyboardEvent<SVGGElement>,
  parameter: KeyboardScalingParameter,
  current: number,
): number | null {
  switch (event.key) {
    case 'ArrowUp':
      return parameter === 'breakPoint' ? null : 1
    case 'ArrowDown':
      return parameter === 'breakPoint' ? null : -1
    case 'ArrowRight':
      return 1
    case 'ArrowLeft':
      return -1
    case 'PageUp':
      return 10
    case 'PageDown':
      return -10
    case 'Home':
      return -current
    case 'End':
      return 99 - current
    default:
      return null
  }
}

export function KeyboardScalingGraph({ scaling, label, onChange }: KeyboardScalingGraphProps) {
  const [draft, setDraft] = useState(scaling)
  const draftRef = useRef(scaling)
  const activeDrag = useRef<ActiveDrag | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const fillId = `keyboard-scaling-fill-${useId().replaceAll(':', '')}`

  useEffect(() => {
    if (activeDrag.current) return
    draftRef.current = scaling
    setDraft(scaling)
  }, [scaling])

  const updateDraft = (next: Dx7KeyboardScaling) => {
    draftRef.current = next
    setDraft(next)
  }

  const scalingFromDrag = (
    active: ActiveDrag,
    event: PointerEvent<SVGGElement>,
  ): Dx7KeyboardScaling | null => {
    const rectangle = svgRef.current?.getBoundingClientRect()
    if (!rectangle || rectangle.width <= 0 || rectangle.height <= 0) return null

    if (active.parameter === 'breakPoint') {
      const sourceX = breakPointToKeyboardScalingX(active.source.breakPoint)
      const deltaX = (event.clientX - active.startClientX)
        * (KEYBOARD_SCALING_GRAPH_WIDTH / rectangle.width)
      return updateKeyboardScalingBreakPointFromX(active.source, sourceX + deltaX)
    }

    const side = active.parameter === 'leftDepth' ? 'left' : 'right'
    const sourcePoint = keyboardScalingEndpoint(active.source, side)
    const deltaY = (event.clientY - active.startClientY)
      * (KEYBOARD_SCALING_GRAPH_HEIGHT / rectangle.height)
    return updateKeyboardScalingDepthFromY(active.source, side, sourcePoint.y + deltaY)
  }

  const beginDrag = (
    parameter: KeyboardScalingParameter,
    event: PointerEvent<SVGGElement>,
  ) => {
    event.preventDefault()
    activeDrag.current = {
      parameter,
      pointerId: event.pointerId,
      source: draftRef.current,
      startClientX: event.clientX,
      startClientY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: PointerEvent<SVGGElement>) => {
    const active = activeDrag.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    const next = scalingFromDrag(active, event)
    if (next) updateDraft(next)
  }

  const finishDrag = (event: PointerEvent<SVGGElement>) => {
    const active = activeDrag.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    const next = scalingFromDrag(active, event) ?? draftRef.current
    updateDraft(next)
    activeDrag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onChange(next)
  }

  const cancelDrag = (event: PointerEvent<SVGGElement>) => {
    const active = activeDrag.current
    if (!active || active.pointerId !== event.pointerId) return
    activeDrag.current = null
    draftRef.current = active.source
    setDraft(active.source)
  }

  const handleKeyboard = (
    parameter: KeyboardScalingParameter,
    event: KeyboardEvent<SVGGElement>,
  ) => {
    const current = draft[parameter]
    const delta = keyboardDelta(event, parameter, current)
    if (delta === null) return
    event.preventDefault()
    const next = adjustKeyboardScalingParameter(draft, parameter, delta)
    updateDraft(next)
    onChange(next)
  }

  const points = calculateKeyboardScalingPoints(draft, 48)
  const pointList = points.map((point) => `${point.x},${point.y}`).join(' ')
  const breakX = breakPointToKeyboardScalingX(draft.breakPoint)
  const leftEndpoint = keyboardScalingEndpoint(draft, 'left')
  const rightEndpoint = keyboardScalingEndpoint(draft, 'right')

  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Relative operator level across low and high keys around breakpoint {draft.breakPoint}.
          </p>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          L {curveLabel(draft.leftCurve)} {draft.leftDepth} · BP {draft.breakPoint} · R {curveLabel(draft.rightCurve)} {draft.rightDepth}
        </span>
      </figcaption>

      <svg
        aria-label={`${label} draggable controls`}
        className="h-44 w-full select-none"
        preserveAspectRatio="none"
        ref={svgRef}
        role="group"
        style={{ touchAction: 'none' }}
        viewBox={`0 0 ${KEYBOARD_SCALING_GRAPH_WIDTH} ${KEYBOARD_SCALING_GRAPH_HEIGHT}`}
      >
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#bef264" stopOpacity="0.22" />
            <stop offset="0.5" stopColor="#67e8f9" stopOpacity="0.05" />
            <stop offset="1" stopColor="#67e8f9" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {[24, KEYBOARD_SCALING_GRAPH_CENTER_Y, 128].map((y) => (
          <line
            key={y}
            stroke={y === KEYBOARD_SCALING_GRAPH_CENTER_Y ? 'rgba(125,211,252,0.38)' : 'rgba(148,163,184,0.12)'}
            strokeDasharray={y === KEYBOARD_SCALING_GRAPH_CENTER_Y ? undefined : '4 5'}
            strokeWidth={y === KEYBOARD_SCALING_GRAPH_CENTER_Y ? 1.5 : 1}
            x1={KEYBOARD_SCALING_GRAPH_LEFT}
            x2={KEYBOARD_SCALING_GRAPH_RIGHT}
            y1={y}
            y2={y}
          />
        ))}

        <line
          stroke="rgba(244,201,102,0.6)"
          strokeDasharray="5 4"
          strokeWidth="1.5"
          x1={breakX}
          x2={breakX}
          y1="18"
          y2="132"
        />
        <polygon
          fill={`url(#${fillId})`}
          points={`${KEYBOARD_SCALING_GRAPH_LEFT},${KEYBOARD_SCALING_GRAPH_CENTER_Y} ${pointList} ${KEYBOARD_SCALING_GRAPH_RIGHT},${KEYBOARD_SCALING_GRAPH_CENTER_Y}`}
        />
        <polyline
          fill="none"
          points={pointList}
          stroke="#9be7ff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        <text className="fill-slate-500 text-[9px] font-bold tracking-[0.12em]" x={KEYBOARD_SCALING_GRAPH_LEFT} y="145">LOW KEYS</text>
        <text className="fill-amber-200/70 text-[9px] font-bold tracking-[0.12em]" textAnchor="middle" x={breakX} y="145">BP {draft.breakPoint}</text>
        <text className="fill-slate-500 text-[9px] font-bold tracking-[0.12em]" textAnchor="end" x={KEYBOARD_SCALING_GRAPH_RIGHT} y="145">HIGH KEYS</text>

        <g
          aria-label={`${label} breakpoint`}
          aria-valuemax={99}
          aria-valuemin={0}
          aria-valuenow={draft.breakPoint}
          className="cursor-ew-resize outline-none focus-visible:drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]"
          onKeyDown={(event) => handleKeyboard('breakPoint', event)}
          onPointerCancel={cancelDrag}
          onPointerDown={(event) => beginDrag('breakPoint', event)}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          role="slider"
          tabIndex={0}
        >
          <rect
            fill="#17130a"
            height="12"
            stroke="#f4c966"
            strokeWidth="2"
            transform={`rotate(45 ${breakX} ${KEYBOARD_SCALING_GRAPH_CENTER_Y})`}
            width="12"
            x={breakX - 6}
            y={KEYBOARD_SCALING_GRAPH_CENTER_Y - 6}
          />
          <circle cx={breakX} cy={KEYBOARD_SCALING_GRAPH_CENTER_Y} fill="transparent" r="15" />
        </g>

        {([
          { parameter: 'leftDepth', point: leftEndpoint, label: 'left depth', value: draft.leftDepth },
          { parameter: 'rightDepth', point: rightEndpoint, label: 'right depth', value: draft.rightDepth },
        ] as const).map(({ parameter, point, label: handleLabel, value }) => (
          <g
            aria-label={`${label} ${handleLabel}`}
            aria-valuemax={99}
            aria-valuemin={0}
            aria-valuenow={value}
            className="cursor-ns-resize outline-none focus-visible:drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]"
            key={parameter}
            onKeyDown={(event) => handleKeyboard(parameter, event)}
            onPointerCancel={cancelDrag}
            onPointerDown={(event) => beginDrag(parameter, event)}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            role="slider"
            tabIndex={0}
          >
            <circle cx={point.x} cy={point.y} fill="#071018" r="7" stroke="#bef264" strokeWidth="2.5" />
            <circle cx={point.x} cy={point.y} fill="transparent" r="15" />
          </g>
        ))}
      </svg>

      <p className="mt-2 text-[10px] leading-4 text-slate-500">
        Drag the amber breakpoint horizontally and the green depth handles vertically. Arrow keys change one value; Page Up/Down changes ten; Home/End selects the range boundary.
      </p>
    </figure>
  )
}
