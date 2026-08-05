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

  const pointerCoordinates = (event: PointerEvent<SVGGElement>) => {
    const rectangle = svgRef.current?.getBoundingClientRect()
    if (!rectangle || rectangle.width <= 0 || rectangle.height <= 0) return null
    return {
      x: ((event.clientX - rectangle.left) / rectangle.width) * ENVELOPE_GRAPH_WIDTH,
      y: ((event.clientY - rectangle.top) / rectangle.height) * ENVELOPE_GRAPH_HEIGHT,
    }
  }

  const updateFromPointer = (
    kind: DragKind,
    stage: EnvelopeStageIndex,
    event: PointerEvent<SVGGElement>,
  ) => {
    const coordinates = pointerCoordinates(event)
    if (!coordinates) return
    updateDraft(kind === 'rate'
      ? updateEnvelopeRateFromX(draftRef.current, stage, coordinates.x)
      : updateEnvelopeLevelFromY(draftRef.current, stage, coordinates.y))
  }

  const beginDrag = (
    kind: DragKind,
    stage: EnvelopeStageIndex,
    event: PointerEvent<SVGGElement>,
  ) => {
    if (!onChange) return
    event.preventDefault()
    activeDrag.current = { kind, stage, pointerId: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(kind, stage, event)
  }

  const moveDrag = (event: PointerEvent<SVGGElement>) => {
    const active = activeDrag.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    updateFromPointer(active.kind, active.stage, event)
  }

  const finishDrag = (event: PointerEvent<SVGGElement>) => {
    const active = activeDrag.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    activeDrag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onChange?.(draftRef.current)
  }

  const cancelDrag = (event: PointerEvent<SVGGElement>) => {
    const active = activeDrag.current
    if (!active || active.pointerId !== event.pointerId) return
    activeDrag.current = null
    draftRef.current = envelope
    setDraft(envelope)
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
    <figure className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <span className="font-mono text-[11px] text-slate-500">
          R {draft.rates.join(' · ')} / L {draft.levels.join(' · ')}
        </span>
      </figcaption>
      <svg
        aria-label={`${label}${onChange ? ' draggable controls' : ' visualization'}`}
        className="h-36 w-full select-none"
        preserveAspectRatio="none"
        ref={svgRef}
        role={onChange ? 'group' : 'img'}
        style={{ touchAction: 'none' }}
        viewBox={`0 0 ${ENVELOPE_GRAPH_WIDTH} ${ENVELOPE_GRAPH_HEIGHT}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="1" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 99].map((level) => {
          const y = ENVELOPE_GRAPH_BOTTOM - (level / 99) * (ENVELOPE_GRAPH_BOTTOM - ENVELOPE_GRAPH_TOP)
          return (
            <line
              key={level}
              stroke="rgba(148,163,184,0.12)"
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
            stroke="rgba(148,163,184,0.13)"
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
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
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
              className="cursor-ew-resize outline-none focus-visible:drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]"
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
                height="10"
                stroke={stroke}
                strokeWidth="2"
                transform={`rotate(45 ${point.x} 8)`}
                width="10"
                x={point.x - 5}
                y="3"
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
              className="cursor-ns-resize outline-none focus-visible:drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]"
              key={`level-${stage}`}
              onKeyDown={(event) => handleKeyboard('level', stage, event)}
              onPointerCancel={cancelDrag}
              onPointerDown={(event) => beginDrag('level', stage, event)}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              role={onChange ? 'slider' : undefined}
              tabIndex={onChange ? 0 : undefined}
            >
              <circle cx={point.x} cy={point.y} fill="#071018" r="6" stroke={stroke} strokeWidth="2.5" />
              <circle cx={point.x} cy={point.y} fill="transparent" r="13" />
            </g>
          )
        })}
      </svg>
      {onChange && (
        <p className="mt-2 text-[10px] leading-4 text-slate-500">
          Drag diamonds horizontally for rates and circles vertically for levels. Focus a handle and use arrow keys for single-value precision; Page Up/Down changes ten values.
        </p>
      )}
    </figure>
  )
}
