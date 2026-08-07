import {
  FM1_FX_PARAMETERS,
  type Fm1FxBlockId,
  type Fm1FxState,
} from '../domain/fx'

export const FM1_INSPIRED_FX_ROUTING = [
  'filter',
  'distortion',
  'chorus',
  'phaser',
  'delay',
  'reverb',
] as const satisfies readonly Fm1FxBlockId[]

export const FM1_INSPIRED_FX_CLAIM =
  'FM1 Editor software approximation; effect algorithms, internal scaling, routing order, stereo behavior and headroom are not known to match physical M-VAVE FM-1 firmware.' as const

export interface Fm1InspiredFxPlan {
  filter: {
    enabled: boolean
    type: BiquadFilterType
    cutoffHz: number
    q: number
  }
  reverb: {
    enabled: boolean
    type: 'room' | 'hall' | 'plate'
    decaySeconds: number
    mix: number
  }
  delay: {
    enabled: boolean
    feedback: number
    delaySeconds: number
    mix: number
  }
  distortion: {
    enabled: boolean
    amount: number
    toneHz: number
    level: number
  }
  chorus: {
    enabled: boolean
    frequencyHz: number
    depthSeconds: number
    mix: number
  }
  phaser: {
    enabled: boolean
    frequencyHz: number
    depthHz: number
    mix: number
  }
}

export interface Fm1InspiredFxGraph {
  readonly input: GainNode
  readonly output: GainNode
  readonly bypassed: boolean
  readonly state: Fm1FxState
  setState(state: Fm1FxState): void
  setBypass(bypassed: boolean): void
  dispose(): void
}

function value(state: Fm1FxState, id: string): number {
  const definition = FM1_FX_PARAMETERS.find((candidate) => candidate.id === id)
  if (!definition) throw new Error(`Unknown FM-1-inspired FX parameter ${id}`)
  const candidate = state.values[id]
  if (candidate === undefined || !Number.isInteger(candidate) || candidate < definition.minimum || candidate > definition.maximum) {
    throw new RangeError(`${id} must be an integer from ${definition.minimum} through ${definition.maximum}`)
  }
  return candidate
}

function normalized(state: Fm1FxState, id: string): number {
  const definition = FM1_FX_PARAMETERS.find((candidate) => candidate.id === id)
  if (!definition) throw new Error(`Unknown FM-1-inspired FX parameter ${id}`)
  const current = value(state, id)
  if (definition.maximum === definition.minimum) return 0
  return (current - definition.minimum) / (definition.maximum - definition.minimum)
}

function exponential(minimum: number, maximum: number, amount: number): number {
  return minimum * Math.pow(maximum / minimum, amount)
}

export function createFm1InspiredFxPlan(state: Fm1FxState): Fm1InspiredFxPlan {
  const filterType = ['lowpass', 'bandpass', 'highpass'] as const
  const reverbType = ['room', 'hall', 'plate'] as const
  return {
    filter: {
      enabled: value(state, 'filter.enabled') === 1,
      type: filterType[value(state, 'filter.type')] ?? 'lowpass',
      cutoffHz: exponential(40, 18_000, normalized(state, 'filter.cutoff')),
      q: 0.1 + normalized(state, 'filter.q') * 14.9,
    },
    reverb: {
      enabled: value(state, 'reverb.enabled') === 1,
      type: reverbType[value(state, 'reverb.type')] ?? 'room',
      decaySeconds: 0.2 + normalized(state, 'reverb.decay') * 5.8,
      mix: normalized(state, 'reverb.mix'),
    },
    delay: {
      enabled: value(state, 'delay.enabled') === 1,
      feedback: normalized(state, 'delay.decay') * 0.88,
      delaySeconds: 0.02 + normalized(state, 'delay.rate') * 0.98,
      mix: normalized(state, 'delay.mix'),
    },
    distortion: {
      enabled: value(state, 'distortion.enabled') === 1,
      amount: normalized(state, 'distortion.gain'),
      toneHz: exponential(500, 12_000, normalized(state, 'distortion.tone')),
      level: normalized(state, 'distortion.level'),
    },
    chorus: {
      enabled: value(state, 'chorus.enabled') === 1,
      frequencyHz: exponential(0.05, 5, normalized(state, 'chorus.frequency')),
      depthSeconds: normalized(state, 'chorus.depth') * 0.012,
      mix: normalized(state, 'chorus.mix'),
    },
    phaser: {
      enabled: value(state, 'phaser.enabled') === 1,
      frequencyHz: exponential(0.05, 4, normalized(state, 'phaser.frequency')),
      depthHz: normalized(state, 'phaser.depth') * 1_400,
      mix: normalized(state, 'phaser.mix'),
    },
  }
}

interface MixBlock {
  input: GainNode
  output: GainNode
  dry: GainNode
  wet: GainNode
  dispose(): void
}

function createMixBlock(context: BaseAudioContext, effectInput: AudioNode, effectOutput: AudioNode): MixBlock {
  const input = context.createGain()
  const output = context.createGain()
  const dry = context.createGain()
  const wet = context.createGain()
  input.connect(dry).connect(output)
  input.connect(effectInput)
  effectOutput.connect(wet).connect(output)
  return {
    input,
    output,
    dry,
    wet,
    dispose() {
      input.disconnect()
      dry.disconnect()
      wet.disconnect()
      effectInput.disconnect()
      effectOutput.disconnect()
      output.disconnect()
    },
  }
}

function setMix(block: MixBlock, enabled: boolean, mix: number, time: number): void {
  const wet = enabled ? Math.max(0, Math.min(1, mix)) : 0
  block.wet.gain.setValueAtTime(wet, time)
  block.dry.gain.setValueAtTime(1 - wet, time)
}

function createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 2048
  const curve = new Float32Array(samples)
  const drive = 1 + amount * 40
  for (let index = 0; index < samples; index += 1) {
    const x = index * 2 / (samples - 1) - 1
    curve[index] = Math.tanh(x * drive) / Math.tanh(drive)
  }
  return curve
}

function seededNoise(index: number, channel: number): number {
  let value = (index + 1) * 0x9e3779b1 ^ (channel + 1) * 0x85ebca6b
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d)
  value ^= value >>> 15
  value = Math.imul(value, 0x846ca68b)
  value ^= value >>> 16
  return (value >>> 0) / 0xffffffff * 2 - 1
}

function createImpulse(context: BaseAudioContext, type: Fm1InspiredFxPlan['reverb']['type'], decaySeconds: number): AudioBuffer {
  const typeScale = type === 'hall' ? 1.35 : type === 'plate' ? 0.82 : 0.62
  const duration = Math.max(0.08, Math.min(8, decaySeconds * typeScale))
  const length = Math.max(1, Math.round(context.sampleRate * duration))
  const buffer = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let index = 0; index < length; index += 1) {
      const progress = index / Math.max(1, length - 1)
      const envelope = Math.pow(1 - progress, type === 'plate' ? 1.8 : type === 'hall' ? 2.8 : 3.8)
      data[index] = seededNoise(index, channel) * envelope * 0.35
    }
  }
  return buffer
}

export function createFm1InspiredFxGraph(context: BaseAudioContext, initialState: Fm1FxState): Fm1InspiredFxGraph {
  let state = initialState
  let bypassed = true
  const input = context.createGain()
  const output = context.createGain()
  const bypassGain = context.createGain()
  const processedGain = context.createGain()

  const filter = context.createBiquadFilter()
  const filterBlock = createMixBlock(context, filter, filter)

  const shaper = context.createWaveShaper()
  const tone = context.createBiquadFilter()
  tone.type = 'lowpass'
  shaper.connect(tone)
  const distortionBlock = createMixBlock(context, shaper, tone)

  const chorusDelay = context.createDelay(0.05)
  const chorusBlock = createMixBlock(context, chorusDelay, chorusDelay)
  const chorusLfo = context.createOscillator()
  const chorusDepth = context.createGain()
  chorusLfo.connect(chorusDepth).connect(chorusDelay.delayTime)
  chorusLfo.start()

  const phaserStages = Array.from({ length: 4 }, () => context.createBiquadFilter())
  phaserStages.forEach((stage) => { stage.type = 'allpass'; stage.Q.value = 0.8 })
  phaserStages.forEach((stage, index) => {
    const next = phaserStages[index + 1]
    if (next) stage.connect(next)
  })
  const phaserBlock = createMixBlock(context, phaserStages[0]!, phaserStages.at(-1)!)
  const phaserLfo = context.createOscillator()
  const phaserDepthNodes = phaserStages.map((stage) => {
    const depth = context.createGain()
    phaserLfo.connect(depth).connect(stage.frequency)
    return depth
  })
  phaserLfo.start()

  const delay = context.createDelay(1.1)
  const feedback = context.createGain()
  delay.connect(feedback).connect(delay)
  const delayBlock = createMixBlock(context, delay, delay)

  const convolver = context.createConvolver()
  const reverbBlock = createMixBlock(context, convolver, convolver)

  const blocks = [filterBlock, distortionBlock, chorusBlock, phaserBlock, delayBlock, reverbBlock] as const
  blocks.forEach((block, index) => {
    const next = blocks[index + 1]
    if (next) block.output.connect(next.input)
  })

  input.connect(bypassGain).connect(output)
  input.connect(filterBlock.input)
  reverbBlock.output.connect(processedGain).connect(output)

  const applyBypass = (nextBypassed: boolean) => {
    bypassed = nextBypassed
    const time = context.currentTime
    bypassGain.gain.setValueAtTime(nextBypassed ? 1 : 0, time)
    processedGain.gain.setValueAtTime(nextBypassed ? 0 : 1, time)
  }

  const applyState = (nextState: Fm1FxState) => {
    const plan = createFm1InspiredFxPlan(nextState)
    const time = context.currentTime

    filter.type = plan.filter.type
    filter.frequency.setValueAtTime(plan.filter.cutoffHz, time)
    filter.Q.setValueAtTime(plan.filter.q, time)
    setMix(filterBlock, plan.filter.enabled, 1, time)

    shaper.curve = createDistortionCurve(plan.distortion.amount)
    shaper.oversample = '2x'
    tone.frequency.setValueAtTime(plan.distortion.toneHz, time)
    const distortionMix = plan.distortion.enabled ? Math.max(0.05, plan.distortion.level) : 0
    setMix(distortionBlock, plan.distortion.enabled, distortionMix, time)

    chorusDelay.delayTime.setValueAtTime(0.015, time)
    chorusLfo.frequency.setValueAtTime(plan.chorus.frequencyHz, time)
    chorusDepth.gain.setValueAtTime(plan.chorus.depthSeconds, time)
    setMix(chorusBlock, plan.chorus.enabled, plan.chorus.mix, time)

    phaserLfo.frequency.setValueAtTime(plan.phaser.frequencyHz, time)
    phaserStages.forEach((stage, index) => {
      stage.frequency.setValueAtTime(500 + index * 350, time)
      phaserDepthNodes[index]?.gain.setValueAtTime(plan.phaser.depthHz, time)
    })
    setMix(phaserBlock, plan.phaser.enabled, plan.phaser.mix, time)

    delay.delayTime.setValueAtTime(plan.delay.delaySeconds, time)
    feedback.gain.setValueAtTime(plan.delay.feedback, time)
    setMix(delayBlock, plan.delay.enabled, plan.delay.mix, time)

    convolver.buffer = createImpulse(context, plan.reverb.type, plan.reverb.decaySeconds)
    setMix(reverbBlock, plan.reverb.enabled, plan.reverb.mix, time)

    state = nextState
  }

  applyState(initialState)
  applyBypass(true)

  return {
    input,
    output,
    get bypassed() { return bypassed },
    get state() { return state },
    setState: applyState,
    setBypass: applyBypass,
    dispose() {
      try { chorusLfo.stop() } catch { /* already stopped */ }
      try { phaserLfo.stop() } catch { /* already stopped */ }
      input.disconnect()
      bypassGain.disconnect()
      processedGain.disconnect()
      blocks.forEach((block) => block.dispose())
      chorusLfo.disconnect()
      chorusDepth.disconnect()
      phaserLfo.disconnect()
      phaserDepthNodes.forEach((node) => node.disconnect())
      feedback.disconnect()
      output.disconnect()
    },
  }
}
