export type MidiMonitorDirection = 'in' | 'out'

export interface MidiMonitorEntry {
  id: string
  timestamp: number
  direction: MidiMonitorDirection
  portId: string
  portName: string
  data: readonly number[]
  summary: string
}

export interface MidiByteDifference {
  index: number
  before: number | null
  after: number | null
}

export interface MidiMessageComparison {
  direction: MidiMonitorDirection
  leftId: string
  rightId: string
  leftLength: number
  rightLength: number
  differenceCount: number
  commonPrefixLength: number
  commonSuffixLength: number
  differences: readonly MidiByteDifference[]
}

let entrySequence = 0

function channelNumber(status: number): number {
  return (status & 0x0f) + 1
}

export function formatMidiHex(data: ArrayLike<number>): string {
  return Array.from(data, (value) => (value & 0xff).toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

export function summarizeMidiMessage(data: ArrayLike<number>): string {
  const bytes = Array.from(data, (value) => value & 0xff)
  const status = bytes[0]
  if (status === undefined) return 'Empty message'
  if (status === 0xf0) return `SysEx · ${bytes.length} bytes`
  if (status === 0xf8) return 'MIDI clock'
  if (status === 0xfa) return 'Start'
  if (status === 0xfb) return 'Continue'
  if (status === 0xfc) return 'Stop'

  const command = status & 0xf0
  const channel = channelNumber(status)
  const data1 = bytes[1] ?? 0
  const data2 = bytes[2] ?? 0
  if (command === 0x80) return `Note Off · ch ${channel} · note ${data1} · velocity ${data2}`
  if (command === 0x90) return data2 === 0
    ? `Note Off · ch ${channel} · note ${data1} · velocity 0`
    : `Note On · ch ${channel} · note ${data1} · velocity ${data2}`
  if (command === 0xa0) return `Poly aftertouch · ch ${channel} · note ${data1} · value ${data2}`
  if (command === 0xb0) return `CC · ch ${channel} · controller ${data1} · value ${data2}`
  if (command === 0xc0) return `Program change · ch ${channel} · program ${data1 + 1}`
  if (command === 0xd0) return `Channel pressure · ch ${channel} · value ${data1}`
  if (command === 0xe0) return `Pitch bend · ch ${channel} · value ${(data2 << 7) | data1}`
  return `MIDI · ${bytes.length} bytes`
}

export function createMidiMonitorEntry(
  direction: MidiMonitorDirection,
  port: { id: string; name?: string | null },
  data: ArrayLike<number>,
  timestamp = Date.now(),
): MidiMonitorEntry {
  const bytes = Array.from(data, (value) => value & 0xff)
  entrySequence += 1
  return {
    id: `${timestamp}-${entrySequence}`,
    timestamp,
    direction,
    portId: port.id,
    portName: port.name || 'Unnamed MIDI port',
    data: bytes,
    summary: summarizeMidiMessage(bytes),
  }
}

export function compareMidiMonitorEntries(left: MidiMonitorEntry, right: MidiMonitorEntry): MidiMessageComparison {
  if (left.direction !== right.direction) throw new Error('MIDI comparison requires entries with the same direction.')
  const minimumLength = Math.min(left.data.length, right.data.length)
  let commonPrefixLength = 0
  while (commonPrefixLength < minimumLength && left.data[commonPrefixLength] === right.data[commonPrefixLength]) {
    commonPrefixLength += 1
  }

  let commonSuffixLength = 0
  const maximumSuffix = Math.max(0, minimumLength - commonPrefixLength)
  while (
    commonSuffixLength < maximumSuffix
    && left.data[left.data.length - 1 - commonSuffixLength] === right.data[right.data.length - 1 - commonSuffixLength]
  ) {
    commonSuffixLength += 1
  }

  const maximumLength = Math.max(left.data.length, right.data.length)
  const differences: MidiByteDifference[] = []
  for (let index = 0; index < maximumLength; index += 1) {
    const before = index < left.data.length ? (left.data[index] ?? 0) : null
    const after = index < right.data.length ? (right.data[index] ?? 0) : null
    if (before !== after) differences.push({ index, before, after })
  }

  return {
    direction: left.direction,
    leftId: left.id,
    rightId: right.id,
    leftLength: left.data.length,
    rightLength: right.data.length,
    differenceCount: differences.length,
    commonPrefixLength,
    commonSuffixLength,
    differences,
  }
}

export function latestSameDirectionSysexComparison(entries: readonly MidiMonitorEntry[]): MidiMessageComparison | null {
  let latest: MidiMonitorEntry | null = null
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const candidate = entries[index]
    if (!candidate || candidate.data[0] !== 0xf0) continue
    latest = candidate
    break
  }
  if (!latest) return null

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const candidate = entries[index]
    if (!candidate || candidate.id === latest.id || candidate.direction !== latest.direction || candidate.data[0] !== 0xf0) continue
    return compareMidiMonitorEntries(candidate, latest)
  }
  return null
}

export function serializeMidiMonitor(entries: readonly MidiMonitorEntry[]): string {
  return `${JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)}\n`
}
