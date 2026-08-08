import { useMemo, useState } from 'react'
import {
  evaluateFm1DeliveryEvidence,
  type Fm1DeliveryEvidenceGate,
} from '../validation/fm1DeliveryEvidence'

interface ImportedEvidence {
  readonly filename: string
  readonly value: unknown
  readonly parseError: string | null
}

const DEFAULT_PAGES_ORIGIN = 'https://alexanderseel.github.io'

function saveGate(gate: Fm1DeliveryEvidenceGate, files: readonly ImportedEvidence[]): void {
  const payload = {
    ...gate,
    sourceFiles: files.map((file, index) => ({
      index,
      filename: file.filename,
      parseError: file.parseError,
    })),
  }
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fm1-delivery-evidence-gate-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function readEvidenceFiles(list: FileList): Promise<ImportedEvidence[]> {
  return Promise.all(Array.from(list).map(async (file) => {
    try {
      const text = await file.text()
      return { filename: file.name, value: JSON.parse(text) as unknown, parseError: null }
    } catch (cause) {
      return {
        filename: file.name,
        value: null,
        parseError: cause instanceof Error ? cause.message : 'Could not parse JSON.',
      }
    }
  }))
}

export function Fm1DeliveryEvidenceGatePanel() {
  const [expectedOrigin, setExpectedOrigin] = useState(DEFAULT_PAGES_ORIGIN)
  const [files, setFiles] = useState<readonly ImportedEvidence[]>([])
  const gate = useMemo(() => evaluateFm1DeliveryEvidence(
    files.map((file) => file.value),
    { expectedOrigin },
  ), [expectedOrigin, files])

  return (
    <details className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.025] p-3">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">
        FM-1 delivery evidence gate · {gate.ready ? 'READY' : 'BLOCKED'}
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-[11px] leading-5 text-slate-400">
          Import sanitized FM-1 hardware evidence manifests from physical Chrome and Edge sessions. READY is evidence completeness for the tested HTTPS deployment tuple only; it does not discover unsupported device protocols or enable Pages automatically.
        </p>

        <label className="grid gap-1 text-[10px] text-slate-400">
          Intended HTTPS origin
          <input
            className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white"
            onChange={(event) => setExpectedOrigin(event.target.value)}
            spellCheck={false}
            value={expectedOrigin}
          />
        </label>

        <label className="grid gap-1 text-[10px] text-slate-400">
          Chrome + Edge evidence manifests
          <input
            accept="application/json,.json"
            className="block w-full text-[10px] text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-slate-200"
            multiple
            onChange={(event) => {
              const selected = event.target.files
              if (!selected) return
              void readEvidenceFiles(selected).then(setFiles)
            }}
            type="file"
          />
        </label>

        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] leading-4 text-slate-400">
          Imported {gate.importedCount} · passing Chrome {gate.chromePassingCount} · passing Edge {gate.edgePassingCount}<br />
          Result <strong className={gate.ready ? 'text-emerald-200' : 'text-amber-200'}>{gate.ready ? 'READY' : 'BLOCKED'}</strong>
          {gate.selected && <><br />Firmware {gate.selected.firmwareVersion} · commit {gate.selected.editorCommit.slice(0, 12)} · {gate.selected.windowsVersion}</>}
        </div>

        {gate.blockers.length > 0 && (
          <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200">Gate blockers</p>
            <ul className="mt-1 list-disc pl-4 text-[10px] leading-4 text-slate-300">
              {gate.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          </div>
        )}

        {gate.manifests.length > 0 && (
          <div className="grid gap-2">
            {gate.manifests.map((manifest) => (
              <div className="rounded-lg border border-white/10 bg-black/15 p-2 text-[10px] leading-4 text-slate-400" key={manifest.index}>
                <strong className="text-slate-200">{files[manifest.index]?.filename ?? `Manifest ${manifest.index + 1}`}</strong> · {manifest.browser.toUpperCase()} · {manifest.blockers.length === 0 ? 'complete' : `${manifest.blockers.length} blocker(s)`}
                {manifest.blockers.length > 0 && <div className="mt-1 text-slate-500">{manifest.blockers.join(' ')}</div>}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-emerald-300/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40"
            disabled={files.length === 0}
            onClick={() => saveGate(gate, files)}
            type="button"
          >
            Export gate receipt
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-40"
            disabled={files.length === 0}
            onClick={() => setFiles([])}
            type="button"
          >
            Clear imported evidence
          </button>
        </div>
        <p className="text-[10px] leading-4 text-slate-500">The exported gate receipt contains validation results and source filenames only. Imported physical manifests, raw SysEx and WAV data are not embedded.</p>
      </div>
    </details>
  )
}
