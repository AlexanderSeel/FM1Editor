import { describe, expect, it } from 'vitest'
import { getDx7Algorithm, type Dx7OperatorNumber } from './dx7Algorithms'
import { createInitializedVoice } from './voice'
import {
  cloneDx7Voice,
  createInitializedVoiceVariant,
  INITIALIZED_VOICE_VARIANTS,
  mutateVoice,
  randomizeVoice,
  type RandomSource,
} from './voiceVariations'
import { validateVoice } from '../sysex/dx7'

function sequenceRandom(values: readonly number[]): RandomSource {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value ?? 0.5
  }
}

describe('voice variations', () => {
  it('creates standards-compliant initialized variants', () => {
    for (const variant of INITIALIZED_VOICE_VARIANTS) {
      const voice = createInitializedVoiceVariant(variant.id)
      expect(() => validateVoice(voice)).not.toThrow()
      expect(voice.name.length).toBeLessThanOrEqual(10)
      expect(voice.source).toBeUndefined()
    }
  })

  it('keeps every random carrier audible and every value valid', () => {
    const voice = randomizeVoice(sequenceRandom([0.02, 0.18, 0.41, 0.63, 0.87, 0.97]))
    const carriers = new Set(getDx7Algorithm(voice.algorithm).carriers)

    expect(() => validateVoice(voice)).not.toThrow()
    voice.operators.forEach((operator, index) => {
      if (carriers.has((index + 1) as Dx7OperatorNumber)) {
        expect(operator.outputLevel).toBeGreaterThanOrEqual(68)
      }
    })
  })

  it('mutates within valid ranges without retaining imported source bytes', () => {
    const sourceVoice = {
      ...createInitializedVoice('SOURCE'),
      source: {
        packed: new Uint8Array(128).fill(0x7f),
        unpacked: new Uint8Array(155).fill(0x7e),
      },
    }
    const mutated = mutateVoice(sourceVoice, 'strong', sequenceRandom([0, 0.25, 0.5, 0.75, 0.99]))

    expect(() => validateVoice(mutated)).not.toThrow()
    expect(mutated.source).toBeUndefined()
    expect(mutated).not.toEqual(sourceVoice)
  })

  it('protects carrier output from silent mutations', () => {
    const source = createInitializedVoiceVariant('bright-stack')
    const mutated = mutateVoice(source, 'strong', () => 0)
    const carriers = new Set(getDx7Algorithm(mutated.algorithm).carriers)

    mutated.operators.forEach((operator, index) => {
      if (carriers.has((index + 1) as Dx7OperatorNumber)) {
        expect(operator.outputLevel).toBeGreaterThanOrEqual(30)
      }
    })
  })

  it('clones nested voice and source data independently', () => {
    const source = {
      ...createInitializedVoice('CLONE'),
      source: { packed: new Uint8Array([1, 2, 3]) },
    }
    const clone = cloneDx7Voice(source)

    expect(clone).toEqual(source)
    expect(clone).not.toBe(source)
    expect(clone.operators[0]).not.toBe(source.operators[0])
    expect(clone.source?.packed).not.toBe(source.source.packed)

    clone.source?.packed?.fill(9)
    expect(Array.from(source.source.packed)).toEqual([1, 2, 3])
  })
})
