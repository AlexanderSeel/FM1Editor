import type { Dx7Voice } from '../domain/voice'

interface BankBrowserProps {
  voices: readonly Dx7Voice[]
  selectedVoice: Dx7Voice
  onSelect: (voice: Dx7Voice) => void
}

export function BankBrowser({ voices, selectedVoice, onSelect }: BankBrowserProps) {
  if (voices.length === 0) return null

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Imported bank</p>
          <h3 className="mt-1 text-lg font-bold text-white">32 voice slots</h3>
        </div>
        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
          File workspace
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {voices.map((voice, index) => (
          <button
            className={`rounded-xl border px-3 py-3 text-left transition ${
              voice === selectedVoice
                ? 'border-cyan-300/50 bg-cyan-300/10 text-white'
                : 'border-white/10 bg-black/15 text-slate-400 hover:border-white/25 hover:text-white'
            }`}
            key={`${index}-${voice.name}`}
            onClick={() => onSelect(voice)}
            type="button"
          >
            <span className="block font-mono text-[10px] text-slate-500">{String(index + 1).padStart(2, '0')}</span>
            <span className="mt-1 block truncate text-xs font-bold">{voice.name || 'UNTITLED'}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
