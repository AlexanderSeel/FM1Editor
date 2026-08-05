import type { Dx7Envelope } from '../domain/voice'

interface EnvelopeGraphProps {
  envelope: Dx7Envelope
  label: string
  accent?: 'cyan' | 'violet'
}

export function EnvelopeGraph({ envelope, label, accent = 'cyan' }: EnvelopeGraphProps) {
  const segmentWidths = envelope.rates.map((rate) => 18 + (99 - rate) * 0.62)
  const total = segmentWidths.reduce((sum, width) => sum + width, 0)
  const x = [0]
  segmentWidths.forEach((width) => x.push((x.at(-1) ?? 0) + width))
  const y = [envelope.levels[3], envelope.levels[0], envelope.levels[1], envelope.levels[2], envelope.levels[3]]
    .map((level) => 104 - level)
  const points = x.map((pointX, index) => `${(pointX / total) * 300},${y[index] ?? 104}`).join(' ')
  const stroke = accent === 'cyan' ? '#67e8f9' : '#c4b5fd'

  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
      <figcaption className="mb-3 flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
        <span className="font-mono text-[11px] text-slate-500">
          R {envelope.rates.join(' · ')} / L {envelope.levels.join(' · ')}
        </span>
      </figcaption>
      <svg aria-label={`${label} visualization`} className="h-32 w-full" preserveAspectRatio="none" role="img" viewBox="0 0 300 110">
        <defs>
          <linearGradient id={`fill-${accent}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="1" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((line) => (
          <line key={line} stroke="rgba(148,163,184,0.12)" strokeWidth="1" x1="0" x2="300" y1={104 - line} y2={104 - line} />
        ))}
        <polygon fill={`url(#fill-${accent})`} points={`0,104 ${points} 300,104`} />
        <polyline fill="none" points={points} stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {x.map((pointX, index) => (
          <circle key={index} cx={(pointX / total) * 300} cy={y[index] ?? 104} fill="#071018" r="4.5" stroke={stroke} strokeWidth="2" />
        ))}
      </svg>
    </figure>
  )
}
