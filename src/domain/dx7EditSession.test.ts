import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from './voice'
import {
  createDx7EditSession,
  decodeDx7OperatorEnableMask,
  DX7_OPERATOR_ENABLE_PARAMETER,
  encodeDx7OperatorEnableMask,
  setDx7OperatorEnabled,
  toggleDx7Operator,
} from './dx7EditSession'
import {
  encodePackedVoice,
  encodeSingleVoiceData,
} from '../sysex/dx7'

describe('DX7 operator enable edit session', () => {
  it('maps OP1 to bit 5 and OP6 to bit 0', () => {
    expect(DX7_OPERATOR_ENABLE_PARAMETER).toBe(155)
    expect(encodeDx7OperatorEnableMask([true, false, false, false, false, false])).toBe(0x20)
    expect(encodeDx7OperatorEnableMask([false, false, false, false, false, true])).toBe(0x01)
    expect(encodeDx7OperatorEnableMask([true, true, true, true, true, true])).toBe(0x3f)
  })

  it('round-trips every valid six-bit mask', () => {
    for (let mask = 0; mask <= 0x3f; mask += 1) {
      expect(encodeDx7OperatorEnableMask(decodeDx7OperatorEnableMask(mask))).toBe(mask)
    }
  })

  it('updates immutable session state without modifying voice data', () => {
    const initial = createDx7EditSession()
    const disabledOp3 = setDx7OperatorEnabled(initial, 2, false)
    const restoredOp3 = toggleDx7Operator(disabledOp3, 2)

    expect(initial.operatorEnabled).toEqual([true, true, true, true, true, true])
    expect(disabledOp3.operatorEnabled).toEqual([true, true, false, true, true, true])
    expect(restoredOp3.operatorEnabled).toEqual(initial.operatorEnabled)
  })

  it('never adds parameter 155 to single or packed voice payloads', () => {
    const voice = createInitializedVoice('SESSION')
    const session = setDx7OperatorEnabled(createDx7EditSession(), 0, false)

    expect(encodeDx7OperatorEnableMask(session.operatorEnabled)).toBe(0x1f)
    expect(encodeSingleVoiceData(voice)).toHaveLength(155)
    expect(encodePackedVoice(voice)).toHaveLength(128)
  })

  it('rejects invalid masks and operator indexes', () => {
    expect(() => decodeDx7OperatorEnableMask(64)).toThrow(/0 to 63/)
    expect(() => toggleDx7Operator(createDx7EditSession(), 6)).toThrow(/0 to 5/)
  })
})
