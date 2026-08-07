import type { Fm1FxState } from '../domain/fx'
import { createFm1InspiredFxGraph, type Fm1InspiredFxGraph } from './fm1InspiredFxGraph'

export const VIRTUAL_FM1_MASTER_GAIN_MIN_DB = -48 as const
export const VIRTUAL_FM1_MASTER_GAIN_MAX_DB = 6 as const
export const VIRTUAL_FM1_MASTER_GAIN_DEFAULT_DB = -6 as const

export const VIRTUAL_FM1_LIMITER = Object.freeze({
  thresholdDb: -1,
  kneeDb: 0,
  ratio: 20,
  attackSeconds: 0.003,
  releaseSeconds: 0.1,
})

export interface VirtualFm1OutputRoute {
  readonly input: AudioNode
  readonly limiterOutput: AudioNode
  readonly fx: Fm1InspiredFxGraph
  readonly masterGainDb: number
  readonly fxBypassed: boolean
  setFxState(state: Fm1FxState): void
  setFxBypass(bypassed: boolean): void
  setMasterGainDb(gainDb: number): void
  dispose(): void
}

export function virtualFm1MasterGainLinear(gainDb: number): number {
  if (!Number.isFinite(gainDb) || gainDb < VIRTUAL_FM1_MASTER_GAIN_MIN_DB || gainDb > VIRTUAL_FM1_MASTER_GAIN_MAX_DB) {
    throw new RangeError(`masterGainDb must be between ${VIRTUAL_FM1_MASTER_GAIN_MIN_DB} and ${VIRTUAL_FM1_MASTER_GAIN_MAX_DB}`)
  }
  return Math.pow(10, gainDb / 20)
}

export function createVirtualFm1OutputRoute(
  context: BaseAudioContext,
  initialFxState: Fm1FxState,
  options: { readonly masterGainDb?: number; readonly fxBypassed?: boolean } = {},
): VirtualFm1OutputRoute {
  const fx = createFm1InspiredFxGraph(context, initialFxState)
  const master = context.createGain()
  const limiter = context.createDynamicsCompressor()
  let masterGainDb = options.masterGainDb ?? VIRTUAL_FM1_MASTER_GAIN_DEFAULT_DB
  let fxBypassed = options.fxBypassed ?? true

  limiter.threshold.setValueAtTime(VIRTUAL_FM1_LIMITER.thresholdDb, context.currentTime)
  limiter.knee.setValueAtTime(VIRTUAL_FM1_LIMITER.kneeDb, context.currentTime)
  limiter.ratio.setValueAtTime(VIRTUAL_FM1_LIMITER.ratio, context.currentTime)
  limiter.attack.setValueAtTime(VIRTUAL_FM1_LIMITER.attackSeconds, context.currentTime)
  limiter.release.setValueAtTime(VIRTUAL_FM1_LIMITER.releaseSeconds, context.currentTime)

  fx.output.connect(master).connect(limiter).connect(context.destination)

  const setMasterGainDb = (nextGainDb: number) => {
    masterGainDb = nextGainDb
    master.gain.setValueAtTime(virtualFm1MasterGainLinear(nextGainDb), context.currentTime)
  }
  const setFxBypass = (nextBypassed: boolean) => {
    fxBypassed = nextBypassed
    fx.setBypass(nextBypassed)
  }

  setMasterGainDb(masterGainDb)
  setFxBypass(fxBypassed)

  return {
    input: fx.input,
    limiterOutput: limiter,
    fx,
    get masterGainDb() { return masterGainDb },
    get fxBypassed() { return fxBypassed },
    setFxState(state) { fx.setState(state) },
    setFxBypass,
    setMasterGainDb,
    dispose() {
      fx.dispose()
      try { master.disconnect() } catch { /* already disconnected */ }
      try { limiter.disconnect() } catch { /* already disconnected */ }
    },
  }
}
