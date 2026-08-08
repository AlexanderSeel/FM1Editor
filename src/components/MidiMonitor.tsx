import { useMemo, useState } from 'react'
import {
  formatMidiHex,
  serializeMidiMonitor,
  type MidiMonitorDirection,
  type MidiMonitorEntry,
} from '../midi/monitor'
import { HardwareEvidenceRecorder } from './HardwareEvidenceRecorder'

interface MidiMonitorProps {
  entries: readonly MidiMonitorEntry[]
  onClear: () => void
}

type DirectionFilter = 'all' | MidiMonitorDirection

function exportMonitor(entries: readonly MidiMonitorEntry[]): void {
  const blob = new Blob([serializeMidiMonitor(entries)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fm1-midi-monitor-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function MidiMonitor({ entries, onClear }: MidiMonitorProps) {
  const [direction, setDirection] = useState<DirectionFilter>('all')
  const [query, setQuery] = useState('')
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (direction !== 'all' && entry.direction !== direction) return false
      if (!normalized) return true
      return `${entry.portName} ${entry.summary} ${formatMidiHex(entry.data)}`.toLowerCase().includes(normalized)
    }).slice(-100).reverse()
  }, [direction, entries, query])

  return (
    <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
        MIDI monitor · {entries.length} messages
      </summary>
      <div className="mt-4 grid gap-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
          <input
            aria-label="Filter MIDI messages"
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/40"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter summary, port or hex"
            value={query}
          />
          <select
            aria-label="MIDI direction"
            className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200"
            onChange={(event) => setDirection(event.target.value as DirectionFilter)}
            value={direction}
          >
            <option value="all">Input + output</option>
            <option value="in">Input only</option>
            <option value="out">Output only</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-40" disabled={entries.length === 0} onClick={() => exportMonitor(entries)} type="button">Export JSON</button>
          <button className="rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-semibold text-rose-300 disabled:opacity-40" disabled={entries.length === 0} onClick={onClear} type="button">Clear</button>
        </div>
        <div className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-black/20">
          {visible.length === 0 ? (
            <p className="p-4 text-xs text-slate-500">No MIDI messages match the current filter.</p>
          ) : visible.map((entry) => (
            <article className="border-b border-white/5 p-3 last:border-b-0" key={entry.id}>
              <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <span className={entry.direction === 'in' ? 'text-cyan-300' : 'text-violet-300'}>{entry.direction === 'in' ? 'IN' : 'OUT'} · {entry.portName}</span>
                <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-200">{entry.summary}</p>
              <p className="mt-1 break-all font-mono text-[10px] leading-4 text-slate-500">{formatMidiHex(entry.data)}</p>
            </article>
          ))}
        </div>
        <HardwareEvidenceRecorder entries={entries} />
      </div>
    </details>
  )
}
