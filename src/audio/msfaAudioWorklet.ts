import {
  encodeDx7ControllerAssignment,
  type Dx7ControllerFunction,
} from '../domain/dx7FunctionState'
import type { Dx7Voice } from '../domain/voice'
import { createMsfaCompatibleVoiceBridge } from './msfaVoiceBridge'
import {
  MSFA_OFFLINE_ENGINE_ID,
  MSFA_OFFLINE_ENGINE_LICENSE,
  MSFA_OFFLINE_ENGINE_VERSION,
} from './msfaOfflineEngine'
import { createVirtualDx7RenderPlan, type VirtualDx7SampleRate } from './virtualDx7Engine'

export const MSFA_WORKLET_PROCESSOR_NAME = 'fm1-msfa-one-voice' as const
export const MSFA_WORKLET_SCRIPT_PATH = 'virtual-dx7/fm1-msfa-worklet.js' as const
export const MSFA_WORKLET_MANIFEST_PATH = 'virtual-dx7/manifest.json' as const
export const MSFA_WORKLET_WASM_PATH = 'virtual-dx7/fm1-msfa.wasm' as const
export const MSFA_WORKLET_READY_TIMEOUT_MS = 5_000 as const
export const MSFA_WORKLET_POLYPHONY = 16 as const
export const MSFA_WORKLET_PERFORMANCE_ABI = 1 as const

export type MsfaAudioWorkletState = 'disabled' | 'enabling' | 'ready' | 'error' | 'closed'

export interface MsfaLocalPerformanceConfig {
  pitchBendRange: number
  pitchBendStep: number
  modulationWheel: Dx7ControllerFunction
  aftertouch: Dx7ControllerFunction
}

export function createDefaultMsfaLocalPerformanceConfig(): MsfaLocalPerformanceConfig {
  return {
    pitchBendRange: 3,
    pitchBendStep: 0,
    modulationWheel: {
      range: 0,
      assignment: { pitch: false, amplitude: false, egBias: false },
    },
    aftertouch: {
      range: 0,
      assignment: { pitch: false, amplitude: false, egBias: false },
    },
  }
}

interface MsfaWorkletManifest {
  engineId: string
  engineVersion: string
  licenseSpdx: string
  wasm: {
    path: string
    sha256: string
  }
  statefulSessionAbi: number
  renderBlockFrames: number
  workletPolyphony: number
  performanceControlAbi: number
}

export interface MsfaWorkletPackage {
  manifest: MsfaWorkletManifest
  wasmBinary: ArrayBuffer
}

interface AudioContextLike {
  readonly sampleRate: number
  readonly state: AudioContextState
  readonly destination: AudioNode
  readonly audioWorklet: Pick<AudioWorklet, 'addModule'>
  resume(): Promise<void>
  close(): Promise<void>
}

interface WorkletPortLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  postMessage(message: unknown): void
}

interface AudioWorkletNodeLike {
  readonly port: WorkletPortLike
  onprocessorerror: ((event: ErrorEvent) => void) | null
  connect(destination: AudioNode): unknown
  disconnect(): void
}

export interface MsfaAudioWorkletOutputRoute {
  readonly destination: AudioNode
  dispose?(): void
}

export interface MsfaAudioWorkletDependencies {
  createAudioContext?: () => AudioContextLike
  createAudioWorkletNode?: (
    context: AudioContextLike,
    name: string,
    options: AudioWorkletNodeOptions,
  ) => AudioWorkletNodeLike
  loadPackage?: () => Promise<MsfaWorkletPackage>
  /** Optional browser-audio route used by richer local preview targets. Default remains direct dry destination. */
  createOutputRoute?: (context: AudioContext) => MsfaAudioWorkletOutputRoute
  readyTimeoutMs?: number
}

export interface MsfaAudioWorkletDiagnostics {
  readonly callbacks: number
  readonly meanRenderMs: number
  readonly maxRenderMs: number
  readonly budgetMs: number
  readonly meanUtilization: number
  readonly maxUtilization: number
  readonly overBudgetCallbacks: number
  readonly activeVoices: number
  readonly polyphony: number
  readonly clock?: 'performance' | 'date'
}

export interface MsfaAudioWorkletController {
  readonly engineId: typeof MSFA_OFFLINE_ENGINE_ID
  readonly engineVersion: typeof MSFA_OFFLINE_ENGINE_VERSION
  readonly licenseSpdx: typeof MSFA_OFFLINE_ENGINE_LICENSE
  readonly polyphony: typeof MSFA_WORKLET_POLYPHONY
  readonly performanceControlAbi: typeof MSFA_WORKLET_PERFORMANCE_ABI
  readonly state: MsfaAudioWorkletState
  readonly sampleRate: number | null
  readonly diagnostics: MsfaAudioWorkletDiagnostics | null
  enable(): Promise<void>
  loadVoice(voice: Dx7Voice, randomSeed?: number): Promise<void>
  configurePerformance(config: MsfaLocalPerformanceConfig): Promise<void>
  setPitchBend(value: number): Promise<void>
  setModulation(value: number): Promise<void>
  setSustain(enabled: boolean): Promise<void>
  setAftertouch(value: number): Promise<void>
  noteOn(midiNote: number, velocity: number): Promise<void>
  noteOff(midiNote?: number): Promise<void>
  allNotesOff(): Promise<void>
  close(): Promise<void>
}

function publicAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${base}${path}`
}

function isSupportedSampleRate(value: number): value is VirtualDx7SampleRate {
  return value === 44_100 || value === 48_000
}

function integerRange(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} through ${maximum}`)
  }
  return value
}

function validatePerformanceConfig(config: MsfaLocalPerformanceConfig): {
  pitchBendRange: number
  pitchBendStep: number
  modulationRange: number
  modulationAssignment: number
  aftertouchRange: number
  aftertouchAssignment: number
} {
  const pitchBendRange = integerRange(config.pitchBendRange, 0, 12, 'pitchBendRange')
  const pitchBendStep = integerRange(config.pitchBendStep, 0, 12, 'pitchBendStep')
  const modulationRange = integerRange(config.modulationWheel.range, 0, 99, 'modulationWheel.range')
  const aftertouchRange = integerRange(config.aftertouch.range, 0, 99, 'aftertouch.range')
  return {
    pitchBendRange,
    pitchBendStep,
    modulationRange,
    modulationAssignment: encodeDx7ControllerAssignment(config.modulationWheel.assignment),
    aftertouchRange,
    aftertouchAssignment: encodeDx7ControllerAssignment(config.aftertouch.assignment),
  }
}

function parseManifest(value: unknown): MsfaWorkletManifest {
  if (!value || typeof value !== 'object') throw new Error('Virtual DX7 manifest is not an object')
  const manifest = value as Partial<MsfaWorkletManifest>
  if (manifest.engineId !== MSFA_OFFLINE_ENGINE_ID) throw new Error('Virtual DX7 manifest engine id does not match the application')
  if (manifest.engineVersion !== MSFA_OFFLINE_ENGINE_VERSION) throw new Error('Virtual DX7 manifest engine version does not match the application')
  if (manifest.licenseSpdx !== MSFA_OFFLINE_ENGINE_LICENSE) throw new Error('Virtual DX7 manifest license does not match the audited engine')
  if (!manifest.wasm || manifest.wasm.path !== 'fm1-msfa.wasm' || !/^[0-9a-f]{64}$/.test(manifest.wasm.sha256)) {
    throw new Error('Virtual DX7 manifest has an invalid WASM identity')
  }
  if (manifest.statefulSessionAbi !== 1) throw new Error('Virtual DX7 stateful session ABI is not supported')
  if (manifest.renderBlockFrames !== 64) throw new Error('Virtual DX7 render block size is not supported')
  if (manifest.workletPolyphony !== MSFA_WORKLET_POLYPHONY) {
    throw new Error(`Virtual DX7 manifest polyphony must be ${MSFA_WORKLET_POLYPHONY}`)
  }
  if (manifest.performanceControlAbi !== MSFA_WORKLET_PERFORMANCE_ABI) {
    throw new Error(`Virtual DX7 manifest performance-control ABI must be ${MSFA_WORKLET_PERFORMANCE_ABI}`)
  }
  return manifest as MsfaWorkletManifest
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is required to verify the local virtual DX7 engine')
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

export async function verifyMsfaWorkletPackage(
  manifestValue: unknown,
  wasmBinary: ArrayBuffer,
  digest: (bytes: ArrayBuffer) => Promise<string> = sha256Hex,
): Promise<MsfaWorkletPackage> {
  const manifest = parseManifest(manifestValue)
  const actualHash = await digest(wasmBinary)
  if (actualHash !== manifest.wasm.sha256) {
    throw new Error(`Virtual DX7 WASM hash mismatch: ${actualHash}`)
  }
  return { manifest, wasmBinary }
}

export async function loadMsfaWorkletPackage(): Promise<MsfaWorkletPackage> {
  const [manifestResponse, wasmResponse] = await Promise.all([
    fetch(publicAssetUrl(MSFA_WORKLET_MANIFEST_PATH), { cache: 'no-cache' }),
    fetch(publicAssetUrl(MSFA_WORKLET_WASM_PATH), { cache: 'no-cache' }),
  ])
  if (!manifestResponse.ok) throw new Error(`Unable to load virtual DX7 manifest (${manifestResponse.status})`)
  if (!wasmResponse.ok) throw new Error(`Unable to load virtual DX7 WASM (${wasmResponse.status})`)
  const [manifest, wasmBinary] = await Promise.all([manifestResponse.json(), wasmResponse.arrayBuffer()])
  return verifyMsfaWorkletPackage(manifest, wasmBinary)
}

function defaultAudioContext(): AudioContextLike {
  if (typeof AudioContext === 'undefined') throw new Error('Web Audio is not available in this browser')
  return new AudioContext({ latencyHint: 'interactive', sampleRate: 48_000 })
}

function defaultAudioWorkletNode(
  context: AudioContextLike,
  name: string,
  options: AudioWorkletNodeOptions,
): AudioWorkletNodeLike {
  if (typeof AudioWorkletNode === 'undefined') throw new Error('AudioWorklet is not available in this browser')
  return new AudioWorkletNode(context as AudioContext, name, options)
}

function responseError(value: unknown): Error {
  return new Error(typeof value === 'string' ? value : 'Virtual DX7 AudioWorklet command failed')
}

export function createMsfaAudioWorkletController(
  dependencies: MsfaAudioWorkletDependencies = {},
): MsfaAudioWorkletController {
  const createContext = dependencies.createAudioContext ?? defaultAudioContext
  const createNode = dependencies.createAudioWorkletNode ?? defaultAudioWorkletNode
  const packageLoader = dependencies.loadPackage ?? loadMsfaWorkletPackage
  const createOutputRoute = dependencies.createOutputRoute
  const readyTimeoutMs = dependencies.readyTimeoutMs ?? MSFA_WORKLET_READY_TIMEOUT_MS
  if (!Number.isFinite(readyTimeoutMs) || readyTimeoutMs <= 0) {
    throw new RangeError('readyTimeoutMs must be a positive finite number')
  }

  let state: MsfaAudioWorkletState = 'disabled'
  let context: AudioContextLike | null = null
  let node: AudioWorkletNodeLike | null = null
  let outputRoute: MsfaAudioWorkletOutputRoute | null = null
  let diagnostics: MsfaAudioWorkletDiagnostics | null = null
  let enablePromise: Promise<void> | null = null
  let readyResolve: (() => void) | null = null
  let readyReject: ((error: Error) => void) | null = null
  let readyTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0
  const pending = new Map<number, { resolve: () => void; reject: (error: Error) => void }>()

  const clearReadyTimer = () => {
    if (readyTimer !== null) clearTimeout(readyTimer)
    readyTimer = null
  }

  const clearReadyWaiters = () => {
    clearReadyTimer()
    readyResolve = null
    readyReject = null
  }

  const rejectPending = (error: Error) => {
    for (const entry of pending.values()) entry.reject(error)
    pending.clear()
  }

  const handleMessage = (event: MessageEvent<unknown>) => {
    const message = event.data
    if (!message || typeof message !== 'object') return
    const data = message as {
      type?: unknown
      requestId?: unknown
      ok?: unknown
      error?: unknown
      sampleRate?: unknown
      blockFrames?: unknown
      polyphony?: unknown
      performanceAbi?: unknown
      callbacks?: unknown
      meanRenderMs?: unknown
      maxRenderMs?: unknown
      budgetMs?: unknown
      meanUtilization?: unknown
      maxUtilization?: unknown
      overBudgetCallbacks?: unknown
      activeVoices?: unknown
      clock?: unknown
    }
    if (data.type === 'ready') {
      const resolve = readyResolve
      const reject = readyReject
      try {
        if (!context || data.sampleRate !== context.sampleRate) {
          throw new Error('Virtual DX7 AudioWorklet reported an unexpected sample rate')
        }
        if (data.blockFrames !== 64) {
          throw new Error('Virtual DX7 AudioWorklet reported an unexpected block size')
        }
        if (data.polyphony !== MSFA_WORKLET_POLYPHONY) {
          throw new Error(`Virtual DX7 AudioWorklet reported unexpected polyphony ${String(data.polyphony)}`)
        }
        if (data.performanceAbi !== MSFA_WORKLET_PERFORMANCE_ABI) {
          throw new Error(`Virtual DX7 AudioWorklet reported unexpected performance ABI ${String(data.performanceAbi)}`)
        }
        clearReadyWaiters()
        resolve?.()
      } catch (cause) {
        clearReadyWaiters()
        reject?.(cause instanceof Error ? cause : new Error('Virtual DX7 AudioWorklet readiness validation failed'))
      }
      return
    }
    if (data.type === 'diagnostics') {
      const numeric = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null
      const callbacks = numeric(data.callbacks)
      const meanRenderMs = numeric(data.meanRenderMs)
      const maxRenderMs = numeric(data.maxRenderMs)
      const budgetMs = numeric(data.budgetMs)
      const meanUtilization = numeric(data.meanUtilization)
      const maxUtilization = numeric(data.maxUtilization)
      const overBudgetCallbacks = numeric(data.overBudgetCallbacks)
      const activeVoices = numeric(data.activeVoices)
      const polyphony = numeric(data.polyphony)
      if (callbacks !== null && callbacks > 0 && meanRenderMs !== null && meanRenderMs >= 0 && maxRenderMs !== null && maxRenderMs >= 0 && budgetMs !== null && budgetMs > 0 && meanUtilization !== null && meanUtilization >= 0 && maxUtilization !== null && maxUtilization >= 0 && overBudgetCallbacks !== null && overBudgetCallbacks >= 0 && activeVoices !== null && activeVoices >= 0 && polyphony !== null && polyphony > 0) {
        const clock = data.clock === 'performance' || data.clock === 'date' ? data.clock : undefined
        diagnostics = { callbacks, meanRenderMs, maxRenderMs, budgetMs, meanUtilization, maxUtilization, overBudgetCallbacks, activeVoices, polyphony, ...(clock === undefined ? {} : { clock }) }
      }
      return
    }
    if (data.type === 'fatal') {
      const error = responseError(data.error)
      state = 'error'
      const reject = readyReject
      clearReadyWaiters()
      reject?.(error)
      rejectPending(error)
      return
    }
    if (data.type !== 'response' || !Number.isInteger(data.requestId)) return
    const id = data.requestId as number
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (data.ok === true) entry.resolve()
    else entry.reject(responseError(data.error))
  }

  const sendCommand = (command: string, payload: Record<string, unknown> = {}): Promise<void> => {
    if (state !== 'ready' || !node) return Promise.reject(new Error('Virtual DX7 local audio is not enabled'))
    const id = ++requestId
    return new Promise<void>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      node?.port.postMessage({ type: 'command', requestId: id, command, ...payload })
    })
  }

  const cleanup = async () => {
    clearReadyWaiters()
    diagnostics = null
    rejectPending(new Error('Virtual DX7 AudioWorklet was closed'))
    if (node) {
      try {
        node.port.postMessage({ type: 'command', command: 'allNotesOff' })
        node.port.postMessage({ type: 'command', command: 'dispose' })
      } catch {
        // Best-effort local audio shutdown.
      }
      try {
        node.disconnect()
      } catch {
        // Node may already be disconnected after a processor failure.
      }
    }
    node = null
    const closingRoute = outputRoute
    outputRoute = null
    if (closingRoute) {
      try {
        closingRoute.dispose?.()
      } catch {
        // Output route teardown must not prevent AudioContext shutdown.
      }
    }
    const closingContext = context
    context = null
    if (closingContext && closingContext.state !== 'closed') {
      try {
        await closingContext.close()
      } catch {
        // Context may already be closing after a browser-level failure.
      }
    }
  }

  const controller: MsfaAudioWorkletController = {
    engineId: MSFA_OFFLINE_ENGINE_ID,
    engineVersion: MSFA_OFFLINE_ENGINE_VERSION,
    licenseSpdx: MSFA_OFFLINE_ENGINE_LICENSE,
    polyphony: MSFA_WORKLET_POLYPHONY,
    performanceControlAbi: MSFA_WORKLET_PERFORMANCE_ABI,
    get state() {
      return state
    },
    get sampleRate() {
      return context?.sampleRate ?? null
    },
    get diagnostics() {
      return diagnostics
    },
    enable() {
      if (state === 'closed') return Promise.reject(new Error('Virtual DX7 AudioWorklet is closed'))
      if (state === 'ready') return Promise.resolve()
      if (enablePromise) return enablePromise
      state = 'enabling'
      enablePromise = (async () => {
        try {
          context = createContext()
          if (!isSupportedSampleRate(context.sampleRate)) {
            throw new Error(`Virtual DX7 AudioWorklet requires 44100 or 48000 Hz; browser opened ${context.sampleRate} Hz`)
          }
          await context.resume()
          const packageData = await packageLoader()
          await context.audioWorklet.addModule(publicAssetUrl(MSFA_WORKLET_SCRIPT_PATH))
          const ready = new Promise<void>((resolve, reject) => {
            readyResolve = resolve
            readyReject = reject
            readyTimer = setTimeout(() => {
              const timeoutReject = readyReject
              clearReadyWaiters()
              timeoutReject?.(new Error(`Virtual DX7 AudioWorklet did not become ready within ${readyTimeoutMs} ms`))
            }, readyTimeoutMs)
          })
          node = createNode(context, MSFA_WORKLET_PROCESSOR_NAME, {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [1],
            processorOptions: { wasmBinary: packageData.wasmBinary },
          })
          node.port.onmessage = handleMessage
          node.onprocessorerror = () => {
            const error = new Error('Virtual DX7 AudioWorklet processor error')
            state = 'error'
            const reject = readyReject
            clearReadyWaiters()
            reject?.(error)
            rejectPending(error)
          }
          outputRoute = createOutputRoute ? createOutputRoute(context as AudioContext) : null
          node.connect(outputRoute?.destination ?? context.destination)
          await ready
          state = 'ready'
        } catch (cause) {
          state = 'error'
          await cleanup()
          throw cause
        } finally {
          enablePromise = null
        }
      })()
      return enablePromise
    },
    async loadVoice(voice, randomSeed = 0) {
      if (!context || !isSupportedSampleRate(context.sampleRate)) {
        throw new Error('Virtual DX7 local audio must be enabled before loading a voice')
      }
      const seed = integerRange(randomSeed, 0, 0xffff_ffff, 'randomSeed')
      const plan = createVirtualDx7RenderPlan({
        voice,
        midiNote: 60,
        velocity: 100,
        sampleRate: context.sampleRate,
        noteOnSeconds: 1,
        releaseSeconds: 0.5,
        randomSeed: seed,
      })
      const bridge = createMsfaCompatibleVoiceBridge(plan)
      await sendCommand('loadVoice', { patch: bridge.patchBuffer, randomSeed: seed })
    },
    async configurePerformance(config) {
      await sendCommand('configurePerformance', validatePerformanceConfig(config))
    },
    async setPitchBend(value) {
      await sendCommand('pitchBend', { value: integerRange(value, 0, 0x3fff, 'pitchBend') })
    },
    async setModulation(value) {
      await sendCommand('modulation', { value: integerRange(value, 0, 127, 'modulation') })
    },
    async setSustain(enabled) {
      if (typeof enabled !== 'boolean') throw new TypeError('sustain must be boolean')
      await sendCommand('sustain', { enabled })
    },
    async setAftertouch(value) {
      await sendCommand('aftertouch', { value: integerRange(value, 0, 127, 'aftertouch') })
    },
    async noteOn(midiNote, velocity) {
      const validatedNote = integerRange(midiNote, 0, 127, 'midiNote')
      const validatedVelocity = integerRange(velocity, 1, 127, 'velocity')
      await sendCommand('noteOn', {
        midiNote: validatedNote,
        velocity: validatedVelocity,
      })
    },
    async noteOff(midiNote) {
      if (midiNote === undefined) {
        await sendCommand('noteOff')
        return
      }
      const validatedNote = integerRange(midiNote, 0, 127, 'midiNote')
      await sendCommand('noteOff', { midiNote: validatedNote })
    },
    allNotesOff() {
      return sendCommand('allNotesOff')
    },
    async close() {
      if (state === 'closed') return
      state = 'closed'
      await cleanup()
    },
  }

  return controller
}
