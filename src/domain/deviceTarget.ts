export type DeviceTarget = 'fm1' | 'dx7'

export interface DeviceTargetCapabilities {
  fm1BankTransfer: boolean
  fm1Effects: boolean
  midiNotes: boolean
  fileEditing: boolean
}

export interface DeviceTargetDefinition {
  id: DeviceTarget
  label: string
  shortLabel: string
  manufacturerLabel: string
  description: string
  portHint: string
  safetyBoundary: string
  unavailableEffectsReason: string | null
  capabilities: DeviceTargetCapabilities
}

export interface NamedMidiPort {
  id: string
  name: string
  manufacturer: string
}

export const DEFAULT_DEVICE_TARGET: DeviceTarget = 'fm1'
export const DEVICE_TARGET_STORAGE_KEY = 'fm1-editor.device-target'

export const DEVICE_TARGETS = [
  {
    id: 'fm1',
    label: 'M-VAVE FM-1',
    shortLabel: 'FM-1',
    manufacturerLabel: 'M-VAVE',
    description: 'Guarded FM-1 whole-bank workflow, documented effects CCs and general MIDI note playback.',
    portHint: 'A MIDI port containing FM-1 or M-VAVE is suggested when available.',
    safetyBoundary: 'File operations, documented FM-1 FX CCs, MIDI note playback and browser-local audio recording are active. Immediate single-voice transfer is disabled; device writes require an explicitly confirmed complete 32-voice bank.',
    unavailableEffectsReason: null,
    capabilities: {
      fm1BankTransfer: true,
      fm1Effects: true,
      midiNotes: true,
      fileEditing: true,
    },
  },
  {
    id: 'dx7',
    label: 'Yamaha DX7',
    shortLabel: 'DX7',
    manufacturerLabel: 'YAMAHA',
    description: 'Stock DX7 target foundation. File editing and MIDI notes remain available while DX7-specific SysEx operations stay disabled until routed explicitly.',
    portHint: 'A MIDI port containing DX7 or DX-7 is suggested when available.',
    safetyBoundary: 'File editing, MIDI note playback and browser-local audio recording are active. FM-1 bank and effects writes are disabled. DX7 SysEx transmission remains disabled until each documented operation is routed with target-specific confirmation and tests.',
    unavailableEffectsReason: 'The documented CC 0–23 effects map belongs to the FM-1 and is not sent while Yamaha DX7 is selected.',
    capabilities: {
      fm1BankTransfer: false,
      fm1Effects: false,
      midiNotes: true,
      fileEditing: true,
    },
  },
] as const satisfies readonly DeviceTargetDefinition[]

export function isDeviceTarget(value: unknown): value is DeviceTarget {
  return value === 'fm1' || value === 'dx7'
}

export function parseDeviceTarget(value: unknown): DeviceTarget {
  return isDeviceTarget(value) ? value : DEFAULT_DEVICE_TARGET
}

export function getDeviceTargetDefinition(target: DeviceTarget): DeviceTargetDefinition {
  return DEVICE_TARGETS.find((definition) => definition.id === target) ?? DEVICE_TARGETS[0]
}

export function readStoredDeviceTarget(storage: Pick<Storage, 'getItem'> | null): DeviceTarget {
  if (!storage) return DEFAULT_DEVICE_TARGET
  try {
    return parseDeviceTarget(storage.getItem(DEVICE_TARGET_STORAGE_KEY))
  } catch {
    return DEFAULT_DEVICE_TARGET
  }
}

export function writeStoredDeviceTarget(
  storage: Pick<Storage, 'setItem'> | null,
  target: DeviceTarget,
): void {
  if (!storage) return
  try {
    storage.setItem(DEVICE_TARGET_STORAGE_KEY, target)
  } catch {
    // Target selection remains usable when browser storage is blocked.
  }
}

function normalizedPortLabel(port: NamedMidiPort): string {
  return `${port.manufacturer} ${port.name}`.trim()
}

export function isSuggestedPortForTarget(port: NamedMidiPort, target: DeviceTarget): boolean {
  const label = normalizedPortLabel(port)
  if (target === 'fm1') {
    return /(^|[^a-z0-9])fm\s*[-_]?\s*1([^a-z0-9]|$)/i.test(label)
      || /m[\s-]?vave/i.test(label)
  }
  return /(^|[^a-z0-9])dx\s*[-_]?\s*7([^a-z0-9]|$)/i.test(label)
}

export function suggestMidiPortId(
  ports: readonly NamedMidiPort[],
  target: DeviceTarget,
): string | null {
  return ports.find((port) => isSuggestedPortForTarget(port, target))?.id ?? null
}
