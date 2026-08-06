import { useState } from 'react'
import type { Dx7Curve, Dx7LfoWaveform, Dx7Operator, Dx7Voice, FourValues } from '../domain/voice'
import { EnvelopeGraph } from './EnvelopeGraph'
import { KeyboardScalingGraph } from './KeyboardScalingGraph'
import { OperatorRoutingEditor } from './OperatorRoutingEditor'
import { RangeControl } from './RangeControl'

interface VoiceEditorProps {
  documentKey: number
  voice: Dx7Voice
  onChange: (voice: Dx7Voice) => void
}

const curves: readonly { value: Dx7Curve; label: string }[] = [
  { value: 'negative-linear', label: '-LIN' },
  { value: 'negative-exponential', label: '-EXP' },
  { value: 'positive-exponential', label: '+EXP' },
  { value: 'positive-linear', label: '+LIN' },
]

const waveforms: readonly { value: Dx7LfoWaveform; label: string }[] = [
  { value: 'triangle', label: 'Triangle' },
  { value: 'saw-down', label: 'Saw down' },
  { value: 'saw-up', label: 'Saw up' },
  { value: 'square', label: 'Square' },
  { value: 'sine', label: 'Sine' },
  { value: 'sample-and-hold', label: 'Sample & hold' },
]

function updateFour(values: FourValues, index: number, value: number): FourValues {
  const next = [...values] as [number, number, number, number]
  next[index] = value
  return next
}

function cloneOperators(voice: Dx7Voice): [Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator] {
  return voice.operators.map((operator) => ({
    ...operator,
    envelope: { rates: [...operator.envelope.rates] as FourValues, levels: [...operator.envelope.levels] as FourValues },
    keyboardScaling: { ...operator.keyboardScaling },
  })) as [Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator]
}

export function VoiceEditor({ documentKey, voice, onChange }: VoiceEditorProps) {
  const [selectedOperator, setSelectedOperator] = useState(0)
  const operator = voice.operators[selectedOperator]

  const updateOperator = (updater: (current: Dx7Operator) => Dx7Operator) => {
    const operators = cloneOperators(voice)
    const current = operators[selectedOperator]
    if (!current) return
    operators[selectedOperator] = updater(current)
    onChange({ ...voice, operators })
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="grid flex-1 gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Voice name
              <input
                className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-lg font-bold tracking-[0.08em] text-white outline-none focus:border-cyan-300/60"
                maxLength={10}
                onChange={(event) => onChange({ ...voice, name: event.target.value.toUpperCase() })}
                value={voice.name}
              />
            </label>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Algorithm</p>
              <p className="font-mono text-2xl font-black text-white">{String(voice.algorithm).padStart(2, '0')}</p>
            </div>
          </div>
          <EnvelopeGraph
            accent="violet"
            envelope={voice.pitchEnvelope}
            label="Pitch envelope"
            onChange={(pitchEnvelope) => onChange({ ...voice, pitchEnvelope })}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {voice.pitchEnvelope.rates.map((value, index) => (
              <RangeControl
                key={`pitch-rate-${index}`}
                label={`Pitch rate ${index + 1}`}
                onChange={(next) => onChange({
                  ...voice,
                  pitchEnvelope: {
                    ...voice.pitchEnvelope,
                    rates: updateFour(voice.pitchEnvelope.rates, index, next),
                  },
                })}
                value={value}
              />
            ))}
            {voice.pitchEnvelope.levels.map((value, index) => (
              <RangeControl
                key={`pitch-level-${index}`}
                label={`Pitch level ${index + 1}`}
                onChange={(next) => onChange({
                  ...voice,
                  pitchEnvelope: {
                    ...voice.pitchEnvelope,
                    levels: updateFour(voice.pitchEnvelope.levels, index, next),
                  },
                })}
                value={value}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
          <RangeControl label="Algorithm" max={32} min={1} onChange={(algorithm) => onChange({ ...voice, algorithm })} value={voice.algorithm} />
          <RangeControl label="Feedback" max={7} onChange={(feedback) => onChange({ ...voice, feedback })} value={voice.feedback} />
          <RangeControl label="Transpose" max={48} onChange={(transpose) => onChange({ ...voice, transpose })} value={voice.transpose} />
          <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Osc key sync
            <button
              className={`rounded-lg px-3 py-2 text-sm font-bold tracking-normal ${voice.oscillatorKeySync ? 'bg-emerald-300 text-slate-950' : 'bg-white/8 text-slate-300'}`}
              onClick={() => onChange({ ...voice, oscillatorKeySync: !voice.oscillatorKeySync })}
              type="button"
            >
              {voice.oscillatorKeySync ? 'Enabled' : 'Disabled'}
            </button>
          </label>
        </div>
      </section>

      <OperatorRoutingEditor
        key={documentKey}
        onChange={onChange}
        onSelect={setSelectedOperator}
        selectedOperator={selectedOperator}
        voice={voice}
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        {operator && (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/8 pb-4">
              <div>
                <p className="fm1-hardware-label text-[10px] text-lime-200">Selected operator</p>
                <h3 className="mt-1 text-xl font-black text-white">Operator {selectedOperator + 1}</h3>
              </div>
              <div className="text-right font-mono text-xs text-slate-400">
                <p>{operator.oscillatorMode === 'fixed' ? 'FIXED' : 'RATIO'} {operator.frequencyCoarse}.{String(operator.frequencyFine).padStart(2, '0')}</p>
                <p className="mt-1 text-sky-200">OUTPUT LEVEL {operator.outputLevel}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <div className="grid gap-4">
                <EnvelopeGraph
                  envelope={operator.envelope}
                  label={`Operator ${selectedOperator + 1} amplitude envelope`}
                  onChange={(envelope) => updateOperator((current) => ({ ...current, envelope }))}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {operator.envelope.rates.map((value, index) => (
                    <RangeControl
                      key={`rate-${index}`}
                      label={`Rate ${index + 1}`}
                      onChange={(next) => updateOperator((current) => ({ ...current, envelope: { ...current.envelope, rates: updateFour(current.envelope.rates, index, next) } }))}
                      value={value}
                    />
                  ))}
                  {operator.envelope.levels.map((value, index) => (
                    <RangeControl
                      key={`level-${index}`}
                      label={`Level ${index + 1}`}
                      onChange={(next) => updateOperator((current) => ({ ...current, envelope: { ...current.envelope, levels: updateFour(current.envelope.levels, index, next) } }))}
                      value={value}
                    />
                  ))}
                </div>
              </div>

              <div className="grid content-start gap-3 sm:grid-cols-2">
                <RangeControl label="Output level" onChange={(outputLevel) => updateOperator((current) => ({ ...current, outputLevel }))} value={operator.outputLevel} />
                <RangeControl label="Coarse" max={31} onChange={(frequencyCoarse) => updateOperator((current) => ({ ...current, frequencyCoarse }))} value={operator.frequencyCoarse} />
                <RangeControl label="Fine" onChange={(frequencyFine) => updateOperator((current) => ({ ...current, frequencyFine }))} value={operator.frequencyFine} />
                <RangeControl label="Detune" max={14} onChange={(detune) => updateOperator((current) => ({ ...current, detune }))} value={operator.detune} />
                <RangeControl label="Velocity" max={7} onChange={(keyVelocitySensitivity) => updateOperator((current) => ({ ...current, keyVelocitySensitivity }))} value={operator.keyVelocitySensitivity} />
                <RangeControl label="Amp mod" max={3} onChange={(amplitudeModulationSensitivity) => updateOperator((current) => ({ ...current, amplitudeModulationSensitivity }))} value={operator.amplitudeModulationSensitivity} />

                <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Oscillator mode
                  <select
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white"
                    onChange={(event) => updateOperator((current) => ({ ...current, oscillatorMode: event.target.value as Dx7Operator['oscillatorMode'] }))}
                    value={operator.oscillatorMode}
                  >
                    <option value="ratio">Ratio</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-4 border-t border-white/8 pt-4 xl:grid-cols-[1.35fr_1fr]">
              <KeyboardScalingGraph
                label={`Operator ${selectedOperator + 1} keyboard scaling`}
                onChange={(keyboardScaling) => updateOperator((current) => ({ ...current, keyboardScaling }))}
                scaling={operator.keyboardScaling}
              />

              <div className="grid content-start gap-3 sm:grid-cols-2">
                <RangeControl
                  label="Break point"
                  onChange={(breakPoint) => updateOperator((current) => ({ ...current, keyboardScaling: { ...current.keyboardScaling, breakPoint } }))}
                  value={operator.keyboardScaling.breakPoint}
                />
                <RangeControl
                  label="Rate scaling"
                  max={7}
                  onChange={(rateScaling) => updateOperator((current) => ({ ...current, keyboardScaling: { ...current.keyboardScaling, rateScaling } }))}
                  value={operator.keyboardScaling.rateScaling}
                />
                <RangeControl
                  label="Left depth"
                  onChange={(leftDepth) => updateOperator((current) => ({ ...current, keyboardScaling: { ...current.keyboardScaling, leftDepth } }))}
                  value={operator.keyboardScaling.leftDepth}
                />
                <RangeControl
                  label="Right depth"
                  onChange={(rightDepth) => updateOperator((current) => ({ ...current, keyboardScaling: { ...current.keyboardScaling, rightDepth } }))}
                  value={operator.keyboardScaling.rightDepth}
                />

                {(['leftCurve', 'rightCurve'] as const).map((side) => (
                  <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400" key={side}>
                    {side === 'leftCurve' ? 'Left curve' : 'Right curve'}
                    <select
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white"
                      onChange={(event) => updateOperator((current) => ({ ...current, keyboardScaling: { ...current.keyboardScaling, [side]: event.target.value as Dx7Curve } }))}
                      value={operator.keyboardScaling[side]}
                    >
                      {curves.map((curve) => <option key={curve.value} value={curve.value}>{curve.label}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Modulation</p>
            <h3 className="mt-1 text-xl font-bold text-white">Low-frequency oscillator</h3>
          </div>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-bold ${voice.lfo.keySync ? 'bg-violet-300 text-slate-950' : 'bg-white/8 text-slate-300'}`}
            onClick={() => onChange({ ...voice, lfo: { ...voice.lfo, keySync: !voice.lfo.keySync } })}
            type="button"
          >
            Key sync {voice.lfo.keySync ? 'on' : 'off'}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Waveform
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-white"
              onChange={(event) => onChange({ ...voice, lfo: { ...voice.lfo, waveform: event.target.value as Dx7LfoWaveform } })}
              value={voice.lfo.waveform}
            >
              {waveforms.map((waveform) => <option key={waveform.value} value={waveform.value}>{waveform.label}</option>)}
            </select>
          </label>
          <RangeControl label="Speed" onChange={(speed) => onChange({ ...voice, lfo: { ...voice.lfo, speed } })} value={voice.lfo.speed} />
          <RangeControl label="Delay" onChange={(delay) => onChange({ ...voice, lfo: { ...voice.lfo, delay } })} value={voice.lfo.delay} />
          <RangeControl label="Pitch depth" onChange={(pitchModulationDepth) => onChange({ ...voice, lfo: { ...voice.lfo, pitchModulationDepth } })} value={voice.lfo.pitchModulationDepth} />
          <RangeControl label="Amp depth" onChange={(amplitudeModulationDepth) => onChange({ ...voice, lfo: { ...voice.lfo, amplitudeModulationDepth } })} value={voice.lfo.amplitudeModulationDepth} />
          <RangeControl label="Pitch sens" max={7} onChange={(pitchModulationSensitivity) => onChange({ ...voice, lfo: { ...voice.lfo, pitchModulationSensitivity } })} value={voice.lfo.pitchModulationSensitivity} />
        </div>
      </section>
    </div>
  )
}
