import {
  HARDWARE_EVIDENCE_SCHEMA,
  type HardwareEvidenceManifest,
} from './hardwareEvidence'

export const FM1_DELIVERY_EVIDENCE_SCHEMA = 'fm1-editor.fm1-delivery-evidence-gate.v1' as const

export type DeliveryBrowserFamily = 'chrome' | 'edge' | 'unknown'

export interface Fm1DeliveryManifestEvaluation {
  readonly index: number
  readonly browser: DeliveryBrowserFamily
  readonly createdAt: string | null
  readonly firmwareVersion: string | null
  readonly editorCommit: string | null
  readonly windowsVersion: string | null
  readonly blockers: readonly string[]
}

export interface Fm1DeliveryEvidenceGate {
  readonly schema: typeof FM1_DELIVERY_EVIDENCE_SCHEMA
  readonly evaluatedAt: string
  readonly expectedOrigin: string
  readonly expectedFirmwareVersion: string | null
  readonly ready: boolean
  readonly importedCount: number
  readonly chromePassingCount: number
  readonly edgePassingCount: number
  readonly selected: null | {
    readonly chromeIndex: number
    readonly edgeIndex: number
    readonly firmwareVersion: string
    readonly editorCommit: string
    readonly windowsVersion: string
  }
  readonly blockers: readonly string[]
  readonly manifests: readonly Fm1DeliveryManifestEvaluation[]
  readonly note: string
}

export interface EvaluateFm1DeliveryEvidenceOptions {
  readonly expectedOrigin: string
  /** Optional reviewed current-release firmware identity. When set, compatibility sessions on other firmware remain importable but cannot make the delivery gate READY. */
  readonly expectedFirmwareVersion?: string
  readonly evaluatedAt?: () => Date
}

const COMMON_REQUIRED_CHECKS = Object.freeze([
  'audio-windows-meter',
  'audio-browser-meter',
  'audio-saved-wav',
  'browser-note-off-recovery',
  'browser-channel-selection',
  'bank-destination-prompt',
  'bank-edited-slot',
  'bank-untouched-voices',
  'bank-slot-mapping',
  'bank-power-cycle',
  'bank-recovery',
] as const)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function normalizedOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function normalizedFirmware(value: string | undefined): string | null {
  const normalized = value?.trim().toUpperCase() ?? ''
  return normalized || null
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function browserFamily(value: string): DeliveryBrowserFamily {
  if (/\bEdg\/[\d.]+/i.test(value)) return 'edge'
  if (/\bChrome\/[\d.]+/i.test(value)) return 'chrome'
  return 'unknown'
}

function parseManifest(value: unknown): HardwareEvidenceManifest | null {
  if (!isRecord(value) || value.schema !== HARDWARE_EVIDENCE_SCHEMA || value.target !== 'fm1') return null
  if (typeof value.createdAt !== 'string' || typeof value.midiPermission !== 'string' || typeof value.sysexEnabled !== 'boolean') return null
  if (!isNullableString(value.selectedMidiInput) || !isNullableString(value.selectedMidiOutput)) return null
  if (!isRecord(value.identity) || !isRecord(value.browser) || !isRecord(value.audio) || !isRecord(value.midiCapture) || !isRecord(value.checks)) return null

  const identity = value.identity
  for (const key of ['tester', 'firmwareVersion', 'editorCommit', 'windowsVersion', 'browserVersion', 'driverVersion', 'usbTopology', 'audioInputLabel'] as const) {
    if (typeof identity[key] !== 'string') return null
  }
  if (!isNullableNumber(identity.midiChannel) || typeof identity.destinationBank !== 'string' || !isNullableNumber(identity.targetSlot)) return null

  const browser = value.browser
  for (const key of ['origin', 'userAgent', 'platform', 'language'] as const) {
    if (typeof browser[key] !== 'string') return null
  }
  if (typeof browser.secureContext !== 'boolean') return null

  const audio = value.audio
  if (!isNullableNumber(audio.sampleRateHz) || !isNullableNumber(audio.savedWavBitDepth) || !isNullableNumber(audio.browserChannelCount) || !isNullableNumber(audio.approximateLatencyMs)) return null
  if (typeof audio.channelLayout !== 'string' || !['unknown', 'yes', 'no'].includes(String(audio.masterAffectsUsbLevel))) return null

  const midiCapture = value.midiCapture
  if (typeof midiCapture.yamahaBankOutputCount !== 'number' || !Number.isFinite(midiCapture.yamahaBankOutputCount) || midiCapture.yamahaBankOutputCount < 0) return null

  return value as unknown as HardwareEvidenceManifest
}

function requiredCheckBlockers(manifest: HardwareEvidenceManifest, family: DeliveryBrowserFamily): string[] {
  const required: string[] = [...COMMON_REQUIRED_CHECKS]
  if (family === 'chrome') required.push('browser-chrome-resilience')
  if (family === 'edge') required.push('browser-edge-resilience')
  return required
    .filter((id) => manifest.checks[id]?.status !== 'pass')
    .map((id) => `Required physical check ${id} is not PASS.`)
}

function evaluateManifest(
  value: unknown,
  index: number,
  expectedOrigin: string,
  expectedFirmwareVersion: string | null,
): { manifest: HardwareEvidenceManifest | null; evaluation: Fm1DeliveryManifestEvaluation } {
  const manifest = parseManifest(value)
  if (!manifest) {
    return {
      manifest: null,
      evaluation: {
        index,
        browser: 'unknown',
        createdAt: null,
        firmwareVersion: null,
        editorCommit: null,
        windowsVersion: null,
        blockers: [`Manifest ${index + 1} is not an FM-1 ${HARDWARE_EVIDENCE_SCHEMA} record.`],
      },
    }
  }

  const family = browserFamily(`${manifest.identity.browserVersion} ${manifest.browser.userAgent}`)
  const blockers: string[] = []
  const firmware = manifest.identity.firmwareVersion.trim()
  const normalizedManifestFirmware = firmware.toUpperCase()
  const editorCommit = manifest.identity.editorCommit.trim()
  const windowsVersion = manifest.identity.windowsVersion.trim()

  if (family === 'unknown') blockers.push('Browser must be identifiable as branded Chrome or Microsoft Edge.')
  if (!manifest.browser.secureContext) blockers.push('Browser session was not recorded in a secure context.')
  if (normalizedOrigin(manifest.browser.origin) !== expectedOrigin) blockers.push(`Browser origin does not match ${expectedOrigin}.`)
  if (!manifest.sysexEnabled) blockers.push('No SysEx-enabled/captured session evidence was recorded.')
  if (!manifest.selectedMidiOutput?.trim()) blockers.push('Selected MIDI output was not recorded.')
  if (manifest.midiPermission === 'not recorded') blockers.push('MIDI traffic/permission evidence was not recorded.')
  if (manifest.midiCapture.yamahaBankOutputCount < 1) blockers.push('No outgoing standard Yamaha 4,104-byte bank was captured.')

  if (!firmware) blockers.push('FM-1 firmware version is missing.')
  if (firmware && expectedFirmwareVersion && normalizedManifestFirmware !== expectedFirmwareVersion) {
    blockers.push(`FM-1 firmware ${firmware} does not match the required current-release baseline ${expectedFirmwareVersion}.`)
  }
  if (!/^[0-9a-f]{40}$/i.test(editorCommit)) blockers.push('Editor commit must be a full 40-character Git SHA.')
  if (!windowsVersion) blockers.push('Windows edition/build is missing.')
  if (!manifest.identity.driverVersion.trim()) blockers.push('FM-1 driver version is missing.')
  if (!manifest.identity.usbTopology.trim()) blockers.push('USB cable/direct-port/hub topology is missing.')
  if (!manifest.identity.audioInputLabel.trim()) blockers.push('Browser audio-input label is missing.')
  if (!Number.isInteger(manifest.identity.midiChannel) || (manifest.identity.midiChannel ?? 0) < 1 || (manifest.identity.midiChannel ?? 17) > 16) blockers.push('MIDI channel 1–16 is missing.')
  if (!['A', 'B', 'C', 'D'].includes(manifest.identity.destinationBank)) blockers.push('Destination bank A/B/C/D is missing.')
  if (!Number.isInteger(manifest.identity.targetSlot) || (manifest.identity.targetSlot ?? 0) < 1 || (manifest.identity.targetSlot ?? 33) > 32) blockers.push('Target slot 1–32 is missing.')

  if (!isPositiveNumber(manifest.audio.sampleRateHz)) blockers.push('Physical USB-audio sample rate is missing.')
  if (!isPositiveNumber(manifest.audio.savedWavBitDepth)) blockers.push('Saved WAV bit depth is missing.')
  if (!isPositiveNumber(manifest.audio.browserChannelCount)) blockers.push('Browser channel count is missing.')
  if (!manifest.audio.channelLayout.trim()) blockers.push('Observed USB-audio channel layout is missing.')
  if (manifest.audio.masterAffectsUsbLevel === 'unknown') blockers.push('MASTER/USB level relationship is still unknown.')
  if (manifest.audio.approximateLatencyMs === null || !Number.isFinite(manifest.audio.approximateLatencyMs) || manifest.audio.approximateLatencyMs < 0) blockers.push('Approximate physical USB-audio latency is missing.')

  blockers.push(...requiredCheckBlockers(manifest, family))

  return {
    manifest,
    evaluation: {
      index,
      browser: family,
      createdAt: manifest.createdAt,
      firmwareVersion: firmware || null,
      editorCommit: editorCommit || null,
      windowsVersion: windowsVersion || null,
      blockers,
    },
  }
}

function compatiblePair(left: HardwareEvidenceManifest, right: HardwareEvidenceManifest): boolean {
  return left.identity.firmwareVersion.trim().toUpperCase() === right.identity.firmwareVersion.trim().toUpperCase()
    && left.identity.editorCommit.trim().toLowerCase() === right.identity.editorCommit.trim().toLowerCase()
    && left.identity.windowsVersion.trim() === right.identity.windowsVersion.trim()
}

export function evaluateFm1DeliveryEvidence(
  values: readonly unknown[],
  options: EvaluateFm1DeliveryEvidenceOptions,
): Fm1DeliveryEvidenceGate {
  const expectedOrigin = normalizedOrigin(options.expectedOrigin)
  const expectedFirmwareVersion = normalizedFirmware(options.expectedFirmwareVersion)
  const evaluated = values.map((value, index) => evaluateManifest(value, index, expectedOrigin, expectedFirmwareVersion))
  const passing = evaluated.filter(({ manifest, evaluation }) => manifest !== null && evaluation.blockers.length === 0)
  const chrome = passing.filter(({ evaluation }) => evaluation.browser === 'chrome')
  const edge = passing.filter(({ evaluation }) => evaluation.browser === 'edge')

  let selected: Fm1DeliveryEvidenceGate['selected'] = null
  for (const chromeCandidate of chrome) {
    if (!chromeCandidate.manifest) continue
    for (const edgeCandidate of edge) {
      if (!edgeCandidate.manifest || !compatiblePair(chromeCandidate.manifest, edgeCandidate.manifest)) continue
      selected = {
        chromeIndex: chromeCandidate.evaluation.index,
        edgeIndex: edgeCandidate.evaluation.index,
        firmwareVersion: chromeCandidate.manifest.identity.firmwareVersion.trim(),
        editorCommit: chromeCandidate.manifest.identity.editorCommit.trim().toLowerCase(),
        windowsVersion: chromeCandidate.manifest.identity.windowsVersion.trim(),
      }
      break
    }
    if (selected) break
  }

  const blockers: string[] = []
  if (!expectedOrigin.startsWith('https://')) blockers.push('Expected deployment origin must be HTTPS.')
  if (chrome.length === 0) blockers.push('No complete Chrome FM-1 physical delivery session is present.')
  if (edge.length === 0) blockers.push('No complete Edge FM-1 physical delivery session is present.')
  if (chrome.length > 0 && edge.length > 0 && !selected) blockers.push('Chrome and Edge passing sessions do not share the same FM-1 firmware, editor commit and Windows build.')

  return {
    schema: FM1_DELIVERY_EVIDENCE_SCHEMA,
    evaluatedAt: (options.evaluatedAt ?? (() => new Date()))().toISOString(),
    expectedOrigin,
    expectedFirmwareVersion,
    ready: blockers.length === 0 && selected !== null,
    importedCount: values.length,
    chromePassingCount: chrome.length,
    edgePassingCount: edge.length,
    selected,
    blockers,
    manifests: evaluated.map(({ evaluation }) => evaluation),
    note: expectedFirmwareVersion
      ? `A ready gate means the required Chrome/Edge FM-1 physical delivery evidence is complete for the recorded origin/${expectedFirmwareVersion}/editor/Windows tuple. Sessions on other firmware remain importable compatibility evidence but cannot make this current-release gate READY. It does not validate device readback, live-parameter semantics, sequencer transfer, BLE MIDI availability or virtual-synth equivalence.`
      : 'A ready gate means the required Chrome/Edge FM-1 physical delivery evidence is complete for the recorded origin/firmware/editor/Windows tuple. It does not validate device readback, live-parameter semantics, sequencer transfer, BLE MIDI availability or virtual-synth equivalence.',
  }
}
