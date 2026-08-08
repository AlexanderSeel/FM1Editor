import { describe, expect, it } from 'vitest'
import { PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA } from './physicalEvidenceConsistency'
import { PHYSICAL_EVIDENCE_PACKAGE_SCHEMA } from './physicalEvidencePackage'
import {
  HARDWARE_EVIDENCE_SCHEMA,
  createEmptyHardwareChecks,
  type HardwareEvidenceManifest,
} from './hardwareEvidence'
import type { Fm1DeliveryEvidenceFile } from './fm1DeliveryEvidenceIntegrity'
import { evaluateFm1DeliveryEvidencePackageIntegrity } from './fm1DeliveryEvidencePackageIntegrity'

const COMMIT = '0123456789abcdef0123456789abcdef01234567'
const ORIGIN = 'https://alexanderseel.github.io'
const CHROME_MANIFEST_SHA = 'a'.repeat(64)
const EDGE_MANIFEST_SHA = 'b'.repeat(64)
const CHROME_MIDI_SHA = 'c'.repeat(64)
const EDGE_MIDI_SHA = 'd'.repeat(64)
const CHROME_CORRELATION_SHA = 'e'.repeat(64)
const EDGE_CORRELATION_SHA = 'f'.repeat(64)
const CHROME_PACKAGE_SHA = '1'.repeat(64)
const EDGE_PACKAGE_SHA = '2'.repeat(64)
const CHROME_WAV_SHA = '3'.repeat(64)
const EDGE_WAV_SHA = '4'.repeat(64)
const BANK_SHA = '5'.repeat(64)
const CHROME_NOTES_SHA = '6'.repeat(64)
const EDGE_NOTES_SHA = '7'.repeat(64)

function manifest(browser: 'chrome' | 'edge'): HardwareEvidenceManifest {
  const checks = createEmptyHardwareChecks()
  for (const id of [
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
    browser === 'chrome' ? 'browser-chrome-resilience' : 'browser-edge-resilience',
  ]) checks[id] = { status: 'pass', notes: 'Observed on physical FM-1.' }

  const browserVersion = browser === 'chrome'
    ? 'Mozilla/5.0 Chrome/151.0.7922.72 Safari/537.36'
    : 'Mozilla/5.0 Chrome/151.0.0.0 Safari/537.36 Edg/151.0.4129.59'

  return {
    schema: HARDWARE_EVIDENCE_SCHEMA,
    createdAt: browser === 'chrome' ? '2026-08-08T09:00:00.000Z' : '2026-08-08T09:30:00.000Z',
    target: 'fm1',
    midiPermission: 'traffic-captured; permission state not independently recorded',
    sysexEnabled: true,
    selectedMidiInput: 'FM-1 MIDI IN',
    selectedMidiOutput: 'FM-1 MIDI OUT',
    identity: {
      tester: 'AS', firmwareVersion: '1.0.0', editorCommit: COMMIT,
      windowsVersion: 'Windows 11 24H2 build 26100', browserVersion,
      driverVersion: 'USB MIDI class driver', usbTopology: 'direct motherboard USB port',
      audioInputLabel: 'Microphone (FM-1)', midiChannel: 1, destinationBank: 'A', targetSlot: 1,
    },
    audio: {
      sampleRateHz: 48_000, savedWavBitDepth: 16, browserChannelCount: 2,
      channelLayout: 'dual-mono', masterAffectsUsbLevel: 'yes', approximateLatencyMs: 18,
    },
    browser: { origin: ORIGIN, secureContext: true, userAgent: browserVersion, platform: 'Win32', language: 'en-US' },
    midiCapture: {
      messageCount: 12, inputCount: 2, outputCount: 10, sysexInputCount: 0, sysexOutputCount: 1,
      yamahaBankOutputCount: 1, yamahaSingleVoiceOutputCount: 0,
      sysexInputLengths: {}, sysexOutputLengths: { '4104': 1 },
      inputPorts: ['FM-1 MIDI IN'], outputPorts: ['FM-1 MIDI OUT'],
      firstTimestamp: browser === 'chrome' ? 1 : 101, lastTimestamp: browser === 'chrome' ? 10 : 110,
    },
    checks,
    sessionNotes: 'Physical delivery validation fixture.',
    disclaimer: 'Physical evidence manifest only; check statuses are tester observations and are not software-derived hardware passes.',
  }
}

function correlation(manifestName: string, manifestSha256: string, midiName: string, midiSha256: string) {
  return {
    schema: PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA,
    packageTarget: 'fm1', hardwareManifestCount: 1, midiMonitorCount: 1,
    links: [{ manifestName, manifestSha256, target: 'fm1', matchedMidiMonitorName: midiName, matchedMidiMonitorSha256: midiSha256, summaryMismatchFields: [] }],
    errorCount: 0, warningCount: 0, structurallyConsistent: true, issues: [], note: 'fixture',
  }
}

function packageIndex(manifestName: string, manifestSha: string, midiName: string, midiSha: string, wavSha: string, notesSha: string, options: { omitWav?: boolean } = {}) {
  const artifacts = [
    { name: manifestName, sizeBytes: 100, mimeType: 'application/json', sha256: manifestSha, kind: 'fm1-hardware-manifest', jsonSchema: HARDWARE_EVIDENCE_SCHEMA },
    { name: midiName, sizeBytes: 100, mimeType: 'application/json', sha256: midiSha, kind: 'midi-monitor', jsonSchema: null },
    { name: 'merged-bank.syx', sizeBytes: 4104, mimeType: 'application/octet-stream', sha256: BANK_SHA, kind: 'sysex', jsonSchema: null },
    { name: 'timeline.txt', sizeBytes: 80, mimeType: 'text/plain', sha256: notesSha, kind: 'notes', jsonSchema: null },
  ]
  if (!options.omitWav) artifacts.push({ name: 'usb-audio.wav', sizeBytes: 2048, mimeType: 'audio/wav', sha256: wavSha, kind: 'audio-wav', jsonSchema: null })
  return {
    schema: PHYSICAL_EVIDENCE_PACKAGE_SCHEMA,
    createdAt: '2026-08-08T10:00:00.000Z', target: 'fm1', artifactCount: artifacts.length, totalBytes: 0,
    artifacts, countsByKind: {}, duplicateHashes: [], warnings: [], note: 'fixture',
  }
}

function files(options: { chromeWavSha?: string; edgeWavSha?: string; omitChromeWav?: boolean; edgePackageMidiSha?: string } = {}): Fm1DeliveryEvidenceFile[] {
  return [
    { filename: 'chrome-manifest.json', sha256: CHROME_MANIFEST_SHA, value: manifest('chrome') },
    { filename: 'edge-manifest.json', sha256: EDGE_MANIFEST_SHA, value: manifest('edge') },
    { filename: 'chrome-correlation.json', sha256: CHROME_CORRELATION_SHA, value: correlation('chrome-manifest.json', CHROME_MANIFEST_SHA, 'chrome-midi.json', CHROME_MIDI_SHA) },
    { filename: 'edge-correlation.json', sha256: EDGE_CORRELATION_SHA, value: correlation('edge-manifest.json', EDGE_MANIFEST_SHA, 'edge-midi.json', EDGE_MIDI_SHA) },
    { filename: 'chrome-package.json', sha256: CHROME_PACKAGE_SHA, value: packageIndex('chrome-manifest.json', CHROME_MANIFEST_SHA, 'chrome-midi.json', CHROME_MIDI_SHA, options.chromeWavSha ?? CHROME_WAV_SHA, CHROME_NOTES_SHA, { omitWav: options.omitChromeWav }) },
    { filename: 'edge-package.json', sha256: EDGE_PACKAGE_SHA, value: packageIndex('edge-manifest.json', EDGE_MANIFEST_SHA, 'edge-midi.json', options.edgePackageMidiSha ?? EDGE_MIDI_SHA, options.edgeWavSha ?? EDGE_WAV_SHA, EDGE_NOTES_SHA) },
  ]
}

describe('FM-1 packaged delivery evidence integrity', () => {
  it('requires v2 readiness plus unique session packages containing manifest, raw MIDI, WAV, SysEx and observations', () => {
    const gate = evaluateFm1DeliveryEvidencePackageIntegrity(files(), {
      expectedOrigin: ORIGIN,
      evaluatedAt: () => new Date('2026-08-08T10:00:00.000Z'),
    })
    expect(gate.ready).toBe(true)
    expect(gate.schema).toBe('fm1-editor.fm1-delivery-evidence-gate.v3')
    expect(gate.blockers).toEqual([])
    expect(gate.selected?.chrome).toMatchObject({ packageSha256: CHROME_PACKAGE_SHA, rawMidiSha256: CHROME_MIDI_SHA })
    expect(gate.selected?.chrome.audioWavArtifacts[0]?.sha256).toBe(CHROME_WAV_SHA)
    expect(gate.selected?.edge.sysexArtifacts[0]?.sha256).toBe(BANK_SHA)
  })

  it('keeps readiness blocked when the matching session package has no WAV artifact', () => {
    const gate = evaluateFm1DeliveryEvidencePackageIntegrity(files({ omitChromeWav: true }), { expectedOrigin: ORIGIN })
    expect(gate.integrityGate.ready).toBe(true)
    expect(gate.ready).toBe(false)
    expect(gate.blockers.some((blocker) => blocker.includes('chrome-package.json') && blocker.includes('no WAV'))).toBe(true)
  })

  it('does not accept a package that contains the selected manifest but a different raw MIDI capture', () => {
    const gate = evaluateFm1DeliveryEvidencePackageIntegrity(files({ edgePackageMidiSha: '8'.repeat(64) }), { expectedOrigin: ORIGIN })
    expect(gate.integrityGate.ready).toBe(true)
    expect(gate.ready).toBe(false)
    expect(gate.blockers.some((blocker) => blocker.includes('edge-manifest.json') && blocker.includes('not backed'))).toBe(true)
  })

  it('requires distinct physical WAV recordings for the two browser sessions', () => {
    const gate = evaluateFm1DeliveryEvidencePackageIntegrity(files({ edgeWavSha: CHROME_WAV_SHA }), { expectedOrigin: ORIGIN })
    expect(gate.ready).toBe(false)
    expect(gate.blockers).toContain('Chrome and Edge delivery sessions must retain distinct physical WAV recordings rather than reusing the same audio artifact.')
  })
})
