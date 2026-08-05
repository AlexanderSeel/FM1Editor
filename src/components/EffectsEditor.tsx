import { useState } from 'react'
import {
  FM1_FX_PARAMETERS,
  updateFxValue,
  type Fm1FxBlockId,
  type Fm1FxParameterDefinition,
  type Fm1FxState,
} from '../domain/fx'
import { encodeFm1FxParameter, encodeFm1FxState } from '../midi/fxProtocol'
import type { MidiOutputTarget } from '../midi/output'
import { RangeControl } from './RangeControl'

interface EffectsEditorProps {
  state: Fm1FxState
  output: MidiOutputTarget | null
  onChange: (state: Fm1FxState) => void
}

const blockLabels: Record<Fm1FxBlockId, string> = {
  filter: 'Filter',
  reverb: 'Reverb',
  delay: 'Delay',
  distortion: 'Distortion',
  chorus: 'Chorus',
  phaser: 'Phaser',
}

function ParameterControl({
  parameter,
  value,
  onChange,
}: {
  parameter: Fm1FxParameterDefinition
  value: number
  onChange: (value: number) => void
}) {
  if (parameter.kind === 'switch') {
    return (
      <label className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {parameter.label}
        <input
          checked={value === 1}
          className="h-5 w-5 accent-cyan-300"
          onChange={(event) => onChange(event.target.checked ? 1 : 0)}
          type="checkbox"
        />
      </label>
    )
  }

  if (parameter.kind === 'enum') {
    return (
      <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {parameter.label}
        <select
          className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white"
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

export function EffectsEditor({ state, output, onChange }: EffectsEditorProps) {
  const [liveSend, setLiveSend] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sendParameter = async (parameter: Fm1FxParameterDefinition, value: number) => {
    if (!output) return
    try {
      await output.open()
      output.send(encodeFm1FxParameter(state.midiChannel, parameter.id, value).data)
      setStatus(`Sent ${parameter.label} = ${value} on FX channel ${state.midiChannel}.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The FX control could not be sent.')
    }
  }

  const changeParameter = (parameter: Fm1FxParameterDefinition, value: number) => {
    onChange(updateFxValue(state, parameter.id, value))
    if (liveSend) void sendParameter(parameter, value)
  }

  const sendAll = async () => {
    if (!output) {
      setError('Connect Web MIDI and select an output before sending effects.')
      return
    }
    try {
      await output.open()
      const messages = encodeFm1FxState(state)
      messages.forEach((message) => output.send(message.data))
      setStatus(`Sent all ${messages.length} documented FX controls on MIDI channel ${state.midiChannel}.`)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The FX state could not be sent.')
    }
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Documented FX channel</p>
          <h3 className="mt-1 text-xl font-bold text-white">Filter and effects controls</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            These controls use the official CC 0–23 map. Transmission is documented but remains unverified on the physical FM-1 used with this project.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-300">
            <input checked={liveSend} disabled={!output} onChange={(event) => setLiveSend(event.target.checked)} type="checkbox" />
            Live send
          </label>
          <button
            className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!output}
            onClick={() => void sendAll()}
            type="button"
          >
            Send all FX
          </button>
        </div>
        <div className="lg:col-span-2">
          <RangeControl
            label="FX MIDI channel"
            max={16}
            min={1}
            onChange={(midiChannel) => onChange({ ...state, midiChannel })}
            value={state.midiChannel}
          />
        </div>
        {(status || error) && <p className={`text-xs lg:col-span-2 ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}
      </section>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {(Object.keys(blockLabels) as Fm1FxBlockId[]).map((block) => {
          const parameters = FM1_FX_PARAMETERS.filter((parameter) => parameter.block === block)
          return (
            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4" key={block}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h4 className="text-lg font-bold text-white">{blockLabels[block]}</h4>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  CC {parameters[0]?.controller}–{parameters.at(-1)?.controller}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {parameters.map((parameter) => (
                  <ParameterControl
                    key={parameter.id}
                    onChange={(value) => changeParameter(parameter, value)}
                    parameter={parameter}
                    value={state.values[parameter.id] ?? parameter.minimum}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
