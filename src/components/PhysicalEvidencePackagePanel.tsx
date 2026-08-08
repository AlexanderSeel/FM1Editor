import { useMemo, useState } from 'react'
import {
  createPhysicalEvidencePackageManifest,
  serializePhysicalEvidencePackageManifest,
  type PhysicalEvidenceArtifactInput,
  type PhysicalEvidenceTarget,
} from '../validation/physicalEvidencePackage'

const JSON_INSPECTION_LIMIT_BYTES = 16 * 1024 * 1024

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

async function prepareArtifact(file: File): Promise<PhysicalEvidenceArtifactInput> {
  const sha256 = await sha256File(file)
  const jsonValue = await inspectJson(file)
  return {
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
    sha256,
    ...(jsonValue === undefined ? {} : { jsonValue }),
  }
}

function saveManifest(text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fm1-physical-evidence-package-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function PhysicalEvidencePackagePanel() {
  const [target, setTarget] = useState<PhysicalEvidenceTarget>('fm1')
  const [artifacts, setArtifacts] = useState<readonly PhysicalEvidenceArtifactInput[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manifest = useMemo(() => createPhysicalEvidencePackageManifest(artifacts, { target }), [artifacts, target])

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
          Hash a sanitized physical-test file set locally and export a reproducible package index. File bytes are never uploaded or embedded in the manifest; only filename, size, MIME type, SHA-256, classification and schema hints are retained.
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
            onClick={() => saveManifest(serializePhysicalEvidencePackageManifest(manifest))}
            type="button"
          >
            Export package index
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
        <p className="text-[10px] leading-4 text-slate-500">Warnings describe package coverage only. A complete-looking file set is not proof that any physical check passed; the target-specific evidence manifests and protocols remain authoritative.</p>
      </div>
    </details>
  )
}
