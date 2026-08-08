import { describe, expect, it } from 'vitest'
import { PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA } from './physicalEvidenceConsistency'
import {
  HARDWARE_EVIDENCE_SCHEMA,
  createEmptyHardwareChecks,
  type HardwareEvidenceManifest,
} from './hardwareEvidence'
import { evaluateFm1DeliveryEvidenceIntegrity, type Fm1DeliveryEvidenceFile } from './fm1DeliveryEvidenceIntegrity'

const COMMIT = '0123456789abcdef0123456789abcdef01234567'
const ORIGIN = 'https://alexanderseel.github.io'
const CHROME_MANIFEST_SHA = 'a'.repeat(64)
const EDGE_MANIFEST_SHA = 'b'.repeat(64)
const CHROME_MIDI_SHA = 'c'.repeat(64)
const EDGE_MIDI_SHA = 'd'.repeat(64)
const CHROME_CORRELATION_SHA = 'e'.repeat(64)
const EDGE_CORRELATION_SHA = 'f'.repeat(64)

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
      tester: 'AS',
      firmwareVersion: '1.0.0',
      editorCommit: COMMIT,
      windowsVersion: 'Windows 11 24H2 build 26100',
      browserVersion,
      driverVersion: 'USB MIDI class driver',
      usbTopology: 'direct motherboard USB port',
      audioInputLabel: 'Microphone (FM-1)',
      midiChannel: 1,
      destinationBank: 'A',
      targetSlot: 1,
    },
    audio: {
      sampleRateHz: 48_000,
      savedWavBitDepth: 16,
      browserChannelCount: 2,
      channelLayout: 'dual-mono',
      masterAffectsUsbLevel: 'yes',
      approximateLatencyMs: 18,
    },
    browser: {
      origin: ORIGIN,
      secureContext: true,
      userAgent: browserVersion,
      platform: 'Win32',
      language: 'en-US',
    },
    midiCapture: {
      messageCount: 12,
      inputCount: 2,
      outputCount: 10,
      sysexInputCount: 0,
      sysexOutputCount: 1,
      yamahaBankOutputCount: 1,
      yamahaSingleVoiceOutputCount: 0,
      sysexInputLengths: {},
      sysexOutputLengths: { '4104': 1 },
      inputPorts: ['FM-1 MIDI IN'],
      outputPorts: ['FM-1 MIDI OUT'],
      firstTimestamp: browser === 'chrome' ? 1 : 101,
      lastTimestamp: browser === 'chrome' ? 10 : 110,
    },
    checks,
    sessionNotes: 'Physical delivery validation fixture.',
    disclaimer: 'Physical evidence manifest only; check statuses are tester observations and are not software-derived hardware passes.',
  }
}

function correlation(manifestName: string, manifestSha256: string, midiName: string, midiSha256: string, structurallyConsistent = true) {
  return {
    schema: PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA,
    packageTarget: 'fm1',
    hardwareManifestCount: 1,
    midiMonitorCount: 1,
    links: [{
      manifestName,
      manifestSha256,
      target: 'fm1',
      matchedMidiMonitorName: midiName,
      matchedMidiMonitorSha256: midiSha256,
      summaryMismatchFields: [],
    }],
    errorCount: structurallyConsistent ? 0 : 1,
    warningCount: 0,
    structurallyConsistent,
    issues: structurallyConsistent ? [] : [{ severity: 'error', code: 'test', artifacts: [manifestName], message: 'fixture failure' }],
    note: 'fixture',
  }
}

function files(options: { edgeMidiSha?: string; chromeCorrelation?: unknown; edgeCorrelation?: unknown } = {}): Fm1DeliveryEvidenceFile[] {
  return [
    { filename: 'chrome-manifest.json', sha256: CHROME_MANIFEST_SHA, value: manifest('chrome') },
    { filename: 'edge-manifest.json', sha256: EDGE_MANIFEST_SHA, value: manifest('edge') },
    {
      filename: 'chrome-correlation.json',
      sha256: CHROME_CORRELATION_SHA,
      value: options.chromeCorrelation ?? correlation('chrome-manifest.json', CHROME_MANIFEST_SHA, 'chrome-midi.json', CHROME_MIDI_SHA),
    },
    {
      filename: 'edge-correlation.json',
      sha256: EDGE_CORRELATION_SHA,
      value: options.edgeCorrelation ?? correlation('edge-manifest.json', EDGE_MANIFEST_SHA, 'edge-midi.json', options.edgeMidiSha ?? EDGE_MIDI_SHA),
    },
  ]
}

describe('FM-1 hash-bound delivery evidence integrity', () => {
  it('requires complete Chrome/Edge manifests and unique hash-bound raw MIDI correlations', () => {
    const gate = evaluateFm1DeliveryEvidenceIntegrity(files(), {
      expectedOrigin: ORIGIN,
      evaluatedAt: () => new Date('2026-08-08T10:00:00.000Z'),
    })

    expect(gate.ready).toBe(true)
    expect(gate.schema).toBe('fm1-editor.fm1-delivery-evidence-gate.v2')
    expect(gate.blockers).toEqual([])
    expect(gate.selected?.chrome).toMatchObject({
      manifestSha256: CHROME_MANIFEST_SHA,
      rawMidiSha256: CHROME_MIDI_SHA,
      correlationSha256: CHROME_CORRELATION_SHA,
    })
    expect(gate.selected?.edge.rawMidiSha256).toBe(EDGE_MIDI_SHA)
  })

  it('keeps final readiness blocked when a selected manifest has no hash-bound correlation receipt', () => {
    const gate = evaluateFm1DeliveryEvidenceIntegrity(files().slice(0, 3), { expectedOrigin: ORIGIN })

    expect(gate.baseGate.ready).toBe(true)
    expect(gate.ready).toBe(false)
    expect(gate.blockers.some((blocker) => blocker.includes('edge-manifest.json') && blocker.includes('not backed'))).toBe(true)
  })

  it('rejects a correlation receipt that names the wrong manifest hash', () => {
    const wrong = correlation('edge-manifest.json', '9'.repeat(64), 'edge-midi.json', EDGE_MIDI_SHA)
    const gate = evaluateFm1DeliveryEvidenceIntegrity(files({ edgeCorrelation: wrong }), { expectedOrigin: ORIGIN })

    expect(gate.ready).toBe(false)
    expect(gate.blockers.some((blocker) => blocker.includes('edge-manifest.json') && blocker.includes('not backed'))).toBe(true)
  })

  it('rejects reuse of one raw MIDI capture for both browser sessions', () => {
    const gate = evaluateFm1DeliveryEvidenceIntegrity(files({ edgeMidiSha: CHROME_MIDI_SHA }), { expectedOrigin: ORIGIN })

    expect(gate.ready).toBe(false)
    expect(gate.blockers).toContain('Chrome and Edge delivery sessions must be backed by distinct raw MIDI captures.')
  })

  it('does not trust a correlation receipt that reports structural errors', () => {
    const failedCorrelation = correlation('chrome-manifest.json', CHROME_MANIFEST_SHA, 'chrome-midi.json', CHROME_MIDI_SHA, false)
    const gate = evaluateFm1DeliveryEvidenceIntegrity(files({ chromeCorrelation: failedCorrelation }), { expectedOrigin: ORIGIN })

    expect(gate.ready).toBe(false)
    expect(gate.blockers.some((blocker) => blocker.includes('chrome-manifest.json') && blocker.includes('not backed'))).toBe(true)
  })

  it('fails closed on malformed correlation-shaped JSON without throwing', () => {
    const malformed = { schema: PHYSICAL_EVIDENCE_CONSISTENCY_SCHEMA, structurallyConsistent: true, links: [{ target: 'fm1' }] }
    expect(() => evaluateFm1DeliveryEvidenceIntegrity(files({ chromeCorrelation: malformed }), { expectedOrigin: ORIGIN })).not.toThrow()
    expect(evaluateFm1DeliveryEvidenceIntegrity(files({ chromeCorrelation: malformed }), { expectedOrigin: ORIGIN }).ready).toBe(false)
  })
})
