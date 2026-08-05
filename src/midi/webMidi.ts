export type MidiSupport =
  | { supported: true; secureContext: boolean }
  | { supported: false; secureContext: boolean; reason: string }

export interface MidiPortInfo {
  id: string
  name: string
  manufacturer: string
  state: MIDIPort['state']
  connection: MIDIPort['connection']
}

export function getMidiSupport(): MidiSupport {
  const secureContext = window.isSecureContext

  if (!navigator.requestMIDIAccess) {
    return {
      supported: false,
      secureContext,
      reason: 'This browser does not expose the Web MIDI API.',
    }
  }

  if (!secureContext) {
    return {
      supported: false,
      secureContext,
      reason: 'Web MIDI requires HTTPS or localhost.',
    }
  }

  return { supported: true, secureContext }
}

export async function requestSysexMidiAccess(): Promise<MIDIAccess> {
  if (!navigator.requestMIDIAccess) {
    throw new Error('Web MIDI is unavailable in this browser.')
  }

  return navigator.requestMIDIAccess({ sysex: true })
}

export function describePort(port: MIDIPort): MidiPortInfo {
  return {
    id: port.id,
    name: port.name?.trim() || 'Unnamed MIDI port',
    manufacturer: port.manufacturer?.trim() || 'Unknown manufacturer',
    state: port.state,
    connection: port.connection,
  }
}
