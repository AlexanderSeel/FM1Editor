import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createVirtualDx7RenderPlan } from './virtualDx7Engine'
import { createVirtualDx7ReferenceRenderRequest } from './virtualDx7ReferenceFixture'
import {
  createMsfaOfflineEngine,
  importPublicMsfaModuleFactory,
  MSFA_OFFLINE_ENGINE_ID,
  MSFA_OFFLINE_ENGINE_LICENSE,
  MSFA_OFFLINE_ENGINE_VERSION,
  type MsfaEmscriptenModule,
  type MsfaModuleFactoryOptions,
} from './msfaOfflineEngine'

interface FakeModuleState {
  renderCalls: number[][]
  patchBytes: Uint8Array[]
  freedPointers: number[]
}

function createFakeModule(renderStatus = 0): { module: MsfaEmscriptenModule; state: FakeModuleState } {
  const buffer = new ArrayBuffer(1_048_576)
  const state: FakeModuleState = {
    renderCalls: [],
    patchBytes: [],
    freedPointers: [],
  }
  let nextPointer = 256
  const module: MsfaEmscriptenModule = {
    HEAPU8: new Uint8Array(buffer),
    HEAPF32: new Float32Array(buffer),
    _malloc(byteLength) {
      const pointer = nextPointer
      nextPointer += Math.ceil(byteLength / 4) * 4
      return pointer
    },
    _free(pointer) {
      state.freedPointers.push(pointer)
    },
    _fm1_msfa_patch_length: () => 156,
    _fm1_msfa_block_size: () => 64,
    _fm1_msfa_render(...args) {
      state.renderCalls.push(args)
      const [patchPointer, patchLength, , , , , , , outputPointer, outputFrames] = args
      state.patchBytes.push(module.HEAPU8.slice(patchPointer, patchPointer + patchLength))
      if (renderStatus === 0) {
        const start = outputPointer / Float32Array.BYTES_PER_ELEMENT
        module.HEAPF32.fill(0.125, start, start + outputFrames)
      }
      return renderStatus
    },
  }
  return { module, state }
}

const referencePlan = () => createVirtualDx7RenderPlan(createVirtualDx7ReferenceRenderRequest())

describe('packaged MSFA offline engine', () => {
  it('matches the committed browser artifact identity', () => {
    const manifest = JSON.parse(readFileSync(
      new URL('../../public/virtual-dx7/manifest.json', import.meta.url),
      'utf8',
    )) as { engineId: string; engineVersion: string; licenseSpdx: string }

    expect(MSFA_OFFLINE_ENGINE_ID).toBe(manifest.engineId)
    expect(MSFA_OFFLINE_ENGINE_VERSION).toBe(manifest.engineVersion)
    expect(MSFA_OFFLINE_ENGINE_LICENSE).toBe(manifest.licenseSpdx)
  })

  it('loads the public Emscripten module as an asset and resolves WASM beside the original public URL', async () => {
    const { module } = createFakeModule()
    const moduleFactory = vi.fn(async (_options?: MsfaModuleFactoryOptions) => module)
    const fetchText = vi.fn(async () => 'export default factory')
    const createObjectUrl = vi.fn(() => 'blob:fm1-msfa')
    const revokeObjectUrl = vi.fn()
    const importObjectUrl = vi.fn(async () => ({ default: moduleFactory }))

    const factory = await importPublicMsfaModuleFactory('http://localhost:5173/virtual-dx7/fm1-msfa.mjs', {
      fetchText,
      createObjectUrl,
      revokeObjectUrl,
      importObjectUrl,
    })
    await factory()

    expect(fetchText).toHaveBeenCalledWith('http://localhost:5173/virtual-dx7/fm1-msfa.mjs')
    expect(importObjectUrl).toHaveBeenCalledWith('blob:fm1-msfa')
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:fm1-msfa')
    const options = moduleFactory.mock.calls[0]?.[0]
    expect(options?.locateFile?.('fm1-msfa.wasm')).toBe('http://localhost:5173/virtual-dx7/fm1-msfa.wasm')
  })

  it('renders the semantic bridge through WASM and forwards the deterministic seed', async () => {
    const { module, state } = createFakeModule()
    const factory = vi.fn(async () => module)
    const engine = createMsfaOfflineEngine({ moduleFactory: factory })
    const plan = referencePlan()

    const render = await engine.render(plan)

    expect(engine.engineId).toBe(MSFA_OFFLINE_ENGINE_ID)
    expect(engine.engineVersion).toBe(MSFA_OFFLINE_ENGINE_VERSION)
    expect(engine.licenseSpdx).toBe('Apache-2.0')
    expect(factory).toHaveBeenCalledTimes(1)
    expect(state.renderCalls).toHaveLength(1)
    expect(state.renderCalls[0]?.slice(1, 8)).toEqual([
      156,
      plan.midiNote,
      plan.velocity,
      plan.sampleRate,
      plan.noteOnFrames,
      plan.releaseFrames,
      plan.randomSeed,
    ])
    expect(state.patchBytes[0]).toHaveLength(156)
    expect(state.patchBytes[0]?.[155]).toBe(0x3f)
    expect(render.renderKey).toBe(plan.renderKey)
    expect(render.samples).toHaveLength(plan.totalFrames)
    expect(render.samples[0]).toBe(0.125)
    expect(state.freedPointers).toHaveLength(2)
  })

  it('loads one module instance and reuses it for sequential renders', async () => {
    const { module } = createFakeModule()
    const factory = vi.fn(async () => module)
    const engine = createMsfaOfflineEngine({ moduleFactory: factory })
    const plan = referencePlan()

    await engine.render(plan)
    await engine.render(plan)

    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('releases WASM allocations when the native render reports an error', async () => {
    const { module, state } = createFakeModule(6)
    const engine = createMsfaOfflineEngine({ moduleFactory: async () => module })

    await expect(engine.render(referencePlan())).rejects.toThrow('status 6')
    expect(state.freedPointers).toHaveLength(2)
  })

  it('cancels before loading or allocating the WASM module', async () => {
    const { module } = createFakeModule()
    const factory = vi.fn(async () => module)
    const engine = createMsfaOfflineEngine({ moduleFactory: factory })
    const controller = new AbortController()
    controller.abort()

    await expect(engine.render(referencePlan(), controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(factory).not.toHaveBeenCalled()
  })

  it('rejects an incompatible packaged module before rendering', async () => {
    const { module } = createFakeModule()
    module._fm1_msfa_block_size = () => 128
    const engine = createMsfaOfflineEngine({ moduleFactory: async () => module })

    await expect(engine.render(referencePlan())).rejects.toThrow('block size 128')
  })
})
