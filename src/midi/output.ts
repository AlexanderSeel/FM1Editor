export interface MidiOutputTarget {
  readonly id: string
  readonly name: string | null
  open(): Promise<MIDIPort>
  send(data: Uint8Array | number[], timestamp?: number): void
  clear?(): void
}
