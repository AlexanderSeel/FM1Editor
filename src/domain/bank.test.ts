import { describe, expect, it } from 'vitest'
import { moveBankVoice } from './bank'
import { createInitializedVoice } from './voice'

describe('moveBankVoice', () => {
  it('reorders without mutating the imported bank', () => {
    const voices = ['A', 'B', 'C'].map((name) => createInitializedVoice(name))
    const moved = moveBankVoice(voices, 0, 2)
    expect(moved.map((voice) => voice.name)).toEqual(['B', 'C', 'A'])
    expect(voices.map((voice) => voice.name)).toEqual(['A', 'B', 'C'])
  })

  it('returns the original bank for invalid moves', () => {
    const voices = [createInitializedVoice('A')]
    expect(moveBankVoice(voices, 0, 4)).toBe(voices)
  })
})
