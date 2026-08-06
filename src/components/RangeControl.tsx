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
    <label className="fm1-range-control">
      <span className="fm1-range-header flex items-center justify-between gap-2 font-semibold uppercase">
        <span className="fm1-range-label">{label}</span>
        <output className="fm1-range-value text-right font-mono tracking-normal">
          {value}{suffix}
        </output>
      </span>
      <input
        aria-label={label}
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
