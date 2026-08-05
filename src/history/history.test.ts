import { describe, expect, it } from 'vitest'
import {
  commitHistory,
  createHistoryState,
  isHistoryDirty,
  markHistorySaved,
  redoHistory,
  resetHistory,
  undoHistory,
  valueSignature,
} from './history'

describe('application history', () => {
  it('commits, undoes and redoes editor values', () => {
    const initial = createHistoryState({ value: 1 })
    const changed = commitHistory(initial, { value: 2 })
    const undone = undoHistory(changed)
    const redone = redoHistory(undone)

    expect(changed.present.value).toBe(2)
    expect(changed.past).toHaveLength(1)
    expect(undone.present.value).toBe(1)
    expect(undone.future).toHaveLength(1)
    expect(redone.present.value).toBe(2)
  })

  it('tracks the saved baseline through edits and undo', () => {
    const initial = createHistoryState({ value: 1 })
    const changed = commitHistory(initial, { value: 2 })

    expect(isHistoryDirty(changed)).toBe(true)
    expect(isHistoryDirty(undoHistory(changed))).toBe(false)
    expect(isHistoryDirty(markHistorySaved(changed))).toBe(false)
  })

  it('resets history when another document is loaded', () => {
    const changed = commitHistory(createHistoryState({ value: 1 }), { value: 2 })
    const reset = resetHistory(changed, { value: 8 })

    expect(reset.present.value).toBe(8)
    expect(reset.past).toHaveLength(0)
    expect(reset.future).toHaveLength(0)
    expect(isHistoryDirty(reset)).toBe(false)
  })

  it('signs Uint8Array data by its byte values', () => {
    expect(valueSignature({ data: new Uint8Array([1, 2, 3]) }))
      .toBe(valueSignature({ data: new Uint8Array([1, 2, 3]) }))
    expect(valueSignature({ data: new Uint8Array([1, 2, 3]) }))
      .not.toBe(valueSignature({ data: new Uint8Array([1, 2, 4]) }))
  })
})
