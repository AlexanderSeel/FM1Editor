import { createDx7EditSession, encodeDx7OperatorEnableMask } from '../domain/dx7EditSession'
import type { Dx7Voice } from '../domain/voice'
import { DX7_SINGLE_DATA_LENGTH, encodeSingleVoiceData } from '../sysex/dx7'
import type { VirtualDx7RenderPlan, VirtualDx7SemanticVoice } from './virtualDx7Engine'

export const MSFA_COMPATIBLE_PATCH_LENGTH = 156
export const MSFA_OPERATOR_MASK_OFFSET = DX7_SINGLE_DATA_LENGTH

export interface MsfaCompatibleVoiceBridge {
  renderKey: string
  /** Canonical Yamaha-compatible edit-buffer bytes 0..154. */
  voiceData: Uint8Array
  /** Separate Yamaha edit-session parameter 155. It is not voice payload data. */
  operatorEnableMask: number
  /**
   * Private bridge buffer for the audited MSFA-compatible C++ adapter only.
   * Bytes 0..154 contain voice data and byte 155 contains operatorEnableMask.
   * This buffer must never be exposed as SysEx or sent to hardware.
   */
  patchBuffer: Uint8Array
}

const ALL_OPERATORS_ENABLED = createDx7EditSession().operatorEnabled
const ALL_OPERATORS_ENABLED_MASK = encodeDx7OperatorEnableMask(ALL_OPERATORS_ENABLED)

function semanticVoiceForEncoding(voice: VirtualDx7SemanticVoice): Dx7Voice {
  return {
    ...voice,
    // Voice name is metadata and is excluded from the virtual render identity.
    // Canonicalizing it prevents names or imported raw source bytes from
    // affecting the private engine buffer.
    name: '',
  }
}

export function createMsfaCompatibleVoiceBridge(plan: VirtualDx7RenderPlan): MsfaCompatibleVoiceBridge {
  const voiceData = encodeSingleVoiceData(semanticVoiceForEncoding(plan.voice))
  if (voiceData.length !== DX7_SINGLE_DATA_LENGTH) {
    throw new Error(`DX7 semantic encoder returned ${voiceData.length} bytes; expected ${DX7_SINGLE_DATA_LENGTH}`)
  }

  const patchBuffer = new Uint8Array(MSFA_COMPATIBLE_PATCH_LENGTH)
  patchBuffer.set(voiceData, 0)
  patchBuffer[MSFA_OPERATOR_MASK_OFFSET] = ALL_OPERATORS_ENABLED_MASK

  return {
    renderKey: plan.renderKey,
    voiceData,
    operatorEnableMask: ALL_OPERATORS_ENABLED_MASK,
    patchBuffer,
  }
}
