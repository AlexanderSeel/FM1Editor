import { useState } from 'react'
import type { DeviceTarget } from '../domain/deviceTarget'
import {
  createInitializedFxState,
  FM1_FX_PARAMETERS,
  updateFxValue,
  type Fm1FxBlockId,
  type Fm1FxParameterDefinition,
  type Fm1FxState,
} from '../domain/fx'
import type { Dx7Voice } from '../domain/voice'
import { encodeFm1FxParameter, encodeFm1FxState } from '../midi/fxProtocol'
import {
  encodeAllNotesOff,
  encodeProgramChange,
  encodeRealtimeMessage,
  type Fm1RealtimeMessage,
} from '../midi/fm1Protocol'
import type { MidiOutputTarget } from '../midi/output'
import { Dx7FunctionControls } from './Dx7FunctionControls'
import { Dx7VoiceParameterControls } from './Dx7VoiceParameterControls'
import { RangeControl } from './RangeControl'

interface LiveMidiControlsProps {
  target: DeviceTarget
  output: MidiOutputTarget | null
  midiChannel: number
  disabled?: boolean
  fxState?: Fm1FxState
  onFxChange?: (state: Fm1FxState) => void
  voice?: Dx7Voice
  sysexEnabled?: boolean
  dx7HardwareReady?: boolean
}

const blockLabels: Record<Fm1FxBlockId, string> = {
  filter: 'Filter',
  reverb: 'Reverb',
  delay: 'Delay',
  distortion: 'Distortion',
  chorus: 'Chorus',
  phaser: 'Phaser',
}

function FxParameterControl({
  parameter,
  value,
  disabled,
  onChange,
}: {
  parameter: Fm1FxParameterDefinition
  value: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  if (parameter.kind === 'switch') {
    return (
      <label className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {parameter.label}
        <input
          checked={value === 1}
          className="h-4 w-4 accent-cyan-300"
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked ? 1 : 0)}
          type="checkbox"
        />
      </label>
    )
  }

  if (parameter.kind === 'enum') {
    return (
      <label className="grid gap-1.5 rounded-lg border border-white/8 bg-black/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {parameter.label}
        <select
          className="rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-xs normal-case tracking-normal text-white"
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          value={value}
        >
          {parameter.values?.map((label, index) => <option key={label} value={index}>{label}</option>)}
        </select>
      </label>
    )
  }

  return (
    <RangeControl
      label={parameter.label}
      max={parameter.maximum}
      min={parameter.minimum}
      onChange={onChange}
      value={value}
    />
  )
}

export function LiveMidiControls({
  target,
  output,
  midiChannel,
  disabled = false,
  fxState,
  onFxChange,
  voice,
  sysexEnabled = false,
  dx7HardwareReady = false,
}: LiveMidiControlsProps) {
  const [program, setProgram] = useState(1)
  const [localFxState, setLocalFxState] = useState<Fm1FxState>(() => createInitializedFxState())
  const [liveFx, setLiveFx] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fm1Mode = target === 'fm1'
  const programMaximum = fm1Mode ? 128 : 32
  const unavailable = disabled || !output
  const activeFxState = fxState ?? localFxState
  const changeFxState = onFxChange ?? setLocalFxState

  const requireOutput = (): MidiOutputTarget | null => {
    if (disabled) {
      setError('Wait for the current MIDI operation to finish.')
      return null
    }
    if (output) return output
    setError('Connect Web MIDI and manually select an output first.')
    return null
  }

  const send = async (data: Uint8Array, message: string) => {
    const selectedOutput = requireOutput()
    if (!selectedOutput) return
    try {
      await selectedOutput.open()
      selectedOutput.send(data)
      setStatus(message)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The MIDI message could not be sent.')
      setStatus(null)
    }
  }

  const sendProgram = () => void send(
    encodeProgramChange(midiChannel, program - 1),
    `Sent ${fm1Mode ? 'preset' : 'program'} ${program} on MIDI channel ${midiChannel}.`,
  )

  const sendTransport = (message: Fm1RealtimeMessage) => void send(
    encodeRealtimeMessage(message),
    `Sent MIDI ${message === 'clock' ? 'Clock pulse' : message}.`,
  )

  const sendPanic = () => void send(
    encodeAllNotesOff(midiChannel),
    `Sent All Notes Off on MIDI channel ${midiChannel}.`,
  )

  const sendFxParameter = async (parameter: Fm1FxParameterDefinition, value: number, state: Fm1FxState) => {
    const selectedOutput = requireOutput()
    if (!selectedOutput) return
    try {
      await selectedOutput.open()
      selectedOutput.send(encodeFm1FxParameter(state.midiChannel, parameter.id, value).data)
      setStatus(`Sent ${parameter.block} ${parameter.label} = ${value} on FX channel ${state.midiChannel}.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The FX MIDI message could not be sent.')
      setStatus(null)
    }
  }

  const changeFxParameter = (parameter: Fm1FxParameterDefinition, value: number) => {
    const next = updateFxValue(activeFxState, parameter.id, value)
    changeFxState(next)
    if (liveFx) void sendFxParameter(parameter, value, next)
  }

  const sendAllFx = async () => {
    const selectedOutput = requireOutput()
    if (!selectedOutput) return
    try {
      await selectedOutput.open()
      const messages = encodeFm1FxState(activeFxState)
      messages.forEach((message) => selectedOutput.send(message.data))
      setStatus(`Sent all ${messages.length} documented FX controls on MIDI channel ${activeFxState.midiChannel}.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The complete FX state could not be sent.')
      setStatus(null)
    }
  }

  return (
    <section className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.045] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Live MIDI controls</p>
          <h4 className="mt-1 text-lg font-bold text-white">Direct device messages</h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Only documented Program Change, real-time transport, All Notes Off and {fm1Mode ? 'FM-1 CC 0–23 effects' : 'Yamaha DX7 voice parameters 0–155 and function parameters 64–77'} are exposed here.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${output ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/25 bg-amber-300/10 text-amber-200'}`}>
          {output ? output.name || 'Output selected' : 'No output'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(360px,2fr)]">
        <div className="grid content-start gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {fm1Mode ? 'Preset' : 'DX7 program'}
              <select
                className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                disabled={unavailable}
                onChange={(event) => setProgram(Number(event.target.value))}
                value={program}
              >
                {Array.from({ length: programMaximum }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{fm1Mode ? `Preset ${value}` : `Program ${value}`}</option>)}
              </select>
            </label>
            <button className="self-end rounded-lg bg-violet-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-40" disabled={unavailable} onClick={sendProgram} type="button">Select</button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-2 2xl:grid-cols-5">
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-40" disabled={unavailable} onClick={() => sendTransport('start')} type="button">Start</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-40" disabled={unavailable} onClick={() => sendTransport('continue')} type="button">Continue</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-40" disabled={unavailable} onClick={() => sendTransport('stop')} type="button">Stop</button>
            <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-40" disabled={unavailable} onClick={() => sendTransport('clock')} type="button">Clock</button>
            <button className="rounded-lg bg-rose-300/15 px-3 py-2 text-xs font-bold text-rose-200 disabled:opacity-40" disabled={unavailable} onClick={sendPanic} type="button">Panic</button>
          </div>
          <p className="text-[11px] leading-5 text-slate-500">Program changes use MIDI channel {midiChannel}. Transport messages are system real-time and have no channel.</p>
        </div>

        {fm1Mode ? (
          <details className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">Filter and effects · CC 0–23</p>
                  <p className="mt-1 text-xs text-slate-500">Expand all documented live-changeable FM-1 effect parameters.</p>
                </div>
                <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">FX channel {activeFxState.midiChannel}</span>
              </div>
            </summary>

            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                  <input checked={liveFx} disabled={unavailable} onChange={(event) => setLiveFx(event.target.checked)} type="checkbox" />
                  Live send
                </label>
                <button className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40" disabled={unavailable} onClick={() => void sendAllFx()} type="button">Send all FX</button>
              </div>
              <RangeControl label="FX MIDI channel" max={16} min={1} onChange={(midiChannelValue) => changeFxState({ ...activeFxState, midiChannel: midiChannelValue })} value={activeFxState.midiChannel} />
              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {(Object.keys(blockLabels) as Fm1FxBlockId[]).map((block) => {
                  const parameters = FM1_FX_PARAMETERS.filter((parameter) => parameter.block === block)
                  return (
                    <section className="rounded-xl border border-white/10 bg-black/15 p-3" key={block}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h5 className="font-bold text-white">{blockLabels[block]}</h5>
                        <span className="font-mono text-[10px] text-slate-500">CC {parameters[0]?.controller}–{parameters.at(-1)?.controller}</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {parameters.map((parameter) => (
                          <FxParameterControl
                            disabled={disabled}
                            key={parameter.id}
                            onChange={(value) => changeFxParameter(parameter, value)}
                            parameter={parameter}
                            value={activeFxState.values[parameter.id] ?? parameter.minimum}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          </details>
        ) : (
          <div className="grid gap-3">
            {voice && (
              <Dx7VoiceParameterControls
                disabled={disabled}
                hardwareReady={dx7HardwareReady}
                midiChannel={midiChannel}
                output={output}
                sysexEnabled={sysexEnabled}
                voice={voice}
              />
            )}
            <Dx7FunctionControls disabled={disabled} midiChannel={midiChannel} output={output} />
          </div>
        )}
      </div>

      {(status || error) && <p aria-live="polite" className={`mt-3 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}
    </section>
  )
}
