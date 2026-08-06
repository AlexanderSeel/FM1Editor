import { describe, expect, it } from 'vitest'
import { dx7BreakpointNoteName } from './dx7Note'

describe('DX7 breakpoint note names', () => {
  it('maps the documented 0-99 range from A-1 through C8', () => {
    expect(dx7BreakpointNoteName(0)).toBe('A-1')
    expect(dx7BreakpointNoteName(3)).toBe('C0')
    expect(dx7BreakpointNoteName(39)).toBe('C3')
    expect(dx7BreakpointNoteName(99)).toBe('C8')
  })

  it('clamps compatibility values to the documented range', () => {
    expect(dx7BreakpointNoteName(-1)).toBe('A-1')
    expect(dx7BreakpointNoteName(127)).toBe('C8')
  })
})
