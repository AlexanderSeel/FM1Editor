import { describe, expect, it } from 'vitest'
import { createInitializedVoice, type Dx7Voice } from '../domain/voice'
import {
  assertVirtualDx7PcmRender,
  createVirtualDx7RenderPlan,
  VIRTUAL_DX7_RENDER_BLOCK_FRAMES,
  type VirtualDx7RenderRequest,
} from './virtualDx7Engine'

const createRequest = (voice: Dx7Voice = createInitializedVoice()): VirtualDx7RenderRequest => ({
  voice,
  midiNote: 60,
  velocity: 100,
  sampleRate: 48_000,
  noteOnSeconds: 1,
  releaseSeconds: 0.5,
  randomSeed: 42,
})

describe('virtual DX7 renderer boundary', () => {
  it('creates a deterministic semantic render plan', () => {
    const first = createVirtualDx7RenderPlan(createRequest())
    const second = createVirtualDx7RenderPlan(createRequest())

    expect(first).toEqual(second)
    expect(first.noteOnFrames).toBe(48_000)
    expect(first.releaseFrames).toBe(24_000)
    expect(first.totalFrames).toBe(72_000)
    expect(first.renderKey).toMatch(/^dx7-render-v1-[0-9a-f]{8}$/)
  })

  it('aligns arbitrary requested durations to the 64-frame MSFA render quantum', () => {
    const plan = createVirtualDx7RenderPlan({
      ...createRequest(),
      sampleRate: 44_100,
      noteOnSeconds: 1,
      releaseSeconds: 0.1,
    })

    expect(plan.noteOnFrames).toBe(44_160)
    expect(plan.releaseFrames).toBe(4_416)
    expect(plan.noteOnFrames % VIRTUAL_DX7_RENDER_BLOCK_FRAMES).toBe(0)
    expect(plan.releaseFrames % VIRTUAL_DX7_RENDER_BLOCK_FRAMES).toBe(0)
  })

  it('excludes display metadata and imported raw bytes from render identity', () => {
    const voice = createInitializedVoice('FIRST NAME')
    const renamed: Dx7Voice = {
      ...voice,
      name: 'SECOND NAME',
      source: {
        packed: new Uint8Array([1, 2, 3]),
        unpacked: new Uint8Array([4, 5, 6]),
      },
    }

    const first = createVirtualDx7RenderPlan(createRequest(voice))
    const second = createVirtualDx7RenderPlan(createRequest(renamed))

    expect(second.renderKey).toBe(first.renderKey)
    expect(second.voice).not.toHaveProperty('name')
    expect(second.voice).not.toHaveProperty('source')
  })

  it('changes the render identity when a legal semantic parameter changes', () => {
    const voice = createInitializedVoice()
    const changed: Dx7Voice = { ...voice, algorithm: 2 }

    expect(createVirtualDx7RenderPlan(createRequest(changed)).renderKey)
      .not.toBe(createVirtualDx7RenderPlan(createRequest(voice)).renderKey)
  })

  it('rejects semantic values outside Yamaha-compatible ranges', () => {
    const voice = createInitializedVoice()
    const operators = voice.operators.map((operator, index) => (
      index === 0 ? { ...operator, outputLevel: 100 } : operator
    )) as unknown as Dx7Voice['operators']
    const invalid: Dx7Voice = { ...voice, operators }

    expect(() => createVirtualDx7RenderPlan(createRequest(invalid)))
      .toThrow('voice.operators[0].outputLevel')
  })

  it('validates PCM shape, normalization and plan identity', () => {
    const plan = createVirtualDx7RenderPlan(createRequest())
    const samples = new Float32Array(plan.totalFrames)

    expect(() => assertVirtualDx7PcmRender(plan, {
      renderKey: plan.renderKey,
      sampleRate: plan.sampleRate,
      channelCount: 1,
      frameCount: plan.totalFrames,
      samples,
    })).not.toThrow()

    samples[0] = Number.NaN
    expect(() => assertVirtualDx7PcmRender(plan, {
      renderKey: plan.renderKey,
      sampleRate: plan.sampleRate,
      channelCount: 1,
      frameCount: plan.totalFrames,
      samples,
    })).toThrow('PCM sample 0')
  })
})
