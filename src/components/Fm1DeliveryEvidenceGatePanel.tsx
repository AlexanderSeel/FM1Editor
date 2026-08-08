import { useMemo, useState } from 'react'
import { HARDWARE_EVIDENCE_SCHEMA } from '../validation/hardwareEvidence'
import {
  evaluateFm1DeliveryEvidenceIntegrity,
  type Fm1DeliveryEvidenceFile,
  type Fm1DeliveryEvidenceIntegrityGate,
} from '../validation/fm1DeliveryEvidenceIntegrity'

interface ImportedEvidence extends Fm1DeliveryEvidenceFile {
  readonly parseError: string | null
}

const DEFAULT_PAGES_ORIGIN = 'https://alexanderseel.github.io'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFm1HardwareManifest(value: unknown): boolean {
  return isRecord(value) && value.schema === HARDWARE_EVIDENCE_SCHEMA && value.target === 'fm1'
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

async function sha256Bytes(bytes: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('This browser does not expose Web Crypto SHA-256 support.')
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(new Uint8Array(digest))
}

function saveGate(gate: Fm1DeliveryEvidenceIntegrityGate, files: readonly ImportedEvidence[]): void {
  const payload = {
    ...gate,
    sourceFiles: files.map((file) => ({
      filename: file.filename,
      sha256: file.sha256,
      parseError: file.parseError,
    })),
  }
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fm1-delivery-evidence-gate-v2-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function readEvidenceFiles(list: FileList): Promise<ImportedEvidence[]> {
  const result: ImportedEvidence[] = []
  for (const file of Array.from(list)) {
    const bytes = await file.arrayBuffer()
    const sha256 = await sha256Bytes(bytes)
    try {
      const text = new TextDecoder().decode(bytes)
      result.push({ filename: file.name, sha256, value: JSON.parse(text) as unknown, parseError: null })
    } catch (cause) {
      result.push({
        filename: file.name,
        sha256,
        value: null,
        parseError: cause instanceof Error ? cause.message : 'Could not parse JSON.',
      })
    }
  }
  return result
}

export function Fm1DeliveryEvidenceGatePanel() {
  const [expectedOrigin, setExpectedOrigin] = useState(DEFAULT_PAGES_ORIGIN)
  const [files, setFiles] = useState<readonly ImportedEvidence[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const manifestFiles = useMemo(() => files.filter((file) => isFm1HardwareManifest(file.value)), [files])
  const gate = useMemo(() => evaluateFm1DeliveryEvidenceIntegrity(files, { expectedOrigin }), [expectedOrigin, files])

  const importFiles = async (selected: FileList | null) => {
    if (!selected) return
    setLoadError(null)
    try {
      setFiles(await readEvidenceFiles(selected))
    } catch (cause) {
      setFiles([])
      setLoadError(cause instanceof Error ? cause.message : 'Evidence files could not be read or hashed.')
    }
  }

  return (
    <details className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.025] p-3">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">
        FM-1 delivery evidence gate · {gate.ready ? 'READY' : 'BLOCKED'}
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-[11px] leading-5 text-slate-400">
          Import the sanitized Chrome/Edge FM-1 hardware manifests together with their exported physical-evidence correlation receipts. Final READY requires the physical manifest checks plus a unique SHA-256-bound raw-MIDI capture for each selected browser session. Files are hashed and inspected locally.
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
          Chrome + Edge manifests and correlation receipts
          <input
            accept="application/json,.json"
            className="block w-full text-[10px] text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-slate-200"
            multiple
            onChange={(event) => void importFiles(event.target.files)}
            type="file"
          />
        </label>
        {loadError && <p className="rounded-lg border border-rose-300/20 bg-rose-300/5 p-2 text-[10px] text-rose-200">{loadError}</p>}

        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] leading-4 text-slate-400">
          Imported {files.length} JSON files · FM-1 manifests {gate.manifestFileCount} · correlation receipts {gate.correlationReceiptCount}<br />
          Manifest-complete Chrome {gate.baseGate.chromePassingCount} · Edge {gate.baseGate.edgePassingCount}<br />
          Final result <strong className={gate.ready ? 'text-emerald-200' : 'text-amber-200'}>{gate.ready ? 'READY' : 'BLOCKED'}</strong>
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

        {gate.baseGate.manifests.length > 0 && (
          <div className="grid gap-2">
            {gate.baseGate.manifests.map((manifest) => (
              <div className="rounded-lg border border-white/10 bg-black/15 p-2 text-[10px] leading-4 text-slate-400" key={manifest.index}>
                <strong className="text-slate-200">{manifestFiles[manifest.index]?.filename ?? `Manifest ${manifest.index + 1}`}</strong> · {manifest.browser.toUpperCase()} · {manifest.blockers.length === 0 ? 'manifest complete' : `${manifest.blockers.length} blocker(s)`}
                {manifest.blockers.length > 0 && <div className="mt-1 text-slate-500">{manifest.blockers.join(' ')}</div>}
              </div>
            ))}
          </div>
        )}

        {gate.selected && (
          <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.03] p-2 text-[9px] leading-4 text-slate-400">
            <p><strong className="text-emerald-200">Chrome binding</strong> · {gate.selected.chrome.manifestFilename} <span className="font-mono">{gate.selected.chrome.manifestSha256.slice(0, 12)}</span> → {gate.selected.chrome.rawMidiFilename} <span className="font-mono">{gate.selected.chrome.rawMidiSha256.slice(0, 12)}</span></p>
            <p><strong className="text-emerald-200">Edge binding</strong> · {gate.selected.edge.manifestFilename} <span className="font-mono">{gate.selected.edge.manifestSha256.slice(0, 12)}</span> → {gate.selected.edge.rawMidiFilename} <span className="font-mono">{gate.selected.edge.rawMidiSha256.slice(0, 12)}</span></p>
          </div>
        )}

        {files.some((file) => file.parseError) && (
          <div className="rounded-lg border border-rose-300/15 bg-rose-300/[0.03] p-2 text-[9px] leading-4 text-rose-200">
            {files.filter((file) => file.parseError).map((file) => <p key={file.filename}>{file.filename}: {file.parseError}</p>)}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-emerald-300/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40"
            disabled={files.length === 0}
            onClick={() => saveGate(gate, files)}
            type="button"
          >
            Export v2 gate receipt
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-40"
            disabled={files.length === 0}
            onClick={() => { setFiles([]); setLoadError(null) }}
            type="button"
          >
            Clear imported evidence
          </button>
        </div>
        <p className="text-[10px] leading-4 text-slate-500">The exported v2 receipt contains validation results, source filenames and SHA-256 identities only. Imported physical manifests, raw MIDI event payloads, SysEx and WAV data are not embedded. Hash correlation proves file/session linkage, not device behavior.</p>
      </div>
    </details>
  )
}
