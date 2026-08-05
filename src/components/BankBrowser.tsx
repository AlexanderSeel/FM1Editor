import { useState } from 'react'
import { moveBankVoice } from '../domain/bank'
import type { Dx7Voice } from '../domain/voice'
import { downloadBytes } from '../files/download'
import { encodeVoiceBankMessage } from '../sysex/dx7'

interface BankBrowserProps {
  voices: readonly Dx7Voice[]
  selectedIndex: number | null
  onSelect: (voice: Dx7Voice, index: number) => void
  onChange: (voices: readonly Dx7Voice[]) => void
}

export function BankBrowser({ voices, selectedIndex, onSelect, onChange }: BankBrowserProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  if (voices.length === 0) return null

  const exportBank = () => {
    downloadBytes(encodeVoiceBankMessage(voices), 'fm1-editor-bank.syx')
    setStatus('Exported 32-voice bank with Yamaha checksum.')
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Imported bank</p>
          <h3 className="mt-1 text-lg font-bold text-white">{voices.length} voice slots</h3>
          <p className="mt-1 text-xs text-slate-500">Select the slot to edit or replace. Drag slots to reorder. Changes stay local until exported or sent as a complete bank.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">File workspace</span>
          <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={voices.length !== 32} onClick={exportBank} type="button">Export bank</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {voices.map((voice, index) => (
          <button
            className={`rounded-xl border px-3 py-3 text-left transition ${index === selectedIndex ? 'border-cyan-300/50 bg-cyan-300/10 text-white' : 'border-white/10 bg-black/15 text-slate-400 hover:border-white/25 hover:text-white'}`}
            draggable
            key={`${index}-${voice.name}`}
            onClick={() => onSelect(voice, index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDragIndex(index)}
            onDrop={() => {
              if (dragIndex === null) return
              const next = moveBankVoice(voices, dragIndex, index)
              onChange(next)
              const moved = next[index]
              if (moved) onSelect(moved, index)
              setDragIndex(null)
              setStatus(`Moved slot ${dragIndex + 1} to ${index + 1}.`)
            }}
            type="button"
          >
            <span className="block font-mono text-[10px] text-slate-500">{String(index + 1).padStart(2, '0')}</span>
            <span className="mt-1 block truncate text-xs font-bold">{voice.name || 'UNTITLED'}</span>
          </button>
        ))}
      </div>
      {status && <p className="mt-3 text-xs text-emerald-300">{status}</p>}
    </section>
  )
}
