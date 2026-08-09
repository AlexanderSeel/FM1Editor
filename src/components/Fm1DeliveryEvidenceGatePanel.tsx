import { useMemo, useState } from 'react'
import { HARDWARE_EVIDENCE_SCHEMA } from '../validation/hardwareEvidence'
import {
  FM1_REVIEWED_FIRMWARE_SNAPSHOT,
  normalizeFm1FirmwareVersion,
  officialFm1FirmwareSnapshotSummary,
} from '../validation/fm1FirmwareBaseline'
import {
  type Fm1DeliveryEvidenceFile,
} from '../validation/fm1DeliveryEvidenceIntegrity'
import {
  evaluateFm1DeliveryEvidencePackageIntegrity,
  type Fm1DeliveryEvidencePackageIntegrityGate,
} from '../validation/fm1DeliveryEvidencePackageIntegrity'

interface ImportedEvidence extends Fm1DeliveryEvidenceFile {
  readonly parseError: string | null
}

const DEFAULT_PAGES_ORIGIN = 'https://alexanderseel.github.io'
const MISSING_FIRMWARE_BLOCKER = 'Expected FM-1 device firmware is required for current-release delivery. Re-check the official download center, then enter the exact firmware identity shown by the device under test.'

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

function saveGate(gate: Fm1DeliveryEvidencePackageIntegrityGate, files: readonly ImportedEvidence[]): void {
  const payload = {
    ...gate,
    sourceFiles: files.map((file) => ({ filename: file.filename, sha256: file.sha256, parseError: file.parseError })),
  }
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fm1-delivery-evidence-gate-v3-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
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
      result.push({ filename: file.name, sha256, value: null, parseError: cause instanceof Error ? cause.message : 'Could not parse JSON.' })
    }
  }
  return result
}

export function Fm1DeliveryEvidenceGatePanel() {
  const [expectedOrigin, setExpectedOrigin] = useState(DEFAULT_PAGES_ORIGIN)
  const [expectedFirmwareVersion, setExpectedFirmwareVersion] = useState('')
  const [files, setFiles] = useState<readonly ImportedEvidence[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const manifestFiles = useMemo(() => files.filter((file) => isFm1HardwareManifest(file.value)), [files])
  const normalizedExpectedFirmware = normalizeFm1FirmwareVersion(expectedFirmwareVersion)
  const gate = useMemo(() => {
    const evaluated = evaluateFm1DeliveryEvidencePackageIntegrity(files, {
      expectedOrigin,
      expectedFirmwareVersion: normalizedExpectedFirmware || undefined,
    })
    if (normalizedExpectedFirmware) return evaluated
    return {
      ...evaluated,
      ready: false,
      selected: null,
      blockers: [MISSING_FIRMWARE_BLOCKER, ...evaluated.blockers],
      note: `${MISSING_FIRMWARE_BLOCKER} ${evaluated.note}`,
    }
  }, [expectedOrigin, files, normalizedExpectedFirmware])

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

  const v2 = gate.integrityGate

  return (
    <details className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.025] p-3">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">
        FM-1 delivery evidence gate · {gate.ready ? 'READY' : 'BLOCKED'}
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-[11px] leading-5 text-slate-400">
          Import the sanitized Chrome/Edge FM-1 manifests, their raw-MIDI correlation receipts and one physical-evidence package index per browser session. Final v3 READY requires the physical manifest checks, unique manifest-to-raw-MIDI SHA bindings and package coverage for that same manifest/raw capture plus WAV, SysEx and screen/recovery evidence. The official download center currently exposes two differently labelled FM-1 firmware tracks ({officialFm1FirmwareSnapshotSummary()}); their relationship to the firmware identity displayed by the device is not assumed. Re-check the official source at test time and enter the exact device firmware expected for this release session. Files are hashed and inspected locally.
        </p>

        <label className="grid gap-1 text-[10px] text-slate-400">
          Intended HTTPS origin
          <input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" onChange={(event) => setExpectedOrigin(event.target.value)} spellCheck={false} value={expectedOrigin} />
        </label>

        <label className="grid gap-1 text-[10px] text-slate-400">
          Expected FM-1 device firmware for this release session
          <input className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white" onChange={(event) => setExpectedFirmwareVersion(event.target.value)} placeholder="Enter exact device firmware, e.g. V14" spellCheck={false} value={expectedFirmwareVersion} />
          <span className="text-[9px] leading-4 text-slate-500">Required for current-release READY. Official snapshot reviewed {FM1_REVIEWED_FIRMWARE_SNAPSHOT.reviewedAt}: {officialFm1FirmwareSnapshotSummary()}. Do not infer the device version from either download label.</span>
        </label>

        <label className="grid gap-1 text-[10px] text-slate-400">
          Chrome + Edge manifests, correlation receipts and package indexes
          <input accept="application/json,.json" className="block w-full text-[10px] text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-slate-200" multiple onChange={(event) => void importFiles(event.target.files)} type="file" />
        </label>
        {loadError && <p className="rounded-lg border border-rose-300/20 bg-rose-300/5 p-2 text-[10px] text-rose-200">{loadError}</p>}

        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[10px] leading-4 text-slate-400">
          Expected device firmware {normalizedExpectedFirmware || 'not entered'} · official snapshot reviewed {FM1_REVIEWED_FIRMWARE_SNAPSHOT.reviewedAt}<br />
          Imported {files.length} JSON files · FM-1 manifests {v2.manifestFileCount} · correlation receipts {v2.correlationReceiptCount} · package indexes {gate.packageIndexCount}<br />
          Manifest-complete Chrome {v2.baseGate.chromePassingCount} · Edge {v2.baseGate.edgePassingCount}<br />
          Final result <strong className={gate.ready ? 'text-emerald-200' : 'text-amber-200'}>{gate.ready ? 'READY' : 'BLOCKED'}</strong>
          {gate.selected && <><br />Firmware {gate.selected.firmwareVersion} · commit {gate.selected.editorCommit.slice(0, 12)} · {gate.selected.windowsVersion}</>}
        </div>

        {gate.blockers.length > 0 && (
          <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200">Gate blockers</p>
            <ul className="mt-1 list-disc pl-4 text-[10px] leading-4 text-slate-300">{gate.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          </div>
        )}

        {v2.baseGate.manifests.length > 0 && (
          <div className="grid gap-2">
            {v2.baseGate.manifests.map((manifest) => (
              <div className="rounded-lg border border-white/10 bg-black/15 p-2 text-[10px] leading-4 text-slate-400" key={manifest.index}>
                <strong className="text-slate-200">{manifestFiles[manifest.index]?.filename ?? `Manifest ${manifest.index + 1}`}</strong> · {manifest.browser.toUpperCase()} · {manifest.blockers.length === 0 ? 'manifest complete' : `${manifest.blockers.length} blocker(s)`}
                {manifest.blockers.length > 0 && <div className="mt-1 text-slate-500">{manifest.blockers.join(' ')}</div>}
              </div>
            ))}
          </div>
        )}

        {gate.selected && (
          <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.03] p-2 text-[9px] leading-4 text-slate-400">
            {(['chrome', 'edge'] as const).map((browser) => {
              const binding = gate.selected![browser]
              return (
                <div className="mb-2 last:mb-0" key={browser}>
                  <p><strong className="text-emerald-200">{browser === 'chrome' ? 'Chrome' : 'Edge'} session</strong> · {binding.manifestFilename} <span className="font-mono">{binding.manifestSha256.slice(0, 12)}</span> → {binding.rawMidiFilename} <span className="font-mono">{binding.rawMidiSha256.slice(0, 12)}</span></p>
                  <p>Package {binding.packageFilename} <span className="font-mono">{binding.packageSha256.slice(0, 12)}</span> · WAV {binding.audioWavArtifacts.map((artifact) => artifact.sha256.slice(0, 12)).join(', ')} · SysEx {binding.sysexArtifacts.map((artifact) => artifact.sha256.slice(0, 12)).join(', ')}</p>
                </div>
              )
            })}
          </div>
        )}

        {files.some((file) => file.parseError) && (
          <div className="rounded-lg border border-rose-300/15 bg-rose-300/[0.03] p-2 text-[9px] leading-4 text-rose-200">
            {files.filter((file) => file.parseError).map((file) => <p key={file.filename}>{file.filename}: {file.parseError}</p>)}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-emerald-300/20 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40" disabled={files.length === 0} onClick={() => saveGate(gate, files)} type="button">Export v3 gate receipt</button>
          <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-40" disabled={files.length === 0} onClick={() => { setFiles([]); setLoadError(null) }} type="button">Clear imported evidence</button>
        </div>
        <p className="text-[10px] leading-4 text-slate-500">The exported v3 receipt contains validation results, the operator-entered expected device firmware, source filenames, SHA-256 identities and package artifact identities only. Imported manifests, raw MIDI payloads, SysEx bytes and WAV content are not embedded. Package/hash correlation proves evidence linkage and coverage, not hardware behavior.</p>
      </div>
    </details>
  )
}
