export interface HistoryState<T> {
  readonly past: readonly T[]
  readonly present: T
  readonly future: readonly T[]
  readonly savedSignature: string
}

const DEFAULT_HISTORY_LIMIT = 100

export function valueSignature(value: unknown): string {
  return JSON.stringify(value, (_key, candidate: unknown) => {
    if (candidate instanceof Uint8Array) return { type: 'Uint8Array', data: Array.from(candidate) }
    return candidate
  }) ?? 'undefined'
}

export function createHistoryState<T>(initial: T): HistoryState<T> {
  return {
    past: [],
    present: initial,
    future: [],
    savedSignature: valueSignature(initial),
  }
}

export function commitHistory<T>(state: HistoryState<T>, next: T, limit = DEFAULT_HISTORY_LIMIT): HistoryState<T> {
  if (valueSignature(state.present) === valueSignature(next)) return state
  const past = [...state.past, state.present]
  return {
    ...state,
    past: past.slice(Math.max(0, past.length - Math.max(1, limit))),
    present: next,
    future: [],
  }
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  const previous = state.past.at(-1)
  if (previous === undefined) return state
  return {
    ...state,
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  }
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  const next = state.future[0]
  if (next === undefined) return state
  return {
    ...state,
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  }
}

export function resetHistory<T>(state: HistoryState<T>, next: T): HistoryState<T> {
  return {
    past: [],
    present: next,
    future: [],
    savedSignature: valueSignature(next),
  }
}

export function markHistorySaved<T>(state: HistoryState<T>): HistoryState<T> {
  const savedSignature = valueSignature(state.present)
  if (savedSignature === state.savedSignature) return state
  return { ...state, savedSignature }
}

export function isHistoryDirty<T>(state: HistoryState<T>): boolean {
  return valueSignature(state.present) !== state.savedSignature
}
