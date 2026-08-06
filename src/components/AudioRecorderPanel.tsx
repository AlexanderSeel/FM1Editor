import { useState } from 'react'
import type { AudioRecordingFormat, AudioRecordingResult } from '../hooks/useAudioRecorder'
import { useAudioRecorder } from '../hooks/useAudioRecorder'

interface AudioRecorderPanelProps {
  patchName: string
  targetMode: string
  bankLabel?: string | null
  selectedBankSlot: number | null
  onSafetyStop?: () => void
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((milliseconds % 1000) / 100)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

function formatSetting(value: number | boolean | null, suffix = ''): string {
  if (value === null) return 'Not reported'
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  return `${value}${suffix}`
}

function saveRecording(result: AudioRecordingResult): void {
  const url = URL.createObjectURL(result.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = result.filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function AudioRecorderPanel({
  patchName,
  targetMode,
  bankLabel,
  selectedBankSlot,
  onSafetyStop,
}: AudioRecorderPanelProps) {
  const [format, setFormat] = useState<AudioRecordingFormat>('wav')
  const recorder = useAudioRecorder({
    filenameMetadata: {
      patchName: patchName || 'UNTITLED',
      targetMode,
      ...(bankLabel ? { bank: bankLabel } : {}),
      ...(selectedBankSlot === null ? {} : { slot: selectedBankSlot + 1 }),
    },
    ...(onSafetyStop ? { onSafetyStop } : {}),
  })
  const connected = recorder.state.connectedDeviceId !== null
  const recording = recorder.state.phase === 'recording'
  const busy = recorder.state.phase === 'requesting'
  const canRecord = connected && !busy && !recording
  const selectedDevice = recorder.devices.find((device) => device.deviceId === recorder.selectedDeviceId)

  const toggleMonitoring = async () => {
    if (!recorder.monitoring) {
      const confirmed = window.confirm(
        'Enable live audio monitoring? Use headphones or very low speaker volume. Monitoring an open microphone through speakers can create loud feedback.',
      )
      if (!confirmed) return
    }
    await recorder.setMonitoring(!recorder.monitoring)
  }

  return (
    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">FM-1 USB audio</p>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Physical verification pending</span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-white">Audio recorder</h3>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400">
            Permission is requested only when you connect. Audio stays in browser memory and is neither uploaded nor stored automatically.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300">
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-emerald-300 shadow-[0_0_8px_rgba(140,230,118,0.75)]' : 'bg-amber-300 shadow-[0_0_8px_rgba(244,201,102,0.55)]'}`}
          />
          {recording ? 'Recording' : connected ? 'Ready' : 'Standby'}
        </span>
      </div>

      {!recorder.supported && (
        <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">
          This browser does not expose the required MediaDevices and Web Audio APIs. Use a current Chromium-based browser over HTTPS or localhost.
        </p>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto]">
        <label className="grid gap-1.5 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-[0.12em]">Audio input</span>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            disabled={!recorder.supported || recording || busy}
            onChange={(event) => recorder.setSelectedDeviceId(event.target.value || null)}
            value={recorder.selectedDeviceId ?? ''}
          >
            <option value="">Browser default input</option>
            {recorder.devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
            ))}
          </select>
          {selectedDevice?.label.toLowerCase().includes('fm-1') && (
            <span className="text-[10px] text-emerald-300">Suggested FM-1-labelled endpoint</span>
          )}
        </label>

        <button
          className="self-end rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!recorder.supported || recording || busy}
          onClick={() => void recorder.connect()}
          type="button"
        >
          {busy ? 'Requesting permission…' : connected ? 'Reconnect selected input' : 'Allow and connect input'}
        </button>

        <button
          className="self-end rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40"
          disabled={!connected || recording}
          onClick={recorder.disconnect}
          type="button"
        >
          Disconnect
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,1fr)]">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <span>Live input level</span>
            <span className={recorder.clipping ? 'text-rose-300' : 'text-slate-500'}>{recorder.clipping ? 'Clipping' : 'Headroom OK'}</span>
          </div>
          <div
            aria-label={`Audio level ${Math.round(recorder.level * 100)} percent`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(recorder.level * 100)}
            className="mt-3 h-4 overflow-hidden rounded-full border border-white/10 bg-slate-950"
            role="meter"
          >
            <div
              className={`h-full transition-[width] duration-75 ${recorder.clipping ? 'bg-rose-400' : 'bg-cyan-300'}`}
              style={{ width: `${Math.max(1, recorder.level * 100)}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <strong className="font-mono text-xl text-white">{formatElapsed(recorder.elapsedMs)}</strong>
            <button
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${recorder.monitoring ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300'}`}
              disabled={!connected || recording}
              onClick={() => void toggleMonitoring()}
              type="button"
            >
              Monitoring {recorder.monitoring ? 'on' : 'off'}
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-amber-200">Monitoring is off by default. Headphones are strongly recommended to avoid feedback.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
          <span className="text-slate-500">Track</span><strong className="truncate text-right text-slate-200">{recorder.diagnostics?.label ?? 'Not connected'}</strong>
          <span className="text-slate-500">Sample rate</span><strong className="text-right text-slate-200">{formatSetting(recorder.diagnostics?.sampleRate ?? null, ' Hz')}</strong>
          <span className="text-slate-500">Channels</span><strong className="text-right text-slate-200">{formatSetting(recorder.diagnostics?.channelCount ?? null)}</strong>
          <span className="text-slate-500">Echo cancellation</span><strong className="text-right text-slate-200">{formatSetting(recorder.diagnostics?.echoCancellation ?? null)}</strong>
          <span className="text-slate-500">Noise suppression</span><strong className="text-right text-slate-200">{formatSetting(recorder.diagnostics?.noiseSuppression ?? null)}</strong>
          <span className="text-slate-500">Auto gain</span><strong className="text-right text-slate-200">{formatSetting(recorder.diagnostics?.autoGainControl ?? null)}</strong>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
        <label className="grid gap-1.5 text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-[0.12em]">Recording format</span>
          <select
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white"
            disabled={recording}
            onChange={(event) => setFormat(event.target.value as AudioRecordingFormat)}
            value={format}
          >
            <option value="wav">Lossless WAV (local PCM)</option>
            <option disabled={!recorder.compressedMimeType} value="compressed">
              {recorder.compressedMimeType ? 'Browser compressed fallback' : 'Compressed fallback unavailable'}
            </option>
          </select>
        </label>
        <button
          className="self-end rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canRecord || (format === 'compressed' && !recorder.compressedMimeType)}
          onClick={() => recorder.startRecording(format)}
          type="button"
        >
          Start recording
        </button>
        <button
          className="self-end rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!recording}
          onClick={() => void recorder.stopRecording()}
          type="button"
        >
          Stop
        </button>
        <button
          className="self-end rounded-xl border border-rose-300/20 bg-rose-300/5 px-4 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-300/10 disabled:opacity-40"
          disabled={!recording && !recorder.result}
          onClick={recorder.cancelRecording}
          type="button"
        >
          Cancel
        </button>
      </div>

      {recorder.result && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3">
          <div className="min-w-0 text-xs">
            <strong className="block truncate text-emerald-200">{recorder.result.filename}</strong>
            <span className="mt-1 block text-slate-400">{recorder.result.mimeType} · {formatElapsed(recorder.result.durationMs)} · audio is not persisted yet</span>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-200" onClick={() => saveRecording(recorder.result!)} type="button">Save recording</button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10" onClick={recorder.clearResult} type="button">Clear</button>
          </div>
        </div>
      )}

      {(recorder.state.error || recorder.status) && (
        <p aria-live="polite" className={`mt-4 text-xs ${recorder.state.error ? 'text-rose-300' : 'text-emerald-300'}`}>
          {recorder.state.error ?? recorder.status}
        </p>
      )}
    </section>
  )
}
