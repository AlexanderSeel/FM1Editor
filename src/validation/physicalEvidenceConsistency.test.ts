import { describe, expect, it } from 'vitest'
import type { MidiMonitorEntry } from '../midi/monitor'
import { DX7_HARDWARE_EVIDENCE_SCHEMA } from './dx7HardwareEvidence'
import {
  HARDWARE_EVIDENCE_SCHEMA,
  summarizeHardwareMidiCapture,
  type HardwareEvidenceManifest,
} from './hardwareEvidence'
import {
  serializePhysicalEvidenceConsistencyReport,
  validatePhysicalEvidenceConsistency,
} from './physicalEvidenceConsistency'

const A = 'a'.repeat(64)
const B = 'b'.repeat(64)
const C = 'c'.repeat(64)
const D = 'd'.repeat(64)
const RECOVERY_SHA = 'f'.repeat(64)

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

function sysexArtifact(name: string, sha256: string, bytes: readonly number[] = []) {
  return { name, sizeBytes: bytes.length, mimeType: 'application/octet-stream', sha256, sysexBytes: bytes }
}

function yamahaBank(fill = 0): readonly number[] {
  const bytes = new Array<number>(4104).fill(fill & 0x7f)
  bytes[0] = 0xf0
  bytes[1] = 0x43
  bytes[2] = 0x00
  bytes[3] = 0x09
  bytes[4] = 0x20
  bytes[5] = 0x00
  bytes[4102] = 0x00
  bytes[4103] = 0xf7
  return bytes
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

function dx7Manifest(entries: readonly MidiMonitorEntry[], overrides: { selectedOutputs?: readonly string[]; recoveryBankSha256?: string } = {}) {
  const midiCapture = summarizeHardwareMidiCapture(entries)
  return {
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
      systemInfoState: 'enabled' as const,
      memoryProtectState: 'enabled' as const,
      recoveryBankSha256: overrides.recoveryBankSha256 ?? RECOVERY_SHA,
    },
    selectedMidiInputs: midiCapture.inputPorts,
    selectedMidiOutputs: overrides.selectedOutputs ?? midiCapture.outputPorts,
    midiCapture,
    checks: { 'bank-reception': { status: 'fail' as const, notes: '' } },
    sessionNotes: '',
    disclaimer: 'Stock DX7 physical evidence manifest only; result states are tester observations and are not software-derived hardware passes.' as const,
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
    expect(report.links).toEqual([{
      manifestName: 'fm1.json',
      manifestSha256: A,
      target: 'fm1',
      matchedMidiMonitorName: 'capture.json',
      matchedMidiMonitorSha256: B,
      summaryMismatchFields: [],
    }])
  })

  it('binds an outgoing FM-1 Yamaha bank capture to one byte-identical sysex artifact', () => {
    const bank = yamahaBank(7)
    const entries = [
      entry('bank-1', 1000, 'out', 'FM-1 MIDI', bank),
      entry('bank-2', 1001, 'out', 'FM-1 MIDI', bank),
    ]
    const report = validatePhysicalEvidenceConsistency([
      artifact('fm1.json', A, fm1Manifest(entries)),
      artifact('capture.json', B, monitor(entries)),
      sysexArtifact('merged-bank.syx', C, bank),
    ], 'fm1')

    expect(report.structurallyConsistent).toBe(true)
    expect(report.links[0]).toMatchObject({
      matchedMidiMonitorName: 'capture.json',
      matchedMidiMonitorSha256: B,
      matchedBankSysexName: 'merged-bank.syx',
      matchedBankSysexSha256: C,
    })
  })

  it('blocks bank evidence when the retained sysex artifact is not the captured payload', () => {
    const capturedBank = yamahaBank(3)
    const otherBank = yamahaBank(4)
    const entries = [entry('bank', 1000, 'out', 'FM-1 MIDI', capturedBank)]
    const report = validatePhysicalEvidenceConsistency([
      artifact('fm1.json', A, fm1Manifest(entries)),
      artifact('capture.json', B, monitor(entries)),
      sysexArtifact('wrong-bank.syx', C, otherBank),
    ], 'fm1')

    expect(report.structurallyConsistent).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'fm1-bank-sysex-artifact-missing')).toBe(true)
    expect(report.links[0]).toMatchObject({ matchedBankSysexName: null, matchedBankSysexSha256: null })
  })

  it('blocks bank evidence when one capture contains distinct Yamaha bank payloads', () => {
    const firstBank = yamahaBank(1)
    const secondBank = yamahaBank(2)
    const entries = [
      entry('bank-1', 1000, 'out', 'FM-1 MIDI', firstBank),
      entry('bank-2', 1001, 'out', 'FM-1 MIDI', secondBank),
    ]
    const report = validatePhysicalEvidenceConsistency([
      artifact('fm1.json', A, fm1Manifest(entries)),
      artifact('capture.json', B, monitor(entries)),
      sysexArtifact('first.syx', C, firstBank),
      sysexArtifact('second.syx', D, secondBank),
    ], 'fm1')

    expect(report.structurallyConsistent).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'fm1-bank-payload-ambiguous')).toBe(true)
  })

  it('serializes a compact hash-bound receipt without embedding raw MIDI or sysex bytes', () => {
    const bank = yamahaBank(5)
    const entries = [entry('raw-secret-id', 1000, 'out', 'FM-1 MIDI', bank)]
    const report = validatePhysicalEvidenceConsistency([
      artifact('fm1.json', A, fm1Manifest(entries)),
      artifact('capture.json', B, monitor(entries)),
      sysexArtifact('merged-bank.syx', C, bank),
    ], 'fm1')
    const serialized = serializePhysicalEvidenceConsistencyReport(report)

    expect(serialized).toContain(`"manifestSha256": "${A}"`)
    expect(serialized).toContain(`"matchedMidiMonitorSha256": "${B}"`)
    expect(serialized).toContain(`"matchedBankSysexSha256": "${C}"`)
    expect(serialized).not.toContain('raw-secret-id')
    expect(serialized).not.toContain(bank.slice(0, 12).join(','))
    expect(serialized.endsWith('\n')).toBe(true)
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
    expect(report.links[0]?.manifestSha256).toBe(A)
    expect(report.links[0]?.matchedMidiMonitorSha256).toBeNull()
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

  it('binds a stock-DX7 recoveryBankSha256 to exactly one retained sysex artifact', () => {
    const entries = [entry('1', 1000, 'out', 'DX7 Interface', [0x90, 60, 100])]
    const report = validatePhysicalEvidenceConsistency([
      artifact('dx7.json', A, dx7Manifest(entries)),
      artifact('capture.json', B, monitor(entries)),
      sysexArtifact('recovery-bank.syx', RECOVERY_SHA),
    ], 'dx7')

    expect(report.structurallyConsistent).toBe(true)
    expect(report.links[0]).toMatchObject({
      matchedRecoveryBankSysexName: 'recovery-bank.syx',
      matchedRecoveryBankSysexSha256: RECOVERY_SHA,
    })
  })

  it('blocks stock-DX7 evidence when the declared recovery bank artifact is missing', () => {
    const entries = [entry('1', 1000, 'out', 'DX7 Interface', [0x90, 60, 100])]
    const report = validatePhysicalEvidenceConsistency([
      artifact('dx7.json', A, dx7Manifest(entries)),
      artifact('capture.json', B, monitor(entries)),
    ], 'dx7')

    expect(report.structurallyConsistent).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'dx7-recovery-bank-artifact-missing')).toBe(true)
    expect(report.links[0]).toMatchObject({ matchedRecoveryBankSysexName: null, matchedRecoveryBankSysexSha256: null })
  })

  it('blocks stock-DX7 evidence when the recovery hash resolves to duplicate sysex artifacts', () => {
    const entries = [entry('1', 1000, 'out', 'DX7 Interface', [0x90, 60, 100])]
    const report = validatePhysicalEvidenceConsistency([
      artifact('dx7.json', A, dx7Manifest(entries)),
      artifact('capture.json', B, monitor(entries)),
      sysexArtifact('recovery-a.syx', RECOVERY_SHA),
      sysexArtifact('recovery-b.syx', RECOVERY_SHA),
    ], 'dx7')

    expect(report.structurallyConsistent).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'dx7-recovery-bank-artifact-ambiguous')).toBe(true)
  })

  it('records DX7 recovery artifact identity without embedding sysex bytes or interpreting physical PASS states', () => {
    const entries = [entry('raw-dx7-id', 1000, 'out', 'DX7 Interface', [0x90, 60, 100])]
    const report = validatePhysicalEvidenceConsistency([
      artifact('dx7.json', A, dx7Manifest(entries)),
      artifact('capture.json', B, monitor(entries)),
      sysexArtifact('recovery-bank.syx', RECOVERY_SHA, [0xf0, 0x43, 0xf7]),
    ], 'dx7')
    const serialized = serializePhysicalEvidenceConsistencyReport(report)

    expect(report.structurallyConsistent).toBe(true)
    expect(serialized).toContain(`"matchedRecoveryBankSysexSha256": "${RECOVERY_SHA}"`)
    expect(serialized).not.toContain('raw-dx7-id')
    expect(serialized).not.toContain('240,67,247')
    expect(report.issues.some((issue) => issue.message.includes('PASS'))).toBe(false)
  })

  it('still detects DX7 selected-port mismatches independently of recovery artifact identity', () => {
    const entries = [entry('1', 1000, 'out', 'DX7 Interface', [0x90, 60, 100])]
    const report = validatePhysicalEvidenceConsistency([
      artifact('dx7.json', A, dx7Manifest(entries, { selectedOutputs: ['WRONG PORT'] })),
      artifact('capture.json', B, monitor(entries)),
      sysexArtifact('recovery-bank.syx', RECOVERY_SHA),
    ], 'dx7')

    expect(report.issues.some((issue) => issue.code === 'dx7-selected-output-mismatch')).toBe(true)
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
