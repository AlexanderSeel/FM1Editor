import { useEffect, useMemo, useState } from 'react'
import type { Dx7FunctionParameterId } from '../domain/dx7FunctionState'
import type { MidiOutputTarget } from '../midi/output'
import {
  DX7_FUNCTION_PARAMETERS,
  encodeDx7FunctionParameterChange,
  getDx7FunctionParameterDefinition,
} from '../sysex/dx7ParameterChange'
import { RangeControl } from './RangeControl'

interface Dx7FunctionControlsProps {
  output: MidiOutputTarget | null
  midiChannel: number
  sysexEnabled?: boolean
  hardwareReady?: boolean
  disabled?: boolean
}

function assignmentLabel(value: number): string {
  if (value === 0) return '0 · none'
  const destinations = [
    (value & 0x01) !== 0 ? 'pitch' : null,
    (value & 0x02) !== 0 ? 'amplitude' : null,
    (value & 0x04) !== 0 ? 'EG bias' : null,
  ].filter(Boolean)
  return `${value} · ${destinations.join(' + ')}`
}

function parameterValueOptions(parameter: Dx7FunctionParameterId): readonly string[] | null {
  if (parameter === 64) return ['Poly', 'Mono']
  if (parameter === 67) return ['Retain', 'Follow']
  if (parameter === 68) return ['Off', 'On']
  return null
}

export function Dx7FunctionControls({
  output,
  midiChannel,
  sysexEnabled,
  hardwareReady,
  disabled = false,
}: Dx7FunctionControlsProps) {
  const [parameter, setParameter] = useState<Dx7FunctionParameterId>(64)
  const [value, setValue] = useState(0)
  const [writesEnabled, setWritesEnabled] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const definition = useMemo(() => getDx7FunctionParameterDefinition(parameter), [parameter])
  const valueOptions = parameterValueOptions(parameter)
  const assignmentParameter = parameter === 71 || parameter === 73 || parameter === 75 || parameter === 77
  const gateProvided = sysexEnabled !== undefined && hardwareReady !== undefined
  const unavailable = disabled || !output || sysexEnabled !== true || hardwareReady !== true

  useEffect(() => {
    if (!unavailable) return
    setWritesEnabled(false)
  }, [unavailable])

  const selectParameter = (nextParameter: Dx7FunctionParameterId) => {
    const nextDefinition = getDx7FunctionParameterDefinition(nextParameter)
    setParameter(nextParameter)
    setValue(nextDefinition.minimum)
    setStatus(null)
    setError(null)
  }

  const enableWrites = () => {
    if (unavailable) {
      setError('Select a SysEx-enabled DX7 output and confirm System Info and Memory Protect first.')
      return
    }
    const confirmed = window.confirm(
      'Enable documented Yamaha DX7 function-parameter writes for this session? Confirm the selected target is a stock DX7, the MIDI channel matches, System Info is available, and Memory Protect is off. These messages change performance/function settings, not the 155-byte voice payload.',
    )
    if (!confirmed) return
    setWritesEnabled(true)
    setError(null)
    setStatus('DX7 function writes enabled for this browser session.')
  }

  const sendParameter = async () => {
    if (!output) {
      setError('Connect Web MIDI and manually select the DX7 output first.')
      setStatus(null)
      return
    }
    if (sysexEnabled !== true || hardwareReady !== true) {
      setError('Confirm SysEx permission, System Info, and Memory Protect before sending a function parameter.')
      setStatus(null)
      return
    }
    if (!writesEnabled) {
      setError('Enable DX7 function writes before sending a parameter.')
      setStatus(null)
      return
    }

    const confirmed = window.confirm(
      `Send DX7 ${definition.label} = ${value} on MIDI channel ${midiChannel}? Confirm the DX7 channel matches, System Info is available, and Memory Protect is off.`,
    )
    if (!confirmed) return

    try {
      await output.open()
      output.send(encodeDx7FunctionParameterChange(parameter, value, midiChannel))
      setStatus(`Sent DX7 ${definition.label} = ${value} on MIDI channel ${midiChannel}.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The DX7 function parameter could not be sent.')
      setStatus(null)
    }
  }

  if (!gateProvided) return null

  return (
    <details className="min-w-0 rounded-xl border border-violet-300/15 bg-black/15 p-3">
      <summary className="min-w-0 cursor-pointer list-none">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="break-words text-xs font-bold uppercase tracking-[0.14em] text-violet-300">DX7 function parameters · 64–77</p>
            <p className="mt-1 break-words text-xs text-slate-500">Primary-source Yamaha parameter changes with semantic range checks and per-send confirmation.</p>
          </div>
          <span className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${writesEnabled ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/25 bg-amber-300/10 text-amber-200'}`}>
            {writesEnabled ? 'Writes enabled' : 'Writes locked'}
          </span>
        </div>
      </summary>

      <div className="mt-4 grid min-w-0 gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {!writesEnabled ? (
            <button
              className="rounded-lg bg-violet-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40"
              disabled={unavailable}
              onClick={enableWrites}
              type="button"
            >
              Enable function writes
            </button>
          ) : (
            <button
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold"
              onClick={() => {
                setWritesEnabled(false)
                setStatus('DX7 function writes disabled.')
              }}
              type="button"
            >
              Lock writes
            </button>
          )}
          <span className="min-w-0 break-words text-xs text-slate-500">MIDI channel {midiChannel} · no dump-request message is sent</span>
        </div>

        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_auto]">
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Function parameter
            <select
              className="min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white"
              disabled={disabled}
              onChange={(event) => selectParameter(Number(event.target.value) as Dx7FunctionParameterId)}
              value={parameter}
            >
              {DX7_FUNCTION_PARAMETERS.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.id} · {candidate.label}</option>
              ))}
            </select>
          </label>

          {valueOptions ? (
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Value
              <select
                className="min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white"
                disabled={disabled || !writesEnabled}
                onChange={(event) => setValue(Number(event.target.value))}
                value={value}
              >
                {valueOptions.map((label, index) => <option key={label} value={index}>{index} · {label}</option>)}
              </select>
            </label>
          ) : assignmentParameter ? (
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Assignment mask
              <select
                className="min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white"
                disabled={disabled || !writesEnabled}
                onChange={(event) => setValue(Number(event.target.value))}
                value={value}
              >
                {Array.from({ length: 8 }, (_, index) => <option key={index} value={index}>{assignmentLabel(index)}</option>)}
              </select>
            </label>
          ) : (
            <RangeControl
              label={`${definition.label} (${definition.minimum}–${definition.maximum})`}
              max={definition.maximum}
              min={definition.minimum}
              onChange={setValue}
              value={value}
            />
          )}

          <button
            className="self-end rounded-lg bg-violet-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-40"
            disabled={unavailable || !writesEnabled}
            onClick={() => void sendParameter()}
            type="button"
          >
            Send parameter
          </button>
        </div>

        <p className="break-words text-[11px] leading-5 text-slate-500">
          Assignment masks use bit 0 = pitch, bit 1 = amplitude, and bit 2 = EG bias. Function state remains separate from voice files and bank payloads.
        </p>
        {(status || error) && <p aria-live="polite" className={`break-words text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}
      </div>
    </details>
  )
}
