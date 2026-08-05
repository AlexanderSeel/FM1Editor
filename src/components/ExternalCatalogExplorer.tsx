import { useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import { fetchRemoteSysex } from '../catalog/remoteSysex'
import { externalCatalogSources } from '../catalog/sources'
import type { PatchOrigin } from '../library/model'
import { importSysexFile } from '../sysex/importSysex'

interface ExternalCatalogExplorerProps {
  onImport: (
    voices: readonly Dx7Voice[],
    origin: Omit<PatchOrigin, 'bankSlot'>,
  ) => Promise<{ added: number; duplicates: number }>
}

export function ExternalCatalogExplorer({ onImport }: ExternalCatalogExplorerProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const importRemote = async () => {
    setLoading(true)
    setStatus(null)
    setError(null)
    try {
      const bytes = await fetchRemoteSysex(url)
      const entries = importSysexFile(bytes)
      const voices = entries.flatMap((entry) => entry.kind === 'voice-bank'
        ? [...entry.voices]
        : entry.kind === 'single-voice'
          ? [entry.voice]
          : [])
      if (voices.length === 0) {
        const reason = entries[0]?.kind === 'unsupported' ? entries[0].reason : 'No supported DX7 voice data was found.'
        throw new Error(reason)
      }
      const summary = await onImport(voices, {
        kind: 'external-catalog',
        label: new URL(url).hostname,
        importedAt: new Date().toISOString(),
        url,
      })
      setStatus(`Imported ${summary.added} new voices; ${summary.duplicates} duplicates were skipped.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The remote SysEx file could not be imported.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">External SysEx explorer</p>
        <h3 className="mt-1 text-lg font-bold text-white">Attributed patch sources</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">Sources open in a separate tab. Patch files remain at their original provider and are only imported after your explicit action.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {externalCatalogSources.map((source) => (
          <article className="rounded-xl border border-white/10 bg-black/15 p-4" key={source.id}>
            <h4 className="font-bold text-white">{source.name}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-400">{source.description}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{source.licenseNote}</p>
            <a className="mt-3 inline-flex rounded-lg border border-cyan-300/25 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-300/10" href={source.url} rel="noreferrer" target="_blank">Open {source.attribution}</a>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/15 p-4">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300" htmlFor="remote-sysex-url">Direct SysEx URL</label>
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
            id="remote-sysex-url"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://provider.example/bank.syx"
            type="url"
            value={url}
          />
          <button className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50" disabled={loading || url.trim().length === 0} onClick={() => void importRemote()} type="button">
            {loading ? 'Importing…' : 'Import URL'}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">The provider must allow browser CORS access. Only direct HTTPS `.syx` or `.sysex` URLs up to 2 MB are accepted.</p>
        {(status || error) && <p className={`mt-2 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}
      </div>
    </section>
  )
}
