import type { PreparedReferenceAudio } from './referenceAudio'

let currentReference: PreparedReferenceAudio | null = null
const listeners = new Set<() => void>()

export function getPreparedReferenceAudioSnapshot(): PreparedReferenceAudio | null {
  return currentReference
}

export function setPreparedReferenceAudio(reference: PreparedReferenceAudio | null): void {
  if (currentReference === reference) return
  currentReference = reference
  for (const listener of listeners) listener()
}

export function subscribePreparedReferenceAudio(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function clearPreparedReferenceAudioStore(): void {
  setPreparedReferenceAudio(null)
}
