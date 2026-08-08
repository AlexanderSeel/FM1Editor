export const VIRTUAL_FM1_BROWSER_PERFORMANCE_LIMITS = Object.freeze({
  /** Mean callback render time may use at most 5% of the 128-frame audio quantum budget. */
  meanUtilization: 0.05,
  /** Individual measured callbacks may use at most 60% of the audio quantum budget. */
  maxUtilization: 0.60,
  /** Accepted observation windows must not contain a callback that exceeded the quantum budget. */
  overBudgetCallbacks: 0,
})

export interface VirtualFm1PerformanceSample {
  readonly meanUtilization: number
  readonly maxUtilization: number
  readonly overBudgetCallbacks: number
  readonly callbacks: number
}

export interface VirtualFm1PerformanceAssessment {
  readonly ok: boolean
  readonly failures: readonly string[]
}

export function assessVirtualFm1Performance(
  sample: VirtualFm1PerformanceSample,
): VirtualFm1PerformanceAssessment {
  const failures: string[] = []
  if (!Number.isFinite(sample.meanUtilization) || sample.meanUtilization < 0) {
    failures.push('mean utilization is not a finite non-negative value')
  } else if (sample.meanUtilization > VIRTUAL_FM1_BROWSER_PERFORMANCE_LIMITS.meanUtilization) {
    failures.push(`mean utilization ${(sample.meanUtilization * 100).toFixed(1)}% exceeds ${(VIRTUAL_FM1_BROWSER_PERFORMANCE_LIMITS.meanUtilization * 100).toFixed(1)}%`)
  }
  if (!Number.isFinite(sample.maxUtilization) || sample.maxUtilization < 0) {
    failures.push('max utilization is not a finite non-negative value')
  } else if (sample.maxUtilization > VIRTUAL_FM1_BROWSER_PERFORMANCE_LIMITS.maxUtilization) {
    failures.push(`max utilization ${(sample.maxUtilization * 100).toFixed(1)}% exceeds ${(VIRTUAL_FM1_BROWSER_PERFORMANCE_LIMITS.maxUtilization * 100).toFixed(1)}%`)
  }
  if (!Number.isInteger(sample.callbacks) || sample.callbacks <= 0) failures.push('callback count must be a positive integer')
  if (!Number.isInteger(sample.overBudgetCallbacks) || sample.overBudgetCallbacks < 0) {
    failures.push('over-budget callback count must be a non-negative integer')
  } else if (sample.overBudgetCallbacks > VIRTUAL_FM1_BROWSER_PERFORMANCE_LIMITS.overBudgetCallbacks) {
    failures.push(`${sample.overBudgetCallbacks} callback(s) exceeded the audio quantum budget`)
  }
  return { ok: failures.length === 0, failures }
}
