import { describe, expect, it } from 'vitest'
import { assessVirtualFm1Performance, VIRTUAL_FM1_BROWSER_PERFORMANCE_LIMITS } from './virtualFm1PerformanceLimits'

describe('Virtual FM-1 browser performance limits', () => {
  it('accepts the measured Chrome/Edge envelope with margin', () => {
    expect(assessVirtualFm1Performance({ meanUtilization: 0.006, maxUtilization: 0.375, overBudgetCallbacks: 0, callbacks: 128 })).toEqual({ ok: true, failures: [] })
  })

  it('rejects mean, maximum and deadline overruns independently', () => {
    const assessment = assessVirtualFm1Performance({
      meanUtilization: VIRTUAL_FM1_BROWSER_PERFORMANCE_LIMITS.meanUtilization + 0.001,
      maxUtilization: VIRTUAL_FM1_BROWSER_PERFORMANCE_LIMITS.maxUtilization + 0.001,
      overBudgetCallbacks: 1,
      callbacks: 128,
    })
    expect(assessment.ok).toBe(false)
    expect(assessment.failures).toHaveLength(3)
  })

  it('rejects malformed samples rather than treating them as passing performance evidence', () => {
    const assessment = assessVirtualFm1Performance({ meanUtilization: Number.NaN, maxUtilization: -1, overBudgetCallbacks: -1, callbacks: 0 })
    expect(assessment.ok).toBe(false)
    expect(assessment.failures).toHaveLength(4)
  })
})
