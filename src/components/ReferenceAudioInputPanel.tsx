import { useEffect, useRef, useState } from 'react'
import {
  decodeReferenceAudioFile,
  prepareReferenceAudio,
  REFERENCE_AUDIO_MAX_DURATION_SECONDS,
  REFERENCE_AUDIO_MIN_REGION_SECONDS,
  type DecodedReferenceAudio,
  type PreparedReferenceAudio,
} from '../audio/referenceAudio'

interface ReferenceAudioInputPanelProps {
  onPrepared?: (reference: PreparedReferenceAudio | null, decoded: DecodedReferenceAudio | null) => void
}

function compactHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash
}

export function ReferenceAudioInputPanel({ onPrepared }: ReferenceAudioInputPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [decoded, setDecoded] = useState<DecodedReferenceAudio | null>(null)
  const [prepared, setPrepared] = useState<PreparedReferenceAudio | null>(null)
  const [regionStart, setRegionStart] = useState(0)
  const [regionEnd, setRegionEnd] = useState(0)
  const [trimSilence, setTrimSilence] = useState(true)
  const [normalize, setNormalize] = useState(true)
  const [manualPitch, setManualPitch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!decoded) {
      setPrepared(null)
      onPrepared?.(null, null)
      return
    }
    try {
      const next = prepareReferenceAudio(decoded, {
        region: { startSeconds: regionStart, endSeconds: regionEnd },
        trimSilence,
        normalize,
        manualPitchHz: manualPitch.trim() ? Number(manualPitch) : null,
      })
      setPrepared(next)
      setError(null)
      onPrepared?.(next, decoded)
    } catch (cause) {
      setPrepared(null)
      setError(cause instanceof Error ? cause.message : 'Reference audio could not be prepared.')
      onPrepared?.(null, decoded)
    }
  }, [decoded, manualPitch, normalize, onPrepared, regionEnd, regionStart, trimSilence])

  const loadFile = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const next = await decodeReferenceAudioFile(file)
      const initialEnd = Math.min(next.durationSeconds, REFERENCE_AUDIO_MAX_DURATION_SECONDS)
      setDecoded(next)
      setRegionStart(0)
      setRegionEnd(initialEnd)
      setManualPitch('')
    } catch (cause) {
      setDecoded(null)
      setPrepared(null)
      setError(cause instanceof Error ? cause.message : 'Reference audio could not be decoded locally.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const clear = () => {
    setDecoded(null)
    setPrepared(null)
    setRegionStart(0)
    setRegionEnd(0)
    setManualPitch('')
    setError(null)
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.025] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Audio → FM reference</p>
          <h3 className="mt-1 text-lg font-bold text-white">Local WAV / MP3 preparation</h3>
          <p className="mt-2 max-w-4xl text-xs leading-5 text-slate-400">
            Decode and prepare an isolated sound for reconstruction. Audio stays in this browser: this panel has no upload or server path.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
          Local browser only
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          accept=".wav,.mp3,audio/wav,audio/mpeg"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void loadFile(file)
          }}
          ref={inputRef}
          type="file"
        />
        <button
          className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {loading ? 'Decoding locally…' : decoded ? 'Choose another WAV/MP3' : 'Choose WAV/MP3'}
        </button>
        {decoded && <button className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300" onClick={clear} type="button">Clear reference</button>}
      </div>

      {decoded && (
        <>
          <div className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-5">
            <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300"><strong className="block truncate text-white">{decoded.filename}</strong>file</span>
            <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300"><strong className="text-white">{(decoded.sizeBytes / 1024 / 1024).toFixed(2)} MB</strong><br />size</span>
            <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300"><strong className="text-white">{decoded.durationSeconds.toFixed(3)} s</strong><br />decoded duration</span>
            <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300"><strong className="text-white">{decoded.sampleRate} Hz</strong><br />sample rate</span>
            <span className="rounded-xl border border-white/10 bg-black/15 p-3 text-slate-300" title={decoded.contentSha256}><strong className="font-mono text-white">{compactHash(decoded.contentSha256)}</strong><br />SHA-256</span>
          </div>

          <div className="grid gap-4 rounded-xl border border-white/10 bg-black/15 p-4 lg:grid-cols-2">
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Region start · {regionStart.toFixed(3)} s
              <input
                max={Math.max(0, regionEnd - REFERENCE_AUDIO_MIN_REGION_SECONDS)}
                min={0}
                onChange={(event) => setRegionStart(Number(event.target.value))}
                step={0.001}
                type="range"
                value={regionStart}
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Region end · {regionEnd.toFixed(3)} s
              <input
                max={decoded.durationSeconds}
                min={Math.min(decoded.durationSeconds, regionStart + REFERENCE_AUDIO_MIN_REGION_SECONDS)}
                onChange={(event) => setRegionEnd(Number(event.target.value))}
                step={0.001}
                type="range"
                value={regionEnd}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input checked={trimSilence} onChange={(event) => setTrimSilence(event.target.checked)} type="checkbox" />
              Trim leading/trailing silence at −60 dBFS
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input checked={normalize} onChange={(event) => setNormalize(event.target.checked)} type="checkbox" />
              Normalize prepared mono analysis to −1 dBFS peak
            </label>
          </div>

          <label className="grid max-w-sm gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Manual pitch override · Hz
            <input
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm normal-case text-white"
              inputMode="decimal"
              max={5000}
              min={20}
              onChange={(event) => setManualPitch(event.target.value)}
              placeholder={prepared?.detectedPitchHz ? `Detected ${prepared.detectedPitchHz.toFixed(2)} Hz` : 'No override'}
              step="0.01"
              type="number"
              value={manualPitch}
            />
          </label>

          {prepared && (
            <div className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-5">
              <span className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-slate-300"><strong className="text-emerald-200">{prepared.durationSeconds.toFixed(3)} s</strong><br />prepared mono region</span>
              <span className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-slate-300"><strong className="text-emerald-200">{prepared.samples.length}</strong><br />analysis samples</span>
              <span className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-slate-300"><strong className="text-emerald-200">{prepared.detectedPitchHz ? `${prepared.detectedPitchHz.toFixed(2)} Hz` : 'unresolved'}</strong><br />detected pitch</span>
              <span className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-slate-300"><strong className="text-emerald-200">{prepared.analysisPitchHz ? `${prepared.analysisPitchHz.toFixed(2)} Hz` : 'unresolved'}</strong><br />analysis pitch</span>
              <span className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-slate-300"><strong className="text-emerald-200">{prepared.normalizationGain.toFixed(3)}×</strong><br />normalization gain</span>
            </div>
          )}
        </>
      )}

      {error && <p aria-live="polite" className="text-xs text-rose-300">{error}</p>}
      <p className="text-[11px] leading-5 text-slate-500">
        Limits: WAV/MP3 only, 25 MB file maximum, up to 120 s decoded before selecting a region, and at most {REFERENCE_AUDIO_MAX_DURATION_SECONDS} s in the prepared analysis region. Content is identified by local SHA-256; no audio is transmitted by this feature.
      </p>
    </section>
  )
}
