export const DX7_OPERATOR_ENABLE_PARAMETER = 155
export const DX7_OPERATOR_ENABLE_MASK_MAX = 0x3f

export type Dx7OperatorEnableState = readonly [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
]

export interface Dx7EditSession {
  operatorEnabled: Dx7OperatorEnableState
}

export function createDx7EditSession(): Dx7EditSession {
  return { operatorEnabled: [true, true, true, true, true, true] }
}

function assertOperatorIndex(operatorIndex: number): void {
  if (!Number.isInteger(operatorIndex) || operatorIndex < 0 || operatorIndex > 5) {
    throw new RangeError(`DX7 operator index must be from 0 to 5; received ${operatorIndex}.`)
  }
}

function assertOperatorMask(mask: number): void {
  if (!Number.isInteger(mask) || mask < 0 || mask > DX7_OPERATOR_ENABLE_MASK_MAX) {
    throw new RangeError(`DX7 operator enable mask must be from 0 to 63; received ${mask}.`)
  }
}

/**
 * Yamaha parameter 155 is edit-session state, not voice payload data.
 * Bit 5 controls OP1 through bit 0 controlling OP6; bit 6 remains zero.
 */
export function encodeDx7OperatorEnableMask(state: Dx7OperatorEnableState): number {
  return state.reduce((mask, enabled, operatorIndex) =>
    enabled ? mask | (1 << (5 - operatorIndex)) : mask,
  0)
}

export function decodeDx7OperatorEnableMask(mask: number): Dx7OperatorEnableState {
  assertOperatorMask(mask)
  return Array.from({ length: 6 }, (_, operatorIndex) =>
    (mask & (1 << (5 - operatorIndex))) !== 0,
  ) as unknown as Dx7OperatorEnableState
}

export function setDx7OperatorEnabled(
  session: Dx7EditSession,
  operatorIndex: number,
  enabled: boolean,
): Dx7EditSession {
  assertOperatorIndex(operatorIndex)
  const operatorEnabled = [...session.operatorEnabled] as [boolean, boolean, boolean, boolean, boolean, boolean]
  operatorEnabled[operatorIndex] = enabled
  return { ...session, operatorEnabled }
}

export function toggleDx7Operator(
  session: Dx7EditSession,
  operatorIndex: number,
): Dx7EditSession {
  assertOperatorIndex(operatorIndex)
  return setDx7OperatorEnabled(session, operatorIndex, !session.operatorEnabled[operatorIndex])
}
