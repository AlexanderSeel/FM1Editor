import { describe, expect, it } from 'vitest'
import type { MidiMonitorEntry } from '../midi/monitor'
import { DX7_HARDWARE_EVIDENCE_SCHEMA } from './dx7HardwareEvidence'
import {
  HARDWARE_EVIDENCE_SCHEMA,
  summarizeHardwareMidiCapture,
  type HardwareEvidenceManifest,
} from './hardwareEvidence'
import { validatePhysicalEvidenceConsistency } from './physicalEvidenceConsistency'

const A = 'a'.repeat(64)
const B = 'b'.repeat(64)
const C = 'c'.repeat(64)

function entry(
  id: string,
  timestamp: number,
  direction: 'in' | 'out',
  portName: string,
  data: readonly number[],
): MidiMonitorEntry {
  return { id, timestamp, direction, portId: `${portName}-id`, portName, data, summary: `test ${data.length}` }
}

function monitor(entries: readonly MidiMonitorEntry[]) {
  return { version: 1 as const, exportedAt: '2026-08-08T12:00:00.000Z', entries }
}

function artifact(name: string, sha256: string, jsonValue: unknown) {
  return { name, sizeBytes: 123, mimeType: 'application/json', sha256, jsonValue }
}

function fm1Manifest(entries: readonly MidiMonitorEntry[]): HardwareEvidenceManifest {
  const midiCapture = summarizeHardwareMidiCapture(entries)
  return {
    schema: HARDWARE_EVIDENCE_SCHEMA,
    createdAt: '2026-08-08T12:00:00.000Z',
    target: 'fm1',
    midiPermission: 'traffic-captured; permission state not independently recorded',
    sysexEnabled: midiCapture.sysexInputCount + midiCapture.sysexOutputCount > 0,
    selectedMidiInput: midiCapture.inputPorts.join(' | ') || null,
    selectedMidiOutput: midiCapture.outputPorts.join(' | ') || null,
    identity: {
      tester: 'AS',
      firmwareVersion: '1.2.3',
      editorCommit: '1234567890abcdef1234567890abcdef12345678',
      windowsVersion: 'Windows 11 24H2',
      browserVersion: 'Chrome 151',
      driverVersion: 'class compliant',
      usbTopology: 'direct',
      audioInputLabel: 'Microphone (FM-1)',
      midiChannel: 1,
      destinationBank: 'A',
      targetSlot: 1,
    },
    audio: {
      sampleRateHz: 48_000,
      savedWavBitDepth: 16,
      browserChannelCount: 2,
      channelLayout: 'stereo',
      masterAffectsUsbLevel: 'unknown',
      approximateLatencyMs: null,
    },
    browser: {
      origin: 'https://example.test',
      secureContext: true,
      userAgent: 'Chrome 151',
      platform: 'Win32',
      language: 'en-US',
    },
    midiCapture,
    checks: {},
    sessionNotes: '',
    disclaimer: 'Physical evidence manifest only; check statuses are tester observations and are not software-derived hardware passes.',
  }
}

describe('physical evidence consistency', () => {
  it('uniquely links an FM-1 manifest to the raw MIDI export that produced its summary', () => {
    const entries = [
      entry('1', 1000, 'out', 'FM-1 MIDI', [0x90, 60, 100]),
      entry('2', 1001, 'in', 'FM-1 MIDI', [0xf0, 0x43, 0x00, 0xf7]),
    ]
    const report = validatePhysicalEvidenceConsistency([
      artifact('fm1.json', A, fm1Manifest(entries)),
      artifact('capture.json', B, monitor(entries)),
    ], 'fm1')

    expect(report.structurallyConsistent).toBe(true)
    expect(report.errorCount).toBe(0)
    expect(report.warningCount).toBe(0)
    expect(report.links).toEqual([{ manifestName: 'fm1.json', target: 'fm1', matchedMidiMonitorName: 'capture.json', summaryMismatchFields: [] }])
  })

  it('rejects a manifest paired with a different raw capture and identifies mismatch fields', () => {
    const captured = [entry('1', 1000, 'out', 'FM-1 MIDI', [0x90, 60, 100])]
    const different = [
      entry('1', 1000, 'out', 'FM-1 MIDI', [0x90, 60, 100]),
      entry('2', 1005, 'out', 'FM-1 MIDI', [0x80, 60, 0]),
    ]
    const report = validatePhysicalEvidenceConsistency([
      artifact('fm1.json', A, fm1Manifest(captured)),
      artifact('other-capture.json', B, monitor(different)),
    ], 'fm1')

    expect(report.structurallyConsistent).toBe(false)
    const mismatch = report.issues.find((issue) => issue.code === 'midi-summary-mismatch')
    expect(mismatch?.severity).toBe('error')
    expect(report.links[0]?.summaryMismatchFields).toContain('messageCount')
    expect(report.links[0]?.summaryMismatchFields).toContain('lastTimestamp')
  })

  it('treats multiple raw captures with the same summary as ambiguous evidence linkage', () => {
    const entries = [entry('1', 1000, 'out', 'FM-1 MIDI', [0x90, 60, 100])]
    const report = validatePhysicalEvidenceConsistency([
      artifact('fm1.json', A, fm1Manifest(entries)),
      artifact('capture-a.json', B, monitor(entries)),
      artifact('capture-b.json', C, monitor(entries)),
    ], 'fm1')

    expect(report.structurallyConsistent).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'midi-link-ambiguous')).toBe(true)
  })

  it('checks DX7 selected ports and recovery-bank identity without interpreting physical PASS states', () => {
    const entries = [entry('1', 1000, 'out', 'DX7 Interface', [0x90, 60, 100])]
    const midiCapture = summarizeHardwareMidiCapture(entries)
    const dx7 = {
      schema: DX7_HARDWARE_EVIDENCE_SCHEMA,
      createdAt: '2026-08-08T12:00:00.000Z',
      identity: {
        tester: 'AS',
        modelRevision: 'Yamaha DX7',
        hardwareIdentity: 'unit-a',
        romVersion: '1.8',
        editorCommit: '1234567',
        windowsVersion: 'Windows 11',
        browserVersion: 'Edge 151',
        midiInterface: 'USB MIDI',
        driverVersion: 'class compliant',
        receiveChannel: 1,
        systemInfoState: 'enabled',
        memoryProtectState: 'enabled',
        recoveryBankSha256: 'f'.repeat(64),
      },
      selectedMidiInputs: [],
      selectedMidiOutputs: ['WRONG PORT'],
      midiCapture,
      checks: { 'bank-reception': { status: 'fail', notes: '' } },
      sessionNotes: '',
      disclaimer: 'Stock DX7 physical evidence manifest only; result states are tester observations and are not software-derived hardware passes.',
    }
    const report = validatePhysicalEvidenceConsistency([
      artifact('dx7.json', A, dx7),
      artifact('capture.json', B, monitor(entries)),
    ], 'dx7')

    expect(report.issues.some((issue) => issue.code === 'dx7-selected-output-mismatch')).toBe(true)
    expect(report.issues.some((issue) => issue.message.includes('PASS'))).toBe(false)
  })

  it('requires target-specific manifests and a structurally valid raw MIDI export', () => {
    const report = validatePhysicalEvidenceConsistency([], 'mixed')
    expect(report.structurallyConsistent).toBe(false)
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'fm1-manifest-missing',
      'dx7-manifest-missing',
      'midi-monitor-missing',
    ]))
  })
})
