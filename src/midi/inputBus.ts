export interface MidiInputBusMessage {
  data: Uint8Array
  timestamp: number
}

export type MidiInputBusListener = (message: MidiInputBusMessage) => void

const listeners = new Set<MidiInputBusListener>()

export function publishMidiInputMessage(data: ArrayLike<number>, timestamp = performance.now()): void {
  const message: MidiInputBusMessage = {
    data: Uint8Array.from(data),
    timestamp,
  }
  listeners.forEach((listener) => listener(message))
}

export function subscribeMidiInputMessages(listener: MidiInputBusListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
