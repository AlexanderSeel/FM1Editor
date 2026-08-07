import { createInitializedVoice, type Dx7Voice } from '../domain/voice'
import { encodeSingleVoiceMessage } from '../sysex/dx7'
import type { VirtualDx7RenderRequest } from './virtualDx7Engine'

export const VIRTUAL_DX7_REFERENCE_FIXTURE_ID = 'fm1-editor-reference-voice-v1' as const
export const VIRTUAL_DX7_REFERENCE_SYSEX_FILENAME = 'fm1-editor-reference-voice-v1.syx' as const

const OPERATOR_SPECS = [
  { outputLevel: 99, coarse: 1, fine: 0, detune: 7, rates: [96, 72, 58, 52], levels: [99, 86, 72, 0] },
  { outputLevel: 82, coarse: 2, fine: 3, detune: 8, rates: [91, 68, 54, 48], levels: [99, 79, 61, 0] },
  { outputLevel: 74, coarse: 3, fine: 7, detune: 6, rates: [88, 64, 52, 44], levels: [99, 74, 55, 0] },
  { outputLevel: 69, coarse: 1, fine: 14, detune: 9, rates: [84, 61, 49, 42], levels: [99, 70, 50, 0] },
  { outputLevel: 57, coarse: 2, fine: 0, detune: 5, rates: [82, 58, 46, 40], levels: [99, 66, 46, 0] },
  { outputLevel: 51, coarse: 4, fine: 9, detune: 7, rates: [79, 55, 43, 38], levels: [99, 62, 42, 0] },
] as const

/**
 * Repository-owned synthetic voice used only for deterministic renderer tests.
 * It is not copied from a factory or third-party patch bank.
 */
export function createVirtualDx7ReferenceVoice(): Dx7Voice {
  const base = createInitializedVoice('FM1 REF V1')
  const operators = base.operators.map((operator, index) => {
    const spec = OPERATOR_SPECS[index]
    if (!spec) throw new Error(`Missing synthetic operator specification ${index}`)
    return {
      ...operator,
      envelope: {
        rates: [...spec.rates],
        levels: [...spec.levels],
      },
      keyVelocitySensitivity: index % 3,
      amplitudeModulationSensitivity: index % 2,
      outputLevel: spec.outputLevel,
      frequencyCoarse: spec.coarse,
      frequencyFine: spec.fine,
      detune: spec.detune,
    }
  }) as unknown as Dx7Voice['operators']

  return {
    ...base,
    operators,
    pitchEnvelope: {
      rates: [72, 61, 55, 49],
      levels: [50, 53, 48, 50],
    },
    algorithm: 5,
    feedback: 3,
    oscillatorKeySync: true,
    lfo: {
      speed: 28,
      delay: 12,
      pitchModulationDepth: 4,
      amplitudeModulationDepth: 2,
      keySync: true,
      waveform: 'triangle',
      pitchModulationSensitivity: 2,
    },
    transpose: 24,
  }
}

export function createVirtualDx7ReferenceSysex(): Uint8Array {
  return encodeSingleVoiceMessage(createVirtualDx7ReferenceVoice(), 0)
}

export function createVirtualDx7ReferenceRenderRequest(): VirtualDx7RenderRequest {
  return {
    voice: createVirtualDx7ReferenceVoice(),
    midiNote: 60,
    velocity: 100,
    sampleRate: 48_000,
    noteOnSeconds: 1,
    releaseSeconds: 0.5,
    randomSeed: 42,
  }
}
