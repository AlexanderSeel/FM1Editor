interface MIDIPort extends EventTarget {
  readonly id: string
  readonly manufacturer?: string
  readonly name?: string
  readonly state: 'connected' | 'disconnected'
  readonly connection: 'open' | 'closed' | 'pending'
  readonly type: 'input' | 'output'
  readonly version?: string
  open(): Promise<MIDIPort>
  close(): Promise<MIDIPort>
}

interface MIDIMessageEvent extends Event {
  readonly data: Uint8Array
}

interface MIDIInput extends MIDIPort {
  readonly type: 'input'
  onmidimessage: ((event: MIDIMessageEvent) => void) | null
}

interface MIDIOutput extends MIDIPort {
  readonly type: 'output'
  send(data: Uint8Array | number[], timestamp?: number): void
  clear(): void
}

interface MIDIPortMap<T extends MIDIPort> {
  readonly size: number
  entries(): MapIterator<[string, T]>
  keys(): MapIterator<string>
  values(): MapIterator<T>
  forEach(callback: (value: T, key: string, map: MIDIPortMap<T>) => void): void
  get(id: string): T | undefined
  has(id: string): boolean
}

interface MIDIConnectionEvent extends Event {
  readonly port: MIDIPort
}

interface MIDIAccess extends EventTarget {
  readonly inputs: MIDIPortMap<MIDIInput>
  readonly outputs: MIDIPortMap<MIDIOutput>
  readonly sysexEnabled: boolean
  onstatechange: ((event: MIDIConnectionEvent) => void) | null
}

interface Navigator {
  requestMIDIAccess?: (options?: { sysex?: boolean; software?: boolean }) => Promise<MIDIAccess>
}
