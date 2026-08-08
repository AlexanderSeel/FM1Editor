import type { Fm1FxState } from '../domain/fx'

export interface Dx7CandidateFxAttachment {
  readonly state: Fm1FxState
  readonly nonZeroControls: number
}

/**
 * Capture browser-local FM-1-inspired software FX as optional reconstruction metadata.
 * The snapshot is detached from the live editor object and has no MIDI/hardware behavior.
 */
export function createDx7CandidateFxAttachment(state: Fm1FxState): Dx7CandidateFxAttachment {
  const values = { ...state.values }
  return {
    state: { midiChannel: state.midiChannel, values },
    nonZeroControls: Object.values(values).filter((value) => value !== 0).length,
  }
}
