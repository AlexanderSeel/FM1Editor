import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import {
  adjustEnvelopeParameter,
  calculateEnvelopePoints,
  ENVELOPE_GRAPH_BOTTOM,
  ENVELOPE_GRAPH_HEIGHT,
  ENVELOPE_GRAPH_TOP,
  ENVELOPE_GRAPH_WIDTH,
  updateEnvelopeLevelFromY,
  updateEnvelopeRateFromX,
  type EnvelopeStageIndex,
} from '../domain/envelopeGeometry'
import type { Dx7Envelope } from '../domain/voice'

interface EnvelopeGraphProps {
  envelope: Dx7Envelope
  label: string
  accent?: 'cyan' | 'violet'
  onChange?: (envelope: Dx7Envelope) => void
}

type DragKind = 'rate' | 'level'

interface ActiveDrag {
  readonly kind: DragKind
  readonly stage: EnvelopeStageIndex
  readonly pointerId: number
  readonly source: Dx7Envelope
  readonly startClientX: number
  readonly startClientY: number
}

function keyboardDelta(event: KeyboardEvent<SVGGElement>, current: number): number | null {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return 1
    case 'ArrowDown':
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

export function EnvelopeGraph({ envelope, label, accent = 'cyan', onChange }: EnvelopeGraphProps) {
  const [draft, setDraft] = useState(envelope)
  const draftRef = useRef(envelope)
  const activeDrag = useRef<ActiveDrag | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gradientId = `envelope-fill-${useId().replaceAll(':', '')}-${accent}`
  const stroke = accent === 'cyan' ? '#67e8f9' : '#c4b5fd'

  useEffect(() => {
    if (activeDrag.current) return
    draftRef.current = envelope
    setDraft(envelope)
  }, [envelope])

  const updateDraft = (next: Dx7Envelope) => {
    draftRef.current = next
    setDraft(next)
  }

  const envelopeFromDrag = (
    active: ActiveDrag,
    event: PointerEvent<SVGGElement>,
  ): Dx7Envelope | null => {
    const rectangle = svgRef.current?.getBoundingClientRect()
    if (!rectangle || rectangle.width <= 0 || rectangle.height <= 0) return null

    if (active.kind === 'rate') {
      const sourcePoints = calculateEnvelopePoints(active.source)
      const endpoint = sourcePoints[active.stage + 1]
      if (!endpoint) return null
      const deltaX = (event.clientX - active.startClientX) * (ENVELOPE_GRAPH_WIDTH / rectangle.width)
      return updateEnvelopeRateFromX(active.source, active.stage, endpoint.x + deltaX)
    }

    const sourcePoints = calculateEnvelopePoints(active.source)
    const endpoint = sourcePoints[active.stage + 1]
    if (!endpoint) return null
    const deltaY = (event.clientY - active.startClientY) * (ENVELOPE_GRAPH_HEIGHT / rectangle.height)
    return updateEnvelopeLevelFromY(active.source, active.stage, endpoint.y + deltaY)
  }

  const beginDrag = (
    kind: DragKind,
    stage: EnvelopeStageIndex,
    event: PointerEvent<SVGGElement>,
  ) => {
    if (!onChange) return
    event.preventDefault()
    activeDrag.current = {
      kind,
      stage,
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
    const next = envelopeFromDrag(active, event)
    if (next) updateDraft(next)
  }

  const finishDrag = (event: PointerEvent<SVGGElement>) => {
    const active = activeDrag.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    const next = envelopeFromDrag(active, event) ?? draftRef.current
    updateDraft(next)
    activeDrag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onChange?.(next)
  }

  const cancelDrag = (event: PointerEvent<SVGGElement>) => {
    const active = activeDrag.current
    if (!active || active.pointerId !== event.pointerId) return
    activeDrag.current = null
    draftRef.current = active.source
    setDraft(active.source)
  }

  const handleKeyboard = (
    kind: DragKind,
    stage: EnvelopeStageIndex,
    event: KeyboardEvent<SVGGElement>,
  ) => {
    if (!onChange) return
    const current = kind === 'rate' ? draft.rates[stage] : draft.levels[stage]
    const delta = keyboardDelta(event, current)
    if (delta === null) return
    event.preventDefault()
    const next = adjustEnvelopeParameter(draft, kind, stage, delta)
    updateDraft(next)
    onChange(next)
  }

  const points = calculateEnvelopePoints(draft)
  const pointList = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <figure className="fm1-envelope-panel border">
      <figcaption className="fm1-envelope-caption flex flex-wrap justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
        <span className="fm1-envelope-values font-mono">
          <span>R {draft.rates.join(' · ')}</span>
          <span>L {draft.levels.join(' · ')}</span>
        </span>
      </figcaption>
      <svg
        aria-label={`${label}${onChange ? ' draggable controls' : ' visualization'}`}
        className="h-32 w-full select-none"
        preserveAspectRatio="none"
        ref={svgRef}
        role={onChange ? 'group' : 'img'}
        style={{ touchAction: 'none' }}
        viewBox={`0 0 ${ENVELOPE_GRAPH_WIDTH} ${ENVELOPE_GRAPH_HEIGHT}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="1" stopColor={stroke} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 99].map((level) => {
          const y = ENVELOPE_GRAPH_BOTTOM - (level / 99) * (ENVELOPE_GRAPH_BOTTOM - ENVELOPE_GRAPH_TOP)
          return (
            <line
              key={level}
              stroke="rgba(148,163,184,0.1)"
              strokeWidth="1"
              x1="0"
              x2={ENVELOPE_GRAPH_WIDTH}
              y1={y}
              y2={y}
            />
          )
        })}
        {points.slice(1).map((point, index) => (
          <line
            key={`stage-guide-${index}`}
            stroke="rgba(148,163,184,0.11)"
            strokeDasharray="3 4"
            strokeWidth="1"
            x1={point.x}
            x2={point.x}
            y1="13"
            y2={ENVELOPE_GRAPH_BOTTOM}
          />
        ))}
        <polygon
          fill={`url(#${gradientId})`}
          points={`${points[0]?.x ?? 0},${ENVELOPE_GRAPH_BOTTOM} ${pointList} ${points.at(-1)?.x ?? ENVELOPE_GRAPH_WIDTH},${ENVELOPE_GRAPH_BOTTOM}`}
        />
        <polyline
          fill="none"
          points={pointList}
          stroke={stroke}
          strokeLinecap="square"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <circle
          cx={points[0]?.x ?? 0}
          cy={points[0]?.y ?? ENVELOPE_GRAPH_BOTTOM}
          fill="#071018"
          r="4"
          stroke={stroke}
          strokeOpacity="0.65"
          strokeWidth="1.5"
        />

        {([0, 1, 2, 3] as const).map((stage) => {
          const point = points[stage + 1]
          if (!point) return null
          const rate = draft.rates[stage]
          return (
            <g
              aria-label={`${label} stage ${stage + 1} rate`}
              aria-valuemax={99}
              aria-valuemin={0}
              aria-valuenow={rate}
              className="cursor-ew-resize outline-none focus-visible:drop-shadow-[0_0_4px_rgba(255,255,255,0.75)]"
              key={`rate-${stage}`}
              onKeyDown={(event) => handleKeyboard('rate', stage, event)}
              onPointerCancel={cancelDrag}
              onPointerDown={(event) => beginDrag('rate', stage, event)}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              role={onChange ? 'slider' : undefined}
              tabIndex={onChange ? 0 : undefined}
            >
              <rect
                fill="#081015"
                height="9"
                stroke={stroke}
                strokeWidth="1.7"
                transform={`rotate(45 ${point.x} 8)`}
                width="9"
                x={point.x - 4.5}
                y="3.5"
              />
              <circle cx={point.x} cy="8" fill="transparent" r="12" />
            </g>
          )
        })}

        {([0, 1, 2, 3] as const).map((stage) => {
          const point = points[stage + 1]
          if (!point) return null
          const level = draft.levels[stage]
          return (
            <g
              aria-label={`${label} stage ${stage + 1} level`}
              aria-valuemax={99}
              aria-valuemin={0}
              aria-valuenow={level}
              className="cursor-ns-resize outline-none focus-visible:drop-shadow-[0_0_4px_rgba(255,255,255,0.75)]"
              key={`level-${stage}`}
              onKeyDown={(event) => handleKeyboard('level', stage, event)}
              onPointerCancel={cancelDrag}
              onPointerDown={(event) => beginDrag('level', stage, event)}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              role={onChange ? 'slider' : undefined}
              tabIndex={onChange ? 0 : undefined}
            >
              <circle cx={point.x} cy={point.y} fill="#071018" r="5.5" stroke={stroke} strokeWidth="2" />
              <circle cx={point.x} cy={point.y} fill="transparent" r="13" />
            </g>
          )
        })}
      </svg>
      {onChange && (
        <p className="mt-1.5 text-[9px] leading-4 text-slate-500">
          Diamonds adjust rates horizontally; circles adjust levels vertically. Arrow keys change 1 and Page Up/Down changes 10.
        </p>
      )}
    </figure>
  )
}
