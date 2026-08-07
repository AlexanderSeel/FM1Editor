import { createMsfaCompatibleVoiceBridge, MSFA_COMPATIBLE_PATCH_LENGTH } from './msfaVoiceBridge'
import {
  assertVirtualDx7PcmRender,
  VIRTUAL_DX7_RENDER_BLOCK_FRAMES,
  type VirtualDx7OfflineEngine,
  type VirtualDx7PcmRender,
  type VirtualDx7RenderPlan,
} from './virtualDx7Engine'

export const MSFA_OFFLINE_ENGINE_ID = 'fm1-editor-msfa-compatible' as const
export const MSFA_OFFLINE_ENGINE_VERSION = 'msfa-2e182b3-fm1-v3-stateful' as const
export const MSFA_OFFLINE_ENGINE_LICENSE = 'Apache-2.0' as const
export const MSFA_OFFLINE_MODULE_PATH = 'virtual-dx7/fm1-msfa.mjs' as const

export interface MsfaEmscriptenModule {
  HEAPU8: Uint8Array
  HEAPF32: Float32Array
  _malloc(byteLength: number): number
  _free(pointer: number): void
  _fm1_msfa_patch_length(): number
  _fm1_msfa_block_size(): number
  _fm1_msfa_render(
    patchPointer: number,
    patchLength: number,
    midiNote: number,
    velocity: number,
    sampleRate: number,
    noteOnFrames: number,
    releaseFrames: number,
    randomSeed: number,
    outputPointer: number,
    outputFrames: number,
  ): number
}

export type MsfaEmscriptenModuleFactory = () => Promise<MsfaEmscriptenModule>

export interface MsfaOfflineEngineOptions {
  moduleFactory?: MsfaEmscriptenModuleFactory
  moduleUrl?: string
}

function defaultModuleUrl(): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${base}${MSFA_OFFLINE_MODULE_PATH}`
}

async function importModuleFactory(moduleUrl: string): Promise<MsfaEmscriptenModuleFactory> {
  const imported = await import(/* @vite-ignore */ moduleUrl) as { default?: unknown }
  if (typeof imported.default !== 'function') {
    throw new TypeError('The packaged virtual DX7 module does not export an Emscripten factory')
  }
  return imported.default as MsfaEmscriptenModuleFactory
}

function abortError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Virtual DX7 render was cancelled', 'AbortError')
  }
  const error = new Error('Virtual DX7 render was cancelled')
  error.name = 'AbortError'
  return error
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError()
}

function assertCompatibleModule(module: MsfaEmscriptenModule): void {
  const patchLength = module._fm1_msfa_patch_length()
  if (patchLength !== MSFA_COMPATIBLE_PATCH_LENGTH) {
    throw new Error(`Virtual DX7 WASM reports patch length ${patchLength}; expected ${MSFA_COMPATIBLE_PATCH_LENGTH}`)
  }
  const blockSize = module._fm1_msfa_block_size()
  if (blockSize !== VIRTUAL_DX7_RENDER_BLOCK_FRAMES) {
    throw new Error(`Virtual DX7 WASM reports block size ${blockSize}; expected ${VIRTUAL_DX7_RENDER_BLOCK_FRAMES}`)
  }
}

function assertPlanAlignment(plan: VirtualDx7RenderPlan): void {
  if ((plan.noteOnFrames % VIRTUAL_DX7_RENDER_BLOCK_FRAMES) !== 0) {
    throw new Error(`Virtual DX7 note-on frames must align to ${VIRTUAL_DX7_RENDER_BLOCK_FRAMES}`)
  }
  if ((plan.releaseFrames % VIRTUAL_DX7_RENDER_BLOCK_FRAMES) !== 0) {
    throw new Error(`Virtual DX7 release frames must align to ${VIRTUAL_DX7_RENDER_BLOCK_FRAMES}`)
  }
}

export function createMsfaOfflineEngine(options: MsfaOfflineEngineOptions = {}): VirtualDx7OfflineEngine {
  let modulePromise: Promise<MsfaEmscriptenModule> | null = null

  const loadModule = async (): Promise<MsfaEmscriptenModule> => {
    if (!modulePromise) {
      modulePromise = (async () => {
        const factory = options.moduleFactory ?? await importModuleFactory(options.moduleUrl ?? defaultModuleUrl())
        const module = await factory()
        assertCompatibleModule(module)
        return module
      })()
    }
    return modulePromise
  }

  return {
    engineId: MSFA_OFFLINE_ENGINE_ID,
    engineVersion: MSFA_OFFLINE_ENGINE_VERSION,
    licenseSpdx: MSFA_OFFLINE_ENGINE_LICENSE,
    async render(plan, signal): Promise<VirtualDx7PcmRender> {
      throwIfAborted(signal)
      assertPlanAlignment(plan)
      const bridge = createMsfaCompatibleVoiceBridge(plan)
      const module = await loadModule()
      throwIfAborted(signal)

      const patchPointer = module._malloc(bridge.patchBuffer.byteLength)
      const outputBytes = plan.totalFrames * Float32Array.BYTES_PER_ELEMENT
      const outputPointer = module._malloc(outputBytes)
      if (!patchPointer || !outputPointer) {
        if (patchPointer) module._free(patchPointer)
        if (outputPointer) module._free(outputPointer)
        throw new Error('Virtual DX7 WASM allocation failed')
      }

      try {
        module.HEAPU8.set(bridge.patchBuffer, patchPointer)
        throwIfAborted(signal)
        const status = module._fm1_msfa_render(
          patchPointer,
          bridge.patchBuffer.byteLength,
          plan.midiNote,
          plan.velocity,
          plan.sampleRate,
          plan.noteOnFrames,
          plan.releaseFrames,
          plan.randomSeed,
          outputPointer,
          plan.totalFrames,
        )
        if (status !== 0) throw new Error(`Virtual DX7 WASM render failed with status ${status}`)
        throwIfAborted(signal)
        const samples = new Float32Array(module.HEAPF32.buffer, outputPointer, plan.totalFrames).slice()
        const render: VirtualDx7PcmRender = {
          renderKey: plan.renderKey,
          sampleRate: plan.sampleRate,
          channelCount: 1,
          frameCount: plan.totalFrames,
          samples,
        }
        assertVirtualDx7PcmRender(plan, render)
        return render
      } finally {
        module._free(outputPointer)
        module._free(patchPointer)
      }
    },
  }
}
