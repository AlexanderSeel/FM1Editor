import type { MidiPortInfo } from './webMidi'

export interface MidiPortPreference {
  id: string
  name: string
  manufacturer: string
}

export function createMidiPortPreference(port: MidiPortInfo): MidiPortPreference {
  return {
    id: port.id,
    name: port.name,
    manufacturer: port.manufacturer,
  }
}

export function choosePreferredPort(
  ports: readonly MidiPortInfo[],
  currentId: string | null,
  preference: MidiPortPreference | null,
  suggestedId: string | null = null,
): string | null {
  if (currentId && ports.some((port) => port.id === currentId)) return currentId
  if (preference) {
    const exactId = ports.find((port) => port.id === preference.id)
    if (exactId) return exactId.id
    const descriptorMatch = ports.find((port) =>
      port.name === preference.name && port.manufacturer === preference.manufacturer,
    )
    if (descriptorMatch) return descriptorMatch.id
  }
  if (suggestedId && ports.some((port) => port.id === suggestedId)) return suggestedId
  return ports[0]?.id ?? null
}
