import { useEffect, useMemo, useState } from 'react'
import {
  loadCatalogEntryBytes,
  loadPatchCatalog,
  resetPatchCatalogCache,
  type LoadedPatchCatalog,
} from '../catalog/catalogLoader'
import {
  filterPatchCatalog,
  type PatchCatalogAvailability,
  type PatchCatalogEntry,
} from '../catalog/patchCatalog'
import type { Dx7Voice } from '../domain/voice'
import type { PatchOrigin } from '../library/model'
import { importSysexFile } from '../sysex/importSysex'

interface PatchCatalogBrowserProps {
  onLoadBank: (voices: readonly Dx7Voice[]) => void
  onLoadVoice: (voice: Dx7Voice) => void
  onAuditionVoice: (voice: Dx7Voice) => Promise<void>
  onImportToLibrary: (
    voices: readonly Dx7Voice[],
    origin: Omit<PatchOrigin, 'bankSlot'>,
  ) => Promise<{ added: number; duplicates: number }>
}

const PAGE_SIZE = 48

type AvailabilityFilter = 'all' | PatchCatalogAvailability

function availabilityLabel(entry: PatchCatalogEntry): string {
  if (entry.availability === 'archive-and-website') return 'ZIP + website'
  if (entry.availability === 'website') return 'Website mirror'
  return 'ZIP archive'
}

function availabilityClass(entry: PatchCatalogEntry): string {
  if (entry.availability === 'archive-and-website') return 'border-violet-300/25 bg-violet-300/10 text-violet-200'
  if (entry.availability === 'website') return 'border-amber-300/25 bg-amber-300/10 text-amber-200'
  return 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
}

function voicesFromParsedEntry(parsed: ReturnType<typeof importSysexFile>): {
  voices: readonly Dx7Voice[]
  bank: Extract<(typeof parsed)[number], { kind: 'voice-bank' }> | undefined
} {
  const bank = parsed.find((item): item is Extract<(typeof parsed)[number], { kind: 'voice-bank' }> => item.kind === 'voice-bank')
  const singles = parsed.filter((item): item is Extract<(typeof parsed)[number], { kind: 'single-voice' }> => item.kind === 'single-voice')
  const voices = bank ? bank.voices : singles.map((item) => item.voice)
  if (voices.length === 0) {
    const unsupported = parsed.find((item) => item.kind === 'unsupported')
    throw new Error(unsupported?.kind === 'unsupported' ? unsupported.reason : 'No supported DX7 voices were found.')
  }
  return { voices, bank }
}

export function PatchCatalogBrowser({
  onLoadBank,
  onLoadVoice,
  onAuditionVoice,
  onImportToLibrary,
}: PatchCatalogBrowserProps) {
  const [catalog, setCatalog] = useState<LoadedPatchCatalog | null>(null)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false)
  const [page, setPage] = useState(0)
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null)
  const [auditioningEntryId, setAuditioningEntryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadCatalog = async () => {
    setLoading(true)
    setError(null)
    try {
      setCatalog(await loadPatchCatalog())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The patch catalog could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCatalog()
  }, [])

  useEffect(() => setPage(0), [availability, includeDiagnostics, query, source])

  const sources = useMemo(
    () => Array.from(new Set(catalog?.entries.map((entry) => entry.source) ?? [])).sort((left, right) => left.localeCompare(right)),
    [catalog],
  )
  const visible = useMemo(
    () => catalog ? filterPatchCatalog(catalog.entries, { query, source, availability, includeDiagnostics }) : [],
    [availability, catalog, includeDiagnostics, query, source],
  )
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const pageEntries = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const readEntryVoices = async (entry: PatchCatalogEntry) => voicesFromParsedEntry(
    importSysexFile(await loadCatalogEntryBytes(entry)),
  )

  const auditionEntry = async (entry: PatchCatalogEntry) => {
    setAuditioningEntryId(entry.id)
    setStatus(null)
    setError(null)
    try {
      const { voices } = await readEntryVoices(entry)
      const voice = voices[0]
      if (!voice) throw new Error('The selected catalog bank contains no auditionable voice.')
      await onAuditionVoice(voice)
      setStatus(`Auditioning ${voice.name || 'UNTITLED'} from ${entry.title} locally. The editor voice and library were not changed.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The catalog voice could not be auditioned locally.')
    } finally {
      setAuditioningEntryId(null)
    }
  }

  const loadEntry = async (entry: PatchCatalogEntry) => {
    setLoadingEntryId(entry.id)
    setStatus(null)
    setError(null)
    try {
      const { voices, bank } = await readEntryVoices(entry)
      const summary = await onImportToLibrary(voices, {
        kind: 'external-catalog',
        label: entry.website ? 'Yamaha Black Boxes + sysexFinal' : `sysexFinal.zip / ${entry.source}`,
        importedAt: new Date().toISOString(),
        filename: entry.filename,
        ...(entry.website ? { url: entry.website.remoteUrl } : {}),
      })

      if (bank) onLoadBank(bank.voices)
      else if (voices[0]) onLoadVoice(voices[0])
      setStatus(`Loaded ${entry.title}: ${summary.added} new voices, ${summary.duplicates} duplicates skipped.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The selected bank could not be loaded.')
    } finally {
      setLoadingEntryId(null)
    }
  }

  const entryActionBusy = loadingEntryId !== null || auditioningEntryId !== null

  return (
    <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Merged SysEx library browser</p>
          <h3 className="mt-1 text-xl font-bold text-white">sysexFinal.zip + Yamaha Black Boxes</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            Browse banks, audition the first valid voice locally without changing the editor, or explicitly load/import a bank. Website matches use the ZIP copy; website-only banks use the build mirror or their direct `.syx` source URL.
          </p>
        </div>
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
          onClick={() => {
            resetPatchCatalogCache()
            setCatalog(null)
            void loadCatalog()
          }}
          type="button"
        >
          Reload catalog
        </button>
      </div>

      {catalog && (
        <div className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-5">
          <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300"><strong className="text-white">{catalog.stats.archiveFiles}</strong> ZIP banks</span>
          <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300"><strong className="text-white">{catalog.stats.validBanks}</strong> checksum-valid</span>
          <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300"><strong className="text-white">{catalog.stats.websiteBanks}</strong> website banks</span>
          <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300"><strong className="text-white">{catalog.stats.websiteMatchedArchive}</strong> merged matches</span>
          <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300"><strong className="text-white">{catalog.stats.websiteOnly}</strong> website-only</span>
        </div>
      )}

      {catalog?.archiveIntegrity === 'changed' && (
        <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">
          The source ZIP hash differs from the uploaded archive baseline. Entries remain browseable, but the source should be reviewed before release.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input
          aria-label="Search the patch catalog"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none focus:border-cyan-300/50 xl:col-span-2"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search bank, folder, author or voice name"
          value={query}
        />
        <select className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200" onChange={(event) => setSource(event.target.value)} value={source}>
          <option value="all">All archive sources</option>
          {sources.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200" onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)} value={availability}>
          <option value="all">All availability</option>
          <option value="archive">ZIP only</option>
          <option value="archive-and-website">ZIP + website</option>
          <option value="website">Website-only</option>
        </select>
      </div>

      <label className="flex w-fit items-center gap-2 text-xs text-slate-400">
        <input checked={includeDiagnostics} onChange={(event) => setIncludeDiagnostics(event.target.checked)} type="checkbox" />
        Show checksum-error and unsupported files for diagnostics
      </label>

      {(status || error) && <p className={`text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}

      {loading ? (
        <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">Loading and indexing the SysEx ZIP…</p>
      ) : pageEntries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">No banks match the current filters.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {pageEntries.map((entry) => {
            const diagnostic = entry.status === 'checksum-error' || entry.status === 'unsupported'
            return (
              <article className="grid content-between gap-4 rounded-2xl border border-white/10 bg-black/15 p-4" key={entry.id}>
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate font-bold text-white" title={entry.title}>{entry.title}</h4>
                      <p className="mt-1 truncate text-xs text-slate-500" title={entry.folder}>{entry.source} · {entry.folder || 'root'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${availabilityClass(entry)}`}>{availabilityLabel(entry)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.voices.slice(0, 8).map((voice, index) => (
                      <span className="rounded-md border border-white/8 bg-white/[0.035] px-2 py-1 text-[10px] text-slate-400" key={`${voice}-${index}`}>{voice || 'UNTITLED'}</span>
                    ))}
                    {entry.voices.length > 8 && <span className="px-2 py-1 text-[10px] text-slate-600">+{entry.voices.length - 8}</span>}
                    {entry.voices.length === 0 && <span className="text-[10px] text-slate-600">Voice list available after reading the bank</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-[10px] uppercase tracking-[0.12em] ${diagnostic ? 'text-rose-300' : 'text-slate-600'}`}>{entry.status}</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-lg border border-violet-300/20 bg-violet-300/5 px-3 py-2 text-xs font-bold text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={diagnostic || entryActionBusy}
                      onClick={() => void auditionEntry(entry)}
                      type="button"
                    >
                      {auditioningEntryId === entry.id ? 'Starting local…' : 'Audition first voice'}
                    </button>
                    <button
                      className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      disabled={diagnostic || entryActionBusy}
                      onClick={() => void loadEntry(entry)}
                      type="button"
                    >
                      {loadingEntryId === entry.id ? 'Loading…' : 'Load bank'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>{visible.length} matching banks · page {page + 1} of {pageCount}</span>
        <div className="flex gap-2">
          <button className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button">Previous</button>
          <button className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} type="button">Next</button>
        </div>
      </div>

      <p className="text-[11px] leading-5 text-slate-600">
        Patch rights vary by original author and collection. Local audition parses the bank in memory only and does not import, load or transmit a voice. The app retains source metadata and does not treat every bank as public domain.
      </p>
    </section>
  )
}
