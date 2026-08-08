import { describe, expect, it } from 'vitest'
import {
  HARDWARE_EVIDENCE_SCHEMA,
  createEmptyHardwareChecks,
  type HardwareEvidenceManifest,
} from './hardwareEvidence'
import { evaluateFm1DeliveryEvidence } from './fm1DeliveryEvidence'

const COMMIT = '0123456789abcdef0123456789abcdef01234567'
const ORIGIN = 'https://alexanderseel.github.io'

function manifest(browser: 'chrome' | 'edge', overrides: Partial<HardwareEvidenceManifest> = {}): HardwareEvidenceManifest {
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

  const value: HardwareEvidenceManifest = {
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
      browserVersion: browser === 'chrome'
        ? 'Mozilla/5.0 Chrome/151.0.7922.72 Safari/537.36'
        : 'Mozilla/5.0 Chrome/151.0.0.0 Safari/537.36 Edg/151.0.4129.59',
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
      userAgent: browser === 'chrome'
        ? 'Mozilla/5.0 Chrome/151.0.7922.72 Safari/537.36'
        : 'Mozilla/5.0 Chrome/151.0.0.0 Safari/537.36 Edg/151.0.4129.59',
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
      firstTimestamp: 1,
      lastTimestamp: 10,
    },
    checks,
    sessionNotes: 'Physical delivery validation fixture.',
    disclaimer: 'Physical evidence manifest only; check statuses are tester observations and are not software-derived hardware passes.',
  }

  return { ...value, ...overrides }
}

describe('FM-1 delivery evidence gate', () => {
  it('accepts matching complete Chrome and Edge physical sessions', () => {
    const gate = evaluateFm1DeliveryEvidence([manifest('chrome'), manifest('edge')], {
      expectedOrigin: `${ORIGIN}/`,
      evaluatedAt: () => new Date('2026-08-08T10:00:00.000Z'),
    })

    expect(gate.ready).toBe(true)
    expect(gate.blockers).toEqual([])
    expect(gate.chromePassingCount).toBe(1)
    expect(gate.edgePassingCount).toBe(1)
    expect(gate.selected).toMatchObject({ firmwareVersion: '1.0.0', editorCommit: COMMIT })
  })

  it('rejects browser sessions that do not share the same tested editor commit', () => {
    const differentCommit = '89abcdef0123456789abcdef0123456789abcdef'
    const edge = manifest('edge', {
      identity: { ...manifest('edge').identity, editorCommit: differentCommit },
    })
    const gate = evaluateFm1DeliveryEvidence([manifest('chrome'), edge], { expectedOrigin: ORIGIN })

    expect(gate.ready).toBe(false)
    expect(gate.blockers).toContain('Chrome and Edge passing sessions do not share the same FM-1 firmware, editor commit and Windows build.')
  })

  it('does not accept emitted bank traffic when a required physical observation is still pending', () => {
    const chrome = manifest('chrome')
    const checks = { ...chrome.checks, 'browser-note-off-recovery': { status: 'pending' as const, notes: '' } }
    const gate = evaluateFm1DeliveryEvidence([{ ...chrome, checks }, manifest('edge')], { expectedOrigin: ORIGIN })

    expect(gate.ready).toBe(false)
    expect(gate.chromePassingCount).toBe(0)
    expect(gate.manifests[0]?.blockers).toContain('Required physical check browser-note-off-recovery is not PASS.')
  })

  it('requires the intended HTTPS deployment origin', () => {
    const gate = evaluateFm1DeliveryEvidence([manifest('chrome'), manifest('edge')], { expectedOrigin: 'http://localhost:4173' })
    expect(gate.ready).toBe(false)
    expect(gate.blockers).toContain('Expected deployment origin must be HTTPS.')
  })

  it('fails closed on a top-level schema match with malformed nested fields', () => {
    const malformed = {
      schema: HARDWARE_EVIDENCE_SCHEMA,
      target: 'fm1',
      createdAt: '2026-08-08T09:00:00.000Z',
      midiPermission: 'traffic-captured',
      sysexEnabled: true,
      selectedMidiInput: null,
      selectedMidiOutput: 'FM-1 MIDI OUT',
      identity: { firmwareVersion: '1.0.0' },
      browser: {},
      audio: {},
      midiCapture: { yamahaBankOutputCount: 1 },
      checks: {},
    }

    expect(() => evaluateFm1DeliveryEvidence([malformed], { expectedOrigin: ORIGIN })).not.toThrow()
    const gate = evaluateFm1DeliveryEvidence([malformed], { expectedOrigin: ORIGIN })
    expect(gate.ready).toBe(false)
    expect(gate.manifests[0]?.blockers[0]).toContain('is not an FM-1')
  })
})
