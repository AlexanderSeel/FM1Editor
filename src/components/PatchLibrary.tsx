import { useMemo, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import {
  countVoiceDifferences,
  filterPatchRecords,
  parseTags,
  type PatchRecord,
} from '../library/model'

interface PatchLibraryProps {
  records: readonly PatchRecord[]
  loading: boolean
  error: string | null
  currentVoice: Dx7Voice
  onLoad: (voice: Dx7Voice) => void
  onSaveCurrent: (voice: Dx7Voice) => Promise<{ added: number; duplicates: number }>
  onToggleFavorite: (id: string) => Promise<void>
  onUpdateTags: (id: string, tags: readonly string[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function PatchLibrary({
  records,
  loading,
  error,
  currentVoice,
  onLoad,
  onSaveCurrent,
  onToggleFavorite,
  onUpdateTags,
  onDelete,
}: PatchLibraryProps) {
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [compareA, setCompareA] = useState<string | null>(null)
  const [compareB, setCompareB] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const visible = useMemo(
    () => filterPatchRecords(records, { query, favoritesOnly }),
    [favoritesOnly, query, records],
  )
  const left = records.find((record) => record.id === compareA)
  const right = records.find((record) => record.id === compareB)

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Local patch library</p>
            <h3 className="mt-1 text-xl font-bold text-white">{records.length} stored voices</h3>
          </div>
          <button
            className="rounded-xl bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-violet-300"
            onClick={() => {
              void onSaveCurrent(currentVoice).then((result) => {
                setStatus(result.added > 0 ? 'Saved current voice.' : 'That exact voice is already in the library.')
              })
            }}
            type="button"
          >
            Save current voice
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            aria-label="Search patches"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, tag, source or license"
            value={query}
          />
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-300">
            <input checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} type="checkbox" />
            Favorites only
          </label>
        </div>
        {(status || error) && <p className={`mt-3 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}
      </div>

      {(left || right) && (
        <div className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.06] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">A/B comparison</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span>A: {left?.voice.name || 'not selected'}</span>
            <span>B: {right?.voice.name || 'not selected'}</span>
            {left && right && <strong className="text-white">{countVoiceDifferences(left.voice, right.voice)} changed parameters</strong>}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading local library…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">
          No patches match the current filter. Imported SysEx voices are stored automatically.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visible.map((record) => (
            <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-4" key={record.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-lg font-bold text-white">{record.voice.name || 'UNTITLED'}</h4>
                  <p className="mt-1 truncate text-xs text-slate-500">{record.origin.label}{record.origin.filename ? ` · ${record.origin.filename}` : ''}</p>
                </div>
                <button
                  aria-label={record.favorite ? 'Remove favorite' : 'Add favorite'}
                  className={`text-xl ${record.favorite ? 'text-amber-300' : 'text-slate-600 hover:text-amber-200'}`}
                  onClick={() => void onToggleFavorite(record.id)}
                  type="button"
                >
                  ★
                </button>
              </div>
              <input
                aria-label={`Tags for ${record.voice.name}`}
                className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-300/40"
                defaultValue={record.tags.join(', ')}
                key={record.updatedAt}
                onBlur={(event) => void onUpdateTags(record.id, parseTags(event.target.value))}
                placeholder="tags, comma, separated"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950" onClick={() => onLoad(record.voice)} type="button">Load</button>
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300" onClick={() => setCompareA(record.id)} type="button">Set A</button>
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300" onClick={() => setCompareB(record.id)} type="button">Set B</button>
                <button className="rounded-lg border border-rose-300/20 px-3 py-1.5 text-xs text-rose-300" onClick={() => void onDelete(record.id)} type="button">Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
