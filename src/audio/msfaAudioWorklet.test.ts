import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  createDefaultMsfaLocalPerformanceConfig,
  createMsfaAudioWorkletController,
  MSFA_WORKLET_PERFORMANCE_ABI,
  MSFA_WORKLET_POLYPHONY,
  MSFA_WORKLET_PROCESSOR_NAME,
  verifyMsfaWorkletPackage,
  type MsfaWorkletPackage,
} from './msfaAudioWorklet'
import {
  MSFA_OFFLINE_ENGINE_ID,
  MSFA_OFFLINE_ENGINE_LICENSE,
  MSFA_OFFLINE_ENGINE_VERSION,
} from './msfaOfflineEngine'

const manifest = {
  engineId: MSFA_OFFLINE_ENGINE_ID,
  engineVersion: MSFA_OFFLINE_ENGINE_VERSION,
  licenseSpdx: MSFA_OFFLINE_ENGINE_LICENSE,
  wasm: {
    path: 'fm1-msfa.wasm',
    sha256: 'a'.repeat(64),
  },
  statefulSessionAbi: 1,
  renderBlockFrames: 64,
  workletPolyphony: MSFA_WORKLET_POLYPHONY,
  performanceControlAbi: MSFA_WORKLET_PERFORMANCE_ABI,
}

const packageData: MsfaWorkletPackage = {
  manifest,
  wasmBinary: new ArrayBuffer(32),
}

function browserHarness(options: {
  sampleRate?: number
  fatal?: string
  readyPolyphony?: number
  readyPerformanceAbi?: number
  outputRoute?: boolean
} = {}) {
  const messages: unknown[] = []
  const addModule = vi.fn(async () => {})
  const resume = vi.fn(async () => {})
  const close = vi.fn(async () => {})
  const connect = vi.fn()
  const disconnect = vi.fn()
  const defaultDestination = {} as AudioNode
  const routedDestination = {} as AudioNode
  const routeDispose = vi.fn()
  const createOutputRoute = vi.fn(() => ({ destination: routedDestination, dispose: routeDispose }))
  const createContext = vi.fn(() => ({
    sampleRate: options.sampleRate ?? 48_000,
    state: 'running' as AudioContextState,
    destination: defaultDestination,
    audioWorklet: { addModule },
    resume,
    close,
  }))

  const port: {
    onmessage: ((event: MessageEvent<unknown>) => void) | null
    postMessage: ReturnType<typeof vi.fn>
  } = {
    onmessage: null,
    postMessage: vi.fn((message: unknown) => {
      messages.push(message)
      const data = message as { type?: string; requestId?: number }
      if (data.type === 'command' && Number.isInteger(data.requestId)) {
        queueMicrotask(() => port.onmessage?.({
          data: { type: 'response', requestId: data.requestId, ok: true },
        } as MessageEvent<unknown>))
      }
    }),
  }

  let nodeOptions: AudioWorkletNodeOptions | null = null
  const createNode = vi.fn((_context: unknown, name: string, workletOptions: AudioWorkletNodeOptions) => {
    nodeOptions = workletOptions
    queueMicrotask(() => port.onmessage?.({
      data: options.fatal
        ? { type: 'fatal', error: options.fatal }
        : {
            type: 'ready',
            sampleRate: options.sampleRate ?? 48_000,
            blockFrames: 64,
            polyphony: options.readyPolyphony ?? MSFA_WORKLET_POLYPHONY,
            performanceAbi: options.readyPerformanceAbi ?? MSFA_WORKLET_PERFORMANCE_ABI,
          },
    } as MessageEvent<unknown>))
    return { port, onprocessorerror: null, connect, disconnect, processorName: name }
  })

  const loadPackage = vi.fn(async () => packageData)
  const controller = createMsfaAudioWorkletController({
    createAudioContext: createContext as never,
    createAudioWorkletNode: createNode as never,
    loadPackage,
    ...(options.outputRoute ? { createOutputRoute: createOutputRoute as never } : {}),
  })

  return {
    controller,
    messages,
    addModule,
    resume,
    close,
    connect,
    disconnect,
    createContext,
    createNode,
    loadPackage,
    defaultDestination,
    routedDestination,
    createOutputRoute,
    routeDispose,
    get nodeOptions() { return nodeOptions },
  }
}

function commandsOf(messages: readonly unknown[]): Record<string, unknown>[] {
  return messages
    .filter((message): message is Record<string, unknown> => Boolean(message) && typeof message === 'object')
    .filter((message) => message.type === 'command')
}

describe('MSFA AudioWorklet package verification', () => {
  it('accepts the expected performance-capable manifest and matching WASM digest', async () => {
    const verified = await verifyMsfaWorkletPackage(manifest, packageData.wasmBinary, async () => manifest.wasm.sha256)
    expect(verified.manifest.workletPolyphony).toBe(MSFA_WORKLET_POLYPHONY)
    expect(verified.manifest.performanceControlAbi).toBe(MSFA_WORKLET_PERFORMANCE_ABI)
  })

  it('rejects mismatched WASM, polyphony and performance ABI', async () => {
    await expect(verifyMsfaWorkletPackage(manifest, packageData.wasmBinary, async () => 'b'.repeat(64)))
      .rejects.toThrow('WASM hash mismatch')
    await expect(verifyMsfaWorkletPackage({ ...manifest, workletPolyphony: 8 }, packageData.wasmBinary, async () => manifest.wasm.sha256))
      .rejects.toThrow(`polyphony must be ${MSFA_WORKLET_POLYPHONY}`)
    await expect(verifyMsfaWorkletPackage({ ...manifest, performanceControlAbi: 0 }, packageData.wasmBinary, async () => manifest.wasm.sha256))
      .rejects.toThrow(`performance-control ABI must be ${MSFA_WORKLET_PERFORMANCE_ABI}`)
  })
})

describe('performance-capable MSFA AudioWorklet controller', () => {
  it('does not create browser audio until explicitly enabled', async () => {
    const harness = browserHarness()
    expect(harness.controller.state).toBe('disabled')
    expect(harness.controller.polyphony).toBe(MSFA_WORKLET_POLYPHONY)
    expect(harness.controller.performanceControlAbi).toBe(MSFA_WORKLET_PERFORMANCE_ABI)
    expect(harness.createContext).not.toHaveBeenCalled()

    await harness.controller.enable()

    expect(harness.createContext).toHaveBeenCalledTimes(1)
    expect(harness.resume).toHaveBeenCalledTimes(1)
    expect(harness.addModule).toHaveBeenCalledWith(expect.stringContaining('virtual-dx7/fm1-msfa-worklet.js'))
    expect(harness.createNode.mock.calls[0]?.[1]).toBe(MSFA_WORKLET_PROCESSOR_NAME)
    expect(harness.nodeOptions?.outputChannelCount).toEqual([1])
    expect(harness.controller.state).toBe('ready')
    expect(harness.controller.sampleRate).toBe(48_000)
  })

  it('keeps direct dry routing by default and supports an explicit disposable output route', async () => {
    const dry = browserHarness()
    await dry.controller.enable()
    expect(dry.createOutputRoute).not.toHaveBeenCalled()
    expect(dry.connect).toHaveBeenCalledWith(dry.defaultDestination)
    await dry.controller.close()
    expect(dry.routeDispose).not.toHaveBeenCalled()

    const routed = browserHarness({ outputRoute: true })
    await routed.controller.enable()
    expect(routed.createOutputRoute).toHaveBeenCalledTimes(1)
    expect(routed.connect).toHaveBeenCalledWith(routed.routedDestination)
    await routed.controller.close()
    expect(routed.routeDispose).toHaveBeenCalledTimes(1)
  })

  it('routes semantic voice, performance controls and independent notes', async () => {
    const harness = browserHarness()
    await harness.controller.enable()
    const config = createDefaultMsfaLocalPerformanceConfig()
    config.pitchBendRange = 12
    config.modulationWheel = { range: 99, assignment: { pitch: true, amplitude: false, egBias: false } }
    config.aftertouch = { range: 70, assignment: { pitch: false, amplitude: true, egBias: false } }

    await harness.controller.loadVoice(createInitializedVoice('WORKLET'), 42)
    await harness.controller.configurePerformance(config)
    await harness.controller.setPitchBend(16_383)
    await harness.controller.setModulation(127)
    await harness.controller.setAftertouch(64)
    await harness.controller.setSustain(true)
    await harness.controller.noteOn(60, 100)
    await harness.controller.noteOff(60)
    await harness.controller.setSustain(false)
    await harness.controller.allNotesOff()

    const commands = commandsOf(harness.messages)
    expect(commands.map((command) => command.command)).toEqual([
      'loadVoice',
      'configurePerformance',
      'pitchBend',
      'modulation',
      'aftertouch',
      'sustain',
      'noteOn',
      'noteOff',
      'sustain',
      'allNotesOff',
    ])
    expect(commands[1]).toMatchObject({
      pitchBendRange: 12,
      pitchBendStep: 0,
      modulationRange: 99,
      modulationAssignment: 1,
      aftertouchRange: 70,
      aftertouchAssignment: 2,
    })
    expect(commands[2]).toMatchObject({ value: 16_383 })
    expect(commands[5]).toMatchObject({ enabled: true })
  })

  it('rejects unsupported browser contracts and invalid control ranges', async () => {
    const wrongRate = browserHarness({ sampleRate: 96_000 })
    await expect(wrongRate.controller.enable()).rejects.toThrow('44100 or 48000 Hz')

    const wrongPolyphony = browserHarness({ readyPolyphony: 8 })
    await expect(wrongPolyphony.controller.enable()).rejects.toThrow('unexpected polyphony 8')

    const wrongPerformance = browserHarness({ readyPerformanceAbi: 0 })
    await expect(wrongPerformance.controller.enable()).rejects.toThrow('unexpected performance ABI 0')

    const harness = browserHarness()
    await harness.controller.enable()
    await expect(harness.controller.setPitchBend(16_384)).rejects.toThrow('pitchBend')
    await expect(harness.controller.setModulation(128)).rejects.toThrow('modulation')
    await expect(harness.controller.setAftertouch(-1)).rejects.toThrow('aftertouch')
    await expect(harness.controller.configurePerformance({
      ...createDefaultMsfaLocalPerformanceConfig(),
      pitchBendRange: 13,
    })).rejects.toThrow('pitchBendRange')
  })

  it('closes local audio and surfaces worklet fatal initialization errors', async () => {
    const harness = browserHarness()
    await harness.controller.enable()
    await harness.controller.close()
    expect(harness.controller.state).toBe('closed')
    expect(harness.messages).toContainEqual({ type: 'command', command: 'allNotesOff' })
    expect(harness.messages).toContainEqual({ type: 'command', command: 'dispose' })

    const fatal = browserHarness({ fatal: 'WASM init failed', outputRoute: true })
    await expect(fatal.controller.enable()).rejects.toThrow('WASM init failed')
    expect(fatal.controller.state).toBe('error')
    expect(fatal.routeDispose).toHaveBeenCalledTimes(1)
  })
})
