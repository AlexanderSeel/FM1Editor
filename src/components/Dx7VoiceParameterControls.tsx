import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import type { MidiOutputTarget } from '../midi/output'
import {
  diffDx7VoiceParameterValues,
  encodeDx7VoiceParameterChange,
  getDx7VoiceParameterValues,
  type Dx7VoiceParameterValue,
} from '../sysex/dx7VoiceParameterChange'

interface Dx7VoiceParameterControlsProps {
  voice: Dx7Voice
  output: MidiOutputTarget | null
  midiChannel: number
  sysexEnabled: boolean
  hardwareReady: boolean
  disabled?: boolean
}

const LIVE_THROTTLE_MS = 75
const MESSAGE_SPACING_MS = 8

export function Dx7VoiceParameterControls({
  voice,
  output,
  midiChannel,
  sysexEnabled,
  hardwareReady,
  disabled = false,
}: Dx7VoiceParameterControlsProps) {
  const [operatorMask, setOperatorMask] = useState(0x3f)
  const [writesEnabled, setWritesEnabled] = useState(false)
  const [liveEnabled, setLiveEnabled] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const values = useMemo(() => getDx7VoiceParameterValues(voice, operatorMask), [operatorMask, voice])
  const observedRef = useRef(values)
  const pendingRef = useRef<Map<number, Dx7VoiceParameterValue>>(new Map())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unavailable = disabled || !output || !sysexEnabled || !hardwareReady

  const clearPending = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = null
    pendingRef.current.clear()
  }, [])

  const transmit = useCallback(async (
    changes: readonly Dx7VoiceParameterValue[],
    description: string,
  ) => {
    if (!output) {
      setError('Connect Web MIDI and manually select the DX7 output first.')
      setStatus(null)
      return
    }
    if (!sysexEnabled) {
      setError('Reconnect Web MIDI with SysEx permission before sending DX7 parameters.')
      setStatus(null)
      return
    }
    if (!hardwareReady) {
      setError('Confirm DX7 System Info and Memory Protect settings before sending parameters.')
      setStatus(null)
      return
    }

    try {
      await output.open()
      const startAt = performance.now() + 5
      changes.forEach((change, index) => {
        output.send(
          encodeDx7VoiceParameterChange(change, midiChannel),
          startAt + (index * MESSAGE_SPACING_MS),
        )
      })
      setStatus(`${description}: scheduled ${changes.length} Yamaha DX7 parameter message${changes.length === 1 ? '' : 's'} on MIDI channel ${midiChannel}.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The DX7 voice parameters could not be sent.')
      setStatus(null)
    }
  }, [hardwareReady, midiChannel, output, sysexEnabled])

  useEffect(() => {
    const changes = diffDx7VoiceParameterValues(observedRef.current, values)
    observedRef.current = values
    if (!liveEnabled || changes.length === 0) return

    changes.forEach((change) => pendingRef.current.set(change.parameter, change))
    if (timerRef.current !== null) return
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      const pending = [...pendingRef.current.values()].sort((left, right) => left.parameter - right.parameter)
      pendingRef.current.clear()
      if (pending.length > 0) void transmit(pending, 'Live update')
    }, LIVE_THROTTLE_MS)
  }, [liveEnabled, transmit, values])

  useEffect(() => {
    if (writesEnabled && !unavailable) return
    setLiveEnabled(false)
    clearPending()
  }, [clearPending, unavailable, writesEnabled])

  useEffect(() => () => clearPending(), [clearPending])

  const enableWrites = () => {
    if (unavailable) {
      setError('Select a SysEx-enabled DX7 output and confirm the hardware settings first.')
      return
    }
    const confirmed = window.confirm(
      'Enable Yamaha DX7 voice-parameter writes for this browser session? Changes target the edit buffer only. Confirm the selected output is the stock DX7, the MIDI channel matches, System Info is available, and Memory Protect is off.',
    )
    if (!confirmed) return
    observedRef.current = values
    setWritesEnabled(true)
    setStatus('DX7 voice-parameter writes enabled for this browser session.')
    setError(null)
  }

  const sendCurrentVoice = () => {
    if (!writesEnabled) {
      setError('Enable DX7 voice-parameter writes first.')
      return
    }
    const confirmed = window.confirm(
      `Send all 156 current edit parameters for “${voice.name || 'UNTITLED'}” on MIDI channel ${midiChannel}? This updates the DX7 edit buffer and operator-enable session state but does not store a numbered internal voice.`,
    )
    if (!confirmed) return
    void transmit(values, 'Current voice')
  }

  const toggleLive = () => {
    if (liveEnabled) {
      setLiveEnabled(false)
      clearPending()
      setStatus('DX7 live voice updates disabled.')
      return
    }
    if (!writesEnabled || unavailable) {
      setError('Enable DX7 voice writes and confirm the hardware settings before enabling live updates.')
      return
    }
    const confirmed = window.confirm(
      `Enable throttled live DX7 voice updates on MIDI channel ${midiChannel}? Every subsequent graphical voice edit will send only changed Yamaha parameters after a ${LIVE_THROTTLE_MS} ms coalescing delay.`,
    )
    if (!confirmed) return
    observedRef.current = values
    setLiveEnabled(true)
    setStatus('DX7 live voice updates enabled.')
    setError(null)
  }

  const toggleOperator = (operatorIndex: number) => {
    const bit = 5 - operatorIndex
    setOperatorMask((current) => current ^ (1 << bit))
  }

  return (
    <details className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">DX7 voice parameters · 0–155</p>
            <p className="mt-1 text-xs text-slate-500">Semantic editor values only; no arbitrary raw parameter entry.</p>
          </div>
          <span className={`rounded-lg border px-3 py-2 text-xs ${liveEnabled ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : writesEnabled ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200' : 'border-amber-300/25 bg-amber-300/10 text-amber-200'}`}>
            {liveEnabled ? 'Live updates' : writesEnabled ? 'Writes enabled' : 'Writes locked'}
          </span>
        </div>
      </summary>

      <div className="mt-4 grid gap-3">
        <div className="flex flex-wrap gap-2">
          {!writesEnabled ? (
            <button className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40" disabled={unavailable} onClick={enableWrites} type="button">
              Enable voice writes
            </button>
          ) : (
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold" onClick={() => {
              setWritesEnabled(false)
              setLiveEnabled(false)
              clearPending()
              setStatus('DX7 voice-parameter writes locked.')
            }} type="button">
              Lock writes
            </button>
          )}
          <button className="rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-40" disabled={unavailable || !writesEnabled} onClick={sendCurrentVoice} type="button">
            Send current 156 parameters
          </button>
          <button className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40 ${liveEnabled ? 'bg-emerald-300 text-slate-950' : 'border border-white/10 bg-white/5 text-slate-200'}`} disabled={unavailable || !writesEnabled} onClick={toggleLive} type="button">
            {liveEnabled ? 'Disable live updates' : 'Enable live updates'}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">Operator enable mask · parameter 155</p>
              <p className="mt-1 text-[11px] text-slate-500">OP1 uses bit 5 through OP6 using bit 0.</p>
            </div>
            <span className="font-mono text-xs text-cyan-200">0x{operatorMask.toString(16).toUpperCase().padStart(2, '0')}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }, (_, operatorIndex) => {
              const enabled = (operatorMask & (1 << (5 - operatorIndex))) !== 0
              return (
                <button
                  aria-pressed={enabled}
                  className={`rounded-lg border px-3 py-2 text-xs font-black ${enabled ? 'border-emerald-300/30 bg-emerald-300/15 text-emerald-200' : 'border-white/10 bg-black/20 text-slate-500'}`}
                  disabled={disabled}
                  key={operatorIndex}
                  onClick={() => toggleOperator(operatorIndex)}
                  type="button"
                >
                  OP{operatorIndex + 1} {enabled ? 'ON' : 'OFF'}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-[11px] leading-5 text-slate-500">
          Full sends are spaced by {MESSAGE_SPACING_MS} ms. Live edits coalesce for {LIVE_THROTTLE_MS} ms and transmit only changed parameters. No dump-request or automatic store command is sent.
        </p>
        {(status || error) && <p aria-live="polite" className={`text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}
      </div>
    </details>
  )
}
