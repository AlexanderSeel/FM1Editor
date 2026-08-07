import { describe, expect, it, vi } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import {
  createMsfaAudioWorkletController,
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
}

const packageData: MsfaWorkletPackage = {
  manifest,
  wasmBinary: new ArrayBuffer(32),
}

function browserHarness(options: { sampleRate?: number; fatal?: string; readyPolyphony?: number } = {}) {
  const messages: unknown[] = []
  const addModule = vi.fn(async () => {})
  const resume = vi.fn(async () => {})
  const close = vi.fn(async () => {})
  const connect = vi.fn()
  const disconnect = vi.fn()
  const createContext = vi.fn(() => ({
    sampleRate: options.sampleRate ?? 48_000,
    state: 'running' as AudioContextState,
    destination: {} as AudioNode,
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
      const data = message as { type?: string; requestId?: number; command?: string }
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
          },
    } as MessageEvent<unknown>))
    return {
      port,
      onprocessorerror: null,
      connect,
      disconnect,
      processorName: name,
    }
  })

  const loadPackage = vi.fn(async () => packageData)
  const controller = createMsfaAudioWorkletController({
    createAudioContext: createContext as never,
    createAudioWorkletNode: createNode as never,
    loadPackage,
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
    get nodeOptions() {
      return nodeOptions
    },
  }
}

describe('MSFA AudioWorklet package verification', () => {
  it('accepts the expected stateful polyphonic manifest and matching WASM digest', async () => {
    const verified = await verifyMsfaWorkletPackage(
      manifest,
      packageData.wasmBinary,
      async () => manifest.wasm.sha256,
    )

    expect(verified.manifest.engineVersion).toBe(MSFA_OFFLINE_ENGINE_VERSION)
    expect(verified.manifest.workletPolyphony).toBe(MSFA_WORKLET_POLYPHONY)
    expect(verified.wasmBinary).toBe(packageData.wasmBinary)
  })

  it('rejects a mismatched local WASM artifact', async () => {
    await expect(verifyMsfaWorkletPackage(
      manifest,
      packageData.wasmBinary,
      async () => 'b'.repeat(64),
    )).rejects.toThrow('WASM hash mismatch')
  })

  it('rejects a manifest that does not declare the accepted worklet polyphony', async () => {
    await expect(verifyMsfaWorkletPackage(
      { ...manifest, workletPolyphony: 8 },
      packageData.wasmBinary,
      async () => manifest.wasm.sha256,
    )).rejects.toThrow(`polyphony must be ${MSFA_WORKLET_POLYPHONY}`)
  })
})

describe('polyphonic MSFA AudioWorklet controller', () => {
  it('does not create browser audio until explicitly enabled', async () => {
    const harness = browserHarness()

    expect(harness.controller.state).toBe('disabled')
    expect(harness.controller.polyphony).toBe(MSFA_WORKLET_POLYPHONY)
    expect(harness.createContext).not.toHaveBeenCalled()

    await harness.controller.enable()

    expect(harness.createContext).toHaveBeenCalledTimes(1)
    expect(harness.resume).toHaveBeenCalledTimes(1)
    expect(harness.loadPackage).toHaveBeenCalledTimes(1)
    expect(harness.addModule).toHaveBeenCalledWith(expect.stringContaining('virtual-dx7/fm1-msfa-worklet.js'))
    expect(harness.createNode).toHaveBeenCalledTimes(1)
    expect(harness.createNode.mock.calls[0]?.[1]).toBe(MSFA_WORKLET_PROCESSOR_NAME)
    expect(harness.nodeOptions?.numberOfInputs).toBe(0)
    expect(harness.nodeOptions?.numberOfOutputs).toBe(1)
    expect(harness.nodeOptions?.outputChannelCount).toEqual([1])
    expect((harness.nodeOptions?.processorOptions as { wasmBinary?: ArrayBuffer })?.wasmBinary)
      .toBe(packageData.wasmBinary)
    expect(harness.connect).toHaveBeenCalledTimes(1)
    expect(harness.controller.state).toBe('ready')
    expect(harness.controller.sampleRate).toBe(48_000)
  })

  it('loads semantic voice state and routes independent note lifecycle commands', async () => {
    const harness = browserHarness()
    await harness.controller.enable()

    await harness.controller.loadVoice(createInitializedVoice('WORKLET'), 42)
    await harness.controller.noteOn(60, 100)
    await harness.controller.noteOn(64, 96)
    await harness.controller.noteOff(60)
    await harness.controller.noteOff()
    await harness.controller.allNotesOff()

    const commands = harness.messages
      .filter((message): message is Record<string, unknown> => Boolean(message) && typeof message === 'object')
      .filter((message) => message.type === 'command')

    expect(commands.map((command) => command.command)).toEqual([
      'loadVoice',
      'noteOn',
      'noteOn',
      'noteOff',
      'noteOff',
      'allNotesOff',
    ])
    const loadVoice = commands[0]
    expect(loadVoice?.randomSeed).toBe(42)
    expect(loadVoice?.patch).toBeInstanceOf(Uint8Array)
    expect((loadVoice?.patch as Uint8Array)).toHaveLength(156)
    expect((loadVoice?.patch as Uint8Array)[155]).toBe(0x3f)
    expect(commands[1]).toMatchObject({ midiNote: 60, velocity: 100 })
    expect(commands[2]).toMatchObject({ midiNote: 64, velocity: 96 })
    expect(commands[3]).toMatchObject({ midiNote: 60 })
    expect(commands[4]).not.toHaveProperty('midiNote')
  })

  it('closes local audio with best-effort all-notes-off and disposal', async () => {
    const harness = browserHarness()
    await harness.controller.enable()

    await harness.controller.close()

    expect(harness.controller.state).toBe('closed')
    expect(harness.disconnect).toHaveBeenCalledTimes(1)
    expect(harness.close).toHaveBeenCalledTimes(1)
    expect(harness.messages).toContainEqual({ type: 'command', command: 'allNotesOff' })
    expect(harness.messages).toContainEqual({ type: 'command', command: 'dispose' })
  })

  it('rejects unsupported browser sample rates and releases the context', async () => {
    const harness = browserHarness({ sampleRate: 96_000 })

    await expect(harness.controller.enable()).rejects.toThrow('44100 or 48000 Hz')

    expect(harness.controller.state).toBe('error')
    expect(harness.loadPackage).not.toHaveBeenCalled()
    expect(harness.close).toHaveBeenCalledTimes(1)
  })

  it('rejects a worklet that reports a different polyphony contract', async () => {
    const harness = browserHarness({ readyPolyphony: 8 })

    await expect(harness.controller.enable()).rejects.toThrow('unexpected polyphony 8')

    expect(harness.controller.state).toBe('error')
    expect(harness.disconnect).toHaveBeenCalledTimes(1)
    expect(harness.close).toHaveBeenCalledTimes(1)
  })

  it('surfaces worklet fatal initialization errors and cleans up', async () => {
    const harness = browserHarness({ fatal: 'WASM init failed' })

    await expect(harness.controller.enable()).rejects.toThrow('WASM init failed')

    expect(harness.controller.state).toBe('error')
    expect(harness.disconnect).toHaveBeenCalledTimes(1)
    expect(harness.close).toHaveBeenCalledTimes(1)
  })

  it('validates note and seed ranges before sending commands', async () => {
    const harness = browserHarness()
    await harness.controller.enable()

    await expect(harness.controller.noteOn(128, 100)).rejects.toThrow('midiNote')
    await expect(harness.controller.noteOn(60, 0)).rejects.toThrow('velocity')
    await expect(harness.controller.noteOff(128)).rejects.toThrow('midiNote')
    await expect(harness.controller.loadVoice(createInitializedVoice(), -1)).rejects.toThrow('randomSeed')
  })
})
