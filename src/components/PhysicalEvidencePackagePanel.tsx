import { useMemo, useState } from 'react'
import {
  createPhysicalEvidencePackageManifest,
  serializePhysicalEvidencePackageManifest,
  type PhysicalEvidenceArtifactInput,
  type PhysicalEvidenceTarget,
} from '../validation/physicalEvidencePackage'
import {
  serializePhysicalEvidenceConsistencyReport,
  validatePhysicalEvidenceConsistency,
} from '../validation/physicalEvidenceConsistency'

const JSON_INSPECTION_LIMIT_BYTES = 16 * 1024 * 1024
const SYSEX_INSPECTION_LIMIT_BYTES = 1024 * 1024

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

async function sha256File(file: File): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('This browser does not expose Web Crypto SHA-256 support.')
  const bytes = await file.arrayBuffer()
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(new Uint8Array(digest))
}

async function inspectJson(file: File): Promise<unknown | undefined> {
  const looksJson = file.name.toLowerCase().endsWith('.json') || file.type.toLowerCase() === 'application/json'
  if (!looksJson || file.size > JSON_INSPECTION_LIMIT_BYTES) return undefined
  try {
    return JSON.parse(await file.text()) as unknown
  } catch {
    return undefined
  }
}

async function inspectSysex(file: File): Promise<readonly number[] | undefined> {
  if (!file.name.toLowerCase().endsWith('.syx') || file.size > SYSEX_INSPECTION_LIMIT_BYTES) return undefined
  return Array.from(new Uint8Array(await file.arrayBuffer()))
}

async function prepareArtifact(file: File): Promise<PhysicalEvidenceArtifactInput> {
  const sha256 = await sha256File(file)
  const jsonValue = await inspectJson(file)
  const sysexBytes = await inspectSysex(file)
  return {
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
    sha256,
    ...(jsonValue === undefined ? {} : { jsonValue }),
    ...(sysexBytes === undefined ? {} : { sysexBytes }),
  }
}

function saveJson(text: string, stem: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${stem}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function PhysicalEvidencePackagePanel() {
  const [target, setTarget] = useState<PhysicalEvidenceTarget>('fm1')
  const [artifacts, setArtifacts] = useState<readonly PhysicalEvidenceArtifactInput[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manifest = useMemo(() => createPhysicalEvidencePackageManifest(artifacts, { target }), [artifacts, target])
  const consistency = useMemo(() => validatePhysicalEvidenceConsistency(artifacts, target), [artifacts, target])

  const importFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const next: PhysicalEvidenceArtifactInput[] = []
      for (const file of Array.from(files)) next.push(await prepareArtifact(file))
      setArtifacts(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Evidence files could not be hashed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.025] p-3">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">
        Physical evidence package · {manifest.artifactCount} files
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-[11px] leading-5 text-slate-400">
          Hash a sanitized physical-test file set locally and export a reproducible package index. File bytes are never uploaded or embedded in the manifest; only filename, size, MIME type, SHA-256, classification and schema hints are retained. Small .syx files are inspected in browser memory only so an FM-1 merged-bank capture can be bound to the exact transmitted payload; stock-DX7 recovery evidence additionally resolves the manifest recovery-bank SHA to one retained .syx artifact.
        </p>

        <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
          <label className="grid gap-1 text-[10px] text-slate-400">
            Evidence target
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white"
              onChange={(event) => setTarget(event.target.value as PhysicalEvidenceTarget)}
              value={target}
            >
              <option value="fm1">FM-1</option>
              <option value="dx7">Stock DX7</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label className="grid gap-1 text-[10px] text-slate-400">
            Sanitized evidence files
            <input
              className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[10px] file:text-white"
              disabled={busy}
              multiple
              onChange={(event) => void importFiles(event.target.files)}
              type="file"
            />
          </label>
        </div>

        {busy && <p className="text-[10px] text-emerald-200">Hashing selected files locally…</p>}
        {error && <p className="rounded-lg border border-rose-300/20 bg-rose-300/5 p-2 text-[10px] text-rose-200">{error}</p>}

        {manifest.artifactCount > 0 && (
          <div className="grid gap-2">
            <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] text-slate-400">
              {manifest.artifactCount} artifacts · {manifest.totalBytes.toLocaleString()} bytes · {manifest.duplicateHashes.length} duplicate hash groups · {manifest.warnings.length} package warnings
            </div>
            <div className="max-h-44 overflow-auto rounded-lg border border-white/10 bg-black/15">
              {manifest.artifacts.map((artifact) => (
                <div className="border-b border-white/5 p-2 last:border-0" key={`${artifact.name}-${artifact.sha256}`}>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                    <span className="font-semibold text-slate-200">{artifact.name}</span>
                    <span className="uppercase tracking-[0.1em] text-emerald-300">{artifact.kind}</span>
                  </div>
                  <p className="mt-1 break-all font-mono text-[9px] leading-4 text-slate-500">SHA-256 {artifact.sha256}</p>
                  <p className="text-[9px] text-slate-600">{artifact.sizeBytes.toLocaleString()} bytes{artifact.jsonSchema ? ` · ${artifact.jsonSchema}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {manifest.artifactCount > 0 && (
          <div className={`rounded-lg border p-2 ${consistency.structurallyConsistent ? 'border-emerald-300/20 bg-emerald-300/[0.03]' : 'border-rose-300/20 bg-rose-300/[0.03]'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${consistency.structurallyConsistent ? 'text-emerald-200' : 'text-rose-200'}`}>
                MIDI evidence correlation · {consistency.structurallyConsistent ? 'STRUCTURALLY CONSISTENT' : 'REVIEW REQUIRED'}
              </p>
              <span className="text-[9px] text-slate-500">{consistency.hardwareManifestCount} manifests · {consistency.midiMonitorCount} raw MIDI exports</span>
            </div>
            {consistency.links.length > 0 && (
              <div className="mt-2 grid gap-1">
                {consistency.links.map((link) => (
                  <p className="text-[9px] leading-4 text-slate-400" key={`${link.target}-${link.manifestName}`}>
                    <span className="font-semibold text-slate-300">{link.manifestName}</span> → {link.matchedMidiMonitorName ?? 'no unique raw capture'}
                    {link.matchedBankSysexName ? ` → bank ${link.matchedBankSysexName}` : ''}
                    {link.matchedRecoveryBankSysexName ? ` → recovery ${link.matchedRecoveryBankSysexName}` : ''}
                    {link.summaryMismatchFields.length > 0 ? ` · differs: ${link.summaryMismatchFields.join(', ')}` : ''}
                  </p>
                ))}
              </div>
            )}
            {consistency.issues.length > 0 && (
              <ul className="mt-2 grid gap-1 pl-4 text-[9px] leading-4 text-slate-400">
                {consistency.issues.map((issue, index) => (
                  <li className={`list-disc ${issue.severity === 'error' ? 'text-rose-200' : 'text-amber-200'}`} key={`${issue.code}-${index}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[9px] leading-4 text-slate-500">Structural consistency only: matching raw MIDI summary metadata, exact FM-1 bank bytes and stock-DX7 recovery artifact identity can catch mixed-up files, but cannot validate tester observations, device-screen behavior, audio content or a PLAN item.</p>
          </div>
        )}

        {manifest.warnings.length > 0 && (
          <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.03] p-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200">Package review</p>
            <ul className="mt-1 grid gap-1 pl-4 text-[10px] leading-4 text-slate-400">
              {manifest.warnings.map((warning) => <li className="list-disc" key={warning}>{warning}</li>)}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-emerald-200 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40"
            disabled={manifest.artifactCount === 0 || busy}
            onClick={() => saveJson(serializePhysicalEvidencePackageManifest(manifest), 'fm1-physical-evidence-package')}
            type="button"
          >
            Export package index
          </button>
          <button
            className="rounded-lg border border-emerald-200/30 px-3 py-2 text-xs font-semibold text-emerald-100 disabled:opacity-40"
            disabled={manifest.artifactCount === 0 || busy}
            onClick={() => saveJson(serializePhysicalEvidenceConsistencyReport(consistency), 'fm1-physical-evidence-correlation')}
            type="button"
          >
            Export correlation receipt
          </button>
          <button
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-40"
            disabled={manifest.artifactCount === 0 || busy}
            onClick={() => { setArtifacts([]); setError(null) }}
            type="button"
          >
            Clear package
          </button>
        </div>
        <p className="text-[10px] leading-4 text-slate-500">Export both the package index and correlation receipt for closure evidence. FM-1 bank sessions must bind the captured payload to one exact .syx artifact; stock-DX7 evidence must retain exactly one .syx whose SHA-256 equals the manifest recoveryBankSha256. These are evidence-integrity checks only, not proof of device acceptance or recovery success.</p>
      </div>
    </details>
  )
}
