import { describe, expect, it } from 'vitest'
import {
  createEmptyDx7HardwareChecks,
  dx7OutstandingChecks,
  isSha256,
} from './dx7HardwareEvidence'

describe('stock DX7 hardware evidence', () => {
  it('starts every stock-DX7 hardware observation pending', () => {
    const checks = createEmptyDx7HardwareChecks()
    const outstanding = dx7OutstandingChecks(checks)
    expect(outstanding).toContain('single-edit-buffer')
    expect(outstanding).toContain('bank-recovery')
    expect(outstanding).toContain('operator-mask-155')
    expect(outstanding).toContain('function-controller-assignments')
    expect(outstanding).toContain('edge-interface-resilience')

    checks['single-edit-buffer'] = { status: 'fail', notes: 'DX7 did not update the edit buffer.' }
    expect(dx7OutstandingChecks(checks)).not.toContain('single-edit-buffer')
  })

  it('requires a full SHA-256 identity for a recovery bank', () => {
    expect(isSha256('a'.repeat(64))).toBe(true)
    expect(isSha256('A'.repeat(64))).toBe(true)
    expect(isSha256('a'.repeat(63))).toBe(false)
    expect(isSha256('not-a-hash')).toBe(false)
  })
})
