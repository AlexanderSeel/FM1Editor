import { useCallback, useEffect, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import type { PreparedReferenceAudio } from '../audio/referenceAudio'
import {
  createReconstructionUploadConsent,
  discoverReconstructionAccelerator,
  getConfiguredReconstructionAcceleratorUrl,
  submitReconstructionAcceleration,
  type DiscoveredReconstructionAccelerator,
  type ReconstructionAccelerationResult,
  type ReconstructionUploadConsent,
} from '../audio/reconstructionAcceleration'

interface ReconstructionAccelerationPanelProps {
  reference: PreparedReferenceAudio | null
  onLoadVoice: (voice: Dx7Voice) => void
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

function candidateDistance(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : value.toFixed(5)
}

export function ReconstructionAccelerationPanel({ reference, onLoadVoice }: ReconstructionAccelerationPanelProps) {
  const configuredUrl = getConfiguredReconstructionAcceleratorUrl()
  const [discovered, setDiscovered] = useState<DiscoveredReconstructionAccelerator | null>(null)
  const [consent, setConsent] = useState<ReconstructionUploadConsent | null>(null)
  const [result, setResult] = useState<ReconstructionAccelerationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setConsent(null)
    setResult(null)
    setStatus(null)
    setError(null)
  }, [reference?.contentSha256])

  const discover = useCallback(async () => {
    if (!configuredUrl) return
    setBusy(true)
    setConsent(null)
    setResult(null)
    setError(null)
    setStatus('Checking service identity, model metadata and retention/deletion policy…')
    try {
      const next = await discoverReconstructionAccelerator(configuredUrl)
      setDiscovered(next)
      setStatus('Capability policy accepted. No reference audio has been uploaded.')
    } catch (cause) {
      setDiscovered(null)
      setStatus(null)
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }, [configuredUrl])

  const toggleConsent = useCallback((checked: boolean) => {
    setResult(null)
    setError(null)
    if (!checked || !reference || !discovered) {
      setConsent(null)
      return
    }
    try {
      setConsent(createReconstructionUploadConsent(reference, discovered))
    } catch (cause) {
      setConsent(null)
      setError(errorMessage(cause))
    }
  }, [discovered, reference])

  const submit = useCallback(async () => {
    if (!reference || !discovered || !consent) return
    setBusy(true)
    setError(null)
    setStatus('Uploading only the prepared selected region under the one-shot consent…')
    try {
      const next = await submitReconstructionAcceleration(reference, discovered, consent)
      setResult(next)
      setConsent(null)
      setStatus(`Remote acceleration returned ${next.candidates.length} validated DX7 candidate${next.candidates.length === 1 ? '' : 's'} and a retention receipt.`)
    } catch (cause) {
      setConsent(null)
      setStatus(null)
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }, [consent, discovered, reference])

  const referenceReady = Boolean(reference?.filename && reference.contentSha256)

  return (
    <section className="mt-4 rounded-2xl border border-sky-300/15 bg-sky-300/[0.025] p-4" aria-label="Optional reconstruction acceleration">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">Optional acceleration · explicit upload only</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Normal editing, audition, retrieval and CMA-ES remain fully local. A configured external worker is optional and never receives audio during capability discovery. Before any upload, the app requires HTTPS (localhost excepted), complete service/model metadata, automatic deletion with a bounded retention window, and one-shot consent tied to this reference SHA-256.
          </p>
        </div>
        <span className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
          {configuredUrl ? 'SERVICE CONFIGURED' : 'LOCAL ONLY'}
        </span>
      </div>

      {!configuredUrl ? (
        <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.025] p-3 text-xs leading-5 text-emerald-100">
          No accelerator URL is configured. Local reconstruction remains the only execution path. Deployments may opt in with <code className="font-mono text-[11px]">VITE_RECONSTRUCTION_ACCELERATOR_URL</code>; the application does not provide a default remote endpoint.
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-xl border border-sky-200/30 px-4 py-2.5 text-sm font-bold text-sky-100 disabled:opacity-40"
              disabled={busy}
              onClick={() => void discover()}
              type="button"
            >
              {discovered ? 'Re-check service policy' : 'Check configured service policy'}
            </button>
            <span className="self-center break-all text-[10px] text-slate-500">{configuredUrl}</span>
          </div>

          {discovered && (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Service</p>
                  <p className="mt-1 text-slate-200">{discovered.capabilities.serviceId} · {discovered.capabilities.serviceVersion}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Model</p>
                  <p className="mt-1 text-slate-200">{discovered.capabilities.model.id} · {discovered.capabilities.model.version}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{discovered.capabilities.model.kind} · {discovered.capabilities.model.licenseSpdx}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Retention</p>
                  <p className="mt-1 text-slate-200">{discovered.capabilities.retention.mode} · max {discovered.capabilities.retention.maxSeconds}s · automatic deletion</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Upload limit</p>
                  <p className="mt-1 text-slate-200">{Math.round(discovered.capabilities.accepts.maxBytes / 1024)} KiB · {discovered.capabilities.accepts.mimeTypes.join(', ')}</p>
                </div>
                <p className="sm:col-span-2 text-[11px] leading-5 text-slate-500">{discovered.capabilities.retention.statement}</p>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-amber-200/15 bg-amber-200/[0.025] p-3 text-xs leading-5 text-slate-300">
                <input
                  checked={consent !== null}
                  className="mt-1"
                  disabled={!referenceReady || busy}
                  onChange={(event) => toggleConsent(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I explicitly consent to upload only this prepared selected region to <strong>{discovered.origin}</strong> under the policy shown above. Consent is bound to the current file hash and service/model versions, expires after 15 minutes, and is consumed after one request.
                </span>
              </label>

              <button
                className="w-fit rounded-xl bg-sky-200 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!consent || !referenceReady || busy}
                onClick={() => void submit()}
                type="button"
              >
                Send selected region for optional acceleration
              </button>
            </div>
          )}
        </>
      )}

      {status && <p className="mt-3 text-xs text-emerald-200">{status}</p>}
      {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}

      {result && (
        <div className="mt-4 grid gap-3" data-remote-acceleration-result="true">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-400">
            <p className="font-bold text-slate-200">Request {result.requestId}</p>
            <p className="mt-1">{result.serviceId} {result.serviceVersion} · {result.modelId} {result.modelVersion}</p>
            <p className="mt-1 text-[11px] text-emerald-200">
              Retention receipt: {result.retentionReceipt.referenceDeleted ? `deleted${result.retentionReceipt.deletedAt ? ` at ${result.retentionReceipt.deletedAt}` : ''}` : `delete by ${result.retentionReceipt.deleteBy}`}
            </p>
          </div>
          {result.candidates.map((candidate, index) => (
            <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200/15 bg-sky-200/[0.02] p-3" key={`${result.requestId}:${index}`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200">Remote candidate #{index + 1} · distance {candidateDistance(candidate.distance)}</p>
                <p className="mt-1 font-bold text-white">{candidate.voice.name || 'UNTITLED'}</p>
                <p className="mt-1 text-[11px] text-slate-500">{candidate.sourceInitialization}</p>
              </div>
              <button className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950" onClick={() => onLoadVoice(candidate.voice)} type="button">
                Load candidate
              </button>
            </article>
          ))}
          {result.candidates.length === 0 && <p className="text-xs text-amber-200">The compliant service returned no candidate voices.</p>}
        </div>
      )}
    </section>
  )
}
