interface RangeControlProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

export function RangeControl({
  label,
  value,
  min = 0,
  max = 99,
  step = 1,
  suffix,
  onChange,
}: RangeControlProps) {
  return (
    <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
        <output className="min-w-10 text-right font-mono text-sm tracking-normal text-cyan-200">
          {value}{suffix}
        </output>
      </span>
      <input
        aria-label={label}
        className="accent-cyan-300"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  )
}
