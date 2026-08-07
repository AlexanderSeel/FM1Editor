import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MsfaAudioWorkletController } from './msfaAudioWorklet'
import { createInitializedVoice } from '../domain/voice'
import { createLocalVoiceAuditionManager } from './localVoiceAudition'

function controllerHarness() {
  let state: MsfaAudioWorkletController['state'] = 'disabled'
  const controller: MsfaAudioWorkletController = {
    engineId: 'fm1-editor-msfa-compatible',
    engineVersion: 'msfa-2e182b3-fm1-v3-stateful',
    licenseSpdx: 'Apache-2.0',
    polyphony: 16,
    performanceControlAbi: 1,
    get state() { return state },
    sampleRate: 48_000,
    enable: vi.fn(async () => { state = 'ready' }),
    loadVoice: vi.fn(async () => {}),
    configurePerformance: vi.fn(async () => {}),
    setPitchBend: vi.fn(async () => {}),
    setModulation: vi.fn(async () => {}),
    setSustain: vi.fn(async () => {}),
    setAftertouch: vi.fn(async () => {}),
    noteOn: vi.fn(async () => {}),
    noteOff: vi.fn(async () => {}),
    allNotesOff: vi.fn(async () => {}),
    close: vi.fn(async () => { state = 'closed' }),
  }
  return controller
}

afterEach(() => {
  vi.useRealTimers()
})

describe('createLocalVoiceAuditionManager', () => {
  it('prepares browser audio before an asynchronously supplied voice and reuses that controller', async () => {
    const controller = controllerHarness()
    const createController = vi.fn(() => controller)
    const manager = createLocalVoiceAuditionManager(createController)
    const voice = createInitializedVoice('PREPARED')

    const preparation = manager.prepare()
    expect(createController).toHaveBeenCalledTimes(1)
    expect(controller.enable).toHaveBeenCalledTimes(1)
    await preparation

    await manager.audition(voice)

    expect(createController).toHaveBeenCalledTimes(1)
    expect(controller.loadVoice).toHaveBeenCalledWith(voice, 42)
    expect(controller.noteOn).toHaveBeenCalledWith(60, 105)
  })

  it('starts one semantic C4 audition and auto-releases/closes it', async () => {
    vi.useFakeTimers()
    const controller = controllerHarness()
    const onStart = vi.fn()
    const onRelease = vi.fn()
    const onStop = vi.fn()
    const manager = createLocalVoiceAuditionManager(() => controller, { onStart, onRelease, onStop })
    const voice = createInitializedVoice('PREVIEW')

    await manager.audition(voice)

    expect(controller.enable).toHaveBeenCalledTimes(1)
    expect(controller.allNotesOff).toHaveBeenCalledTimes(1)
    expect(controller.loadVoice).toHaveBeenCalledWith(voice, 42)
    expect(controller.configurePerformance).toHaveBeenCalledTimes(1)
    expect(controller.noteOn).toHaveBeenCalledWith(60, 105)
    expect(onStart).toHaveBeenCalledWith(voice)
    expect(manager.activeVoice).toBe(voice)

    await vi.advanceTimersByTimeAsync(900)
    expect(controller.noteOff).toHaveBeenCalledWith(60)
    expect(onRelease).toHaveBeenCalledWith(voice)

    await vi.advanceTimersByTimeAsync(900)
    expect(controller.allNotesOff).toHaveBeenCalledTimes(2)
    expect(controller.close).toHaveBeenCalledTimes(1)
    expect(onStop).toHaveBeenCalledWith(voice)
    expect(manager.active).toBe(false)
  })

  it('cancels the previous audition and reuses the already-enabled controller', async () => {
    vi.useFakeTimers()
    const controller = controllerHarness()
    const createController = vi.fn(() => controller)
    const manager = createLocalVoiceAuditionManager(createController)
    const voiceA = createInitializedVoice('A')
    const voiceB = createInitializedVoice('B')

    await manager.audition(voiceA, { noteOnMs: 500, releaseTailMs: 500 })
    await manager.audition(voiceB, { noteOnMs: 500, releaseTailMs: 500 })

    expect(createController).toHaveBeenCalledTimes(1)
    expect(controller.allNotesOff).toHaveBeenCalledTimes(2)
    expect(controller.loadVoice).toHaveBeenNthCalledWith(1, voiceA, 42)
    expect(controller.loadVoice).toHaveBeenNthCalledWith(2, voiceB, 42)
    expect(controller.noteOn).toHaveBeenCalledTimes(2)
    expect(manager.activeVoice).toBe(voiceB)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(controller.noteOff).toHaveBeenCalledTimes(1)
    expect(controller.close).toHaveBeenCalledTimes(1)
  })

  it('stop cancels pending release timers and releases the active controller immediately', async () => {
    vi.useFakeTimers()
    const controller = controllerHarness()
    const onStop = vi.fn()
    const manager = createLocalVoiceAuditionManager(() => controller, { onStop })
    const voice = createInitializedVoice('STOP')

    await manager.audition(voice, { noteOnMs: 2_000, releaseTailMs: 2_000 })
    await manager.stop()
    await vi.advanceTimersByTimeAsync(5_000)

    expect(controller.allNotesOff).toHaveBeenCalledTimes(2)
    expect(controller.close).toHaveBeenCalledTimes(1)
    expect(controller.noteOff).not.toHaveBeenCalled()
    expect(onStop).toHaveBeenCalledWith(voice)
    expect(manager.active).toBe(false)
  })

  it('validates audition ranges before creating browser audio', async () => {
    const createController = vi.fn(controllerHarness)
    const manager = createLocalVoiceAuditionManager(createController)
    const voice = createInitializedVoice('RANGE')

    await expect(manager.audition(voice, { midiNote: 128 })).rejects.toThrow('midiNote')
    await expect(manager.audition(voice, { velocity: 0 })).rejects.toThrow('velocity')
    await expect(manager.audition(voice, { noteOnMs: 20 })).rejects.toThrow('noteOnMs')
    expect(createController).not.toHaveBeenCalled()
  })
})
