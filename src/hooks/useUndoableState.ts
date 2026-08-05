import { useCallback, useState } from 'react'
import {
  commitHistory,
  createHistoryState,
  isHistoryDirty,
  markHistorySaved,
  redoHistory,
  resetHistory,
  undoHistory,
} from '../history/history'

export interface UndoableState<T> {
  readonly value: T
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly dirty: boolean
  readonly setValue: (next: T) => void
  readonly undo: () => void
  readonly redo: () => void
  readonly reset: (next: T) => void
  readonly markSaved: () => void
}

export function useUndoableState<T>(initial: T | (() => T)): UndoableState<T> {
  const [history, setHistory] = useState(() => createHistoryState(
    typeof initial === 'function' ? (initial as () => T)() : initial,
  ))

  const setValue = useCallback((next: T) => {
    setHistory((current) => commitHistory(current, next))
  }, [])

  const undo = useCallback(() => {
    setHistory(undoHistory)
  }, [])

  const redo = useCallback(() => {
    setHistory(redoHistory)
  }, [])

  const reset = useCallback((next: T) => {
    setHistory((current) => resetHistory(current, next))
  }, [])

  const markSaved = useCallback(() => {
    setHistory(markHistorySaved)
  }, [])

  return {
    value: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    dirty: isHistoryDirty(history),
    setValue,
    undo,
    redo,
    reset,
    markSaved,
  }
}
