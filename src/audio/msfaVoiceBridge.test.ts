import { describe, expect, it } from 'vitest'
import { DX7_OPERATOR_ENABLE_MASK_MAX } from '../domain/dx7EditSession'
import { createInitializedVoice, type Dx7Voice } from '../domain/voice'
import { decodeSingleVoiceData, DX7_SINGLE_DATA_LENGTH } from '../sysex/dx7'
import {
  createMsfaCompatibleVoiceBridge,
  MSFA_COMPATIBLE_PATCH_LENGTH,
  MSFA_OPERATOR_MASK_OFFSET,
} from './msfaVoiceBridge'
import { createVirtualDx7RenderPlan, type VirtualDx7RenderRequest } from './virtualDx7Engine'

const createRequest = (voice: Dx7Voice = createInitializedVoice()): VirtualDx7RenderRequest => ({
  voice,
  midiNote: 60,
  velocity: 100,
  sampleRate: 48_000,
  noteOnSeconds: 1,
  releaseSeconds: 0.5,
  randomSeed: 42,
})

describe('MSFA-compatible semantic voice bridge', () => {
  it('builds a canonical 155-byte voice plus separate all-operators-on edit state', () => {
    const plan = createVirtualDx7RenderPlan(createRequest())
    const bridge = createMsfaCompatibleVoiceBridge(plan)

    expect(bridge.renderKey).toBe(plan.renderKey)
    expect(bridge.voiceData).toHaveLength(DX7_SINGLE_DATA_LENGTH)
    expect(bridge.patchBuffer).toHaveLength(MSFA_COMPATIBLE_PATCH_LENGTH)
    expect(MSFA_OPERATOR_MASK_OFFSET).toBe(DX7_SINGLE_DATA_LENGTH)
    expect(bridge.operatorEnableMask).toBe(DX7_OPERATOR_ENABLE_MASK_MAX)
    expect(bridge.patchBuffer[MSFA_OPERATOR_MASK_OFFSET]).toBe(DX7_OPERATOR_ENABLE_MASK_MAX)
    expect(Array.from(bridge.patchBuffer.slice(0, DX7_SINGLE_DATA_LENGTH)))
      .toEqual(Array.from(bridge.voiceData))
  })

  it('keeps display names and imported raw bytes out of the private engine buffer', () => {
    const voice = createInitializedVoice('SOURCE ONE')
    const renamed: Dx7Voice = {
      ...voice,
      name: 'SOURCE TWO',
      source: {
        packed: new Uint8Array(128).fill(0x7f),
        unpacked: new Uint8Array(155).fill(0x55),
      },
    }

    const first = createMsfaCompatibleVoiceBridge(createVirtualDx7RenderPlan(createRequest(voice)))
    const second = createMsfaCompatibleVoiceBridge(createVirtualDx7RenderPlan(createRequest(renamed)))

    expect(second.renderKey).toBe(first.renderKey)
    expect(Array.from(second.patchBuffer)).toEqual(Array.from(first.patchBuffer))
  })

  it('encodes the semantic voice through the existing Yamaha-compatible codec', () => {
    const voice = createInitializedVoice()
    const plan = createVirtualDx7RenderPlan(createRequest(voice))
    const bridge = createMsfaCompatibleVoiceBridge(plan)
    const decoded = decodeSingleVoiceData(bridge.voiceData)

    expect(decoded.name).toBe('')
    expect(decoded.operators).toEqual(plan.voice.operators)
    expect(decoded.pitchEnvelope).toEqual(plan.voice.pitchEnvelope)
    expect(decoded.algorithm).toBe(plan.voice.algorithm)
    expect(decoded.feedback).toBe(plan.voice.feedback)
    expect(decoded.oscillatorKeySync).toBe(plan.voice.oscillatorKeySync)
    expect(decoded.lfo).toEqual(plan.voice.lfo)
    expect(decoded.transpose).toBe(plan.voice.transpose)
  })

  it('changes the engine buffer when a legal semantic voice field changes', () => {
    const voice = createInitializedVoice()
    const changed: Dx7Voice = { ...voice, algorithm: 2 }
    const original = createMsfaCompatibleVoiceBridge(createVirtualDx7RenderPlan(createRequest(voice)))
    const edited = createMsfaCompatibleVoiceBridge(createVirtualDx7RenderPlan(createRequest(changed)))

    expect(Array.from(edited.voiceData)).not.toEqual(Array.from(original.voiceData))
    expect(edited.operatorEnableMask).toBe(original.operatorEnableMask)
  })
})
