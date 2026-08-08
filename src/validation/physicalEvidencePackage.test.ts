import { describe, expect, it } from 'vitest'
import { DX7_HARDWARE_EVIDENCE_SCHEMA } from './dx7HardwareEvidence'
import { FM1_DELIVERY_EVIDENCE_INTEGRITY_SCHEMA } from './fm1DeliveryEvidenceIntegrity'
import { FM1_DELIVERY_EVIDENCE_PACKAGE_INTEGRITY_SCHEMA } from './fm1DeliveryEvidencePackageIntegrity'
import { HARDWARE_EVIDENCE_SCHEMA } from './hardwareEvidence'
import {
  classifyPhysicalEvidenceArtifact,
  createPhysicalEvidencePackageManifest,
} from './physicalEvidencePackage'

const A = 'a'.repeat(64)
const B = 'b'.repeat(64)
const C = 'c'.repeat(64)
const D = 'd'.repeat(64)
const E = 'e'.repeat(64)

function artifact(name: string, sha256: string, jsonValue?: unknown, mimeType = '') {
  return { name, sizeBytes: 123, mimeType, sha256, ...(jsonValue === undefined ? {} : { jsonValue }) }
}

describe('physical evidence package', () => {
  it('classifies repository evidence schemas and raw artifact types without embedding payloads', () => {
    expect(classifyPhysicalEvidenceArtifact('fm1.json', 'application/json', { schema: HARDWARE_EVIDENCE_SCHEMA })).toEqual({
      kind: 'fm1-hardware-manifest',
      jsonSchema: HARDWARE_EVIDENCE_SCHEMA,
    })
    expect(classifyPhysicalEvidenceArtifact('dx7.json', 'application/json', { schema: DX7_HARDWARE_EVIDENCE_SCHEMA }).kind).toBe('dx7-hardware-manifest')
    expect(classifyPhysicalEvidenceArtifact('delivery-v2.json', 'application/json', { schema: FM1_DELIVERY_EVIDENCE_INTEGRITY_SCHEMA })).toEqual({
      kind: 'fm1-delivery-gate',
      jsonSchema: FM1_DELIVERY_EVIDENCE_INTEGRITY_SCHEMA,
    })
    expect(classifyPhysicalEvidenceArtifact('delivery-v3.json', 'application/json', { schema: FM1_DELIVERY_EVIDENCE_PACKAGE_INTEGRITY_SCHEMA })).toEqual({
      kind: 'fm1-delivery-gate',
      jsonSchema: FM1_DELIVERY_EVIDENCE_PACKAGE_INTEGRITY_SCHEMA,
    })
    expect(classifyPhysicalEvidenceArtifact('capture.json', 'application/json', { version: 1, exportedAt: '2026-08-08T00:00:00Z', entries: [] }).kind).toBe('midi-monitor')
    expect(classifyPhysicalEvidenceArtifact('bank.syx', 'application/octet-stream').kind).toBe('sysex')
    expect(classifyPhysicalEvidenceArtifact('recording.wav', 'audio/wav').kind).toBe('audio-wav')
    expect(classifyPhysicalEvidenceArtifact('screen.png', 'image/png').kind).toBe('screenshot')
  })

  it('builds a reproducible FM-1 package index and reports missing evidence categories', () => {
    const manifest = createPhysicalEvidencePackageManifest([
      artifact('fm1-session.json', A, { schema: HARDWARE_EVIDENCE_SCHEMA }, 'application/json'),
      artifact('capture.json', B, { version: 1, exportedAt: '2026-08-08T00:00:00Z', entries: [] }, 'application/json'),
      artifact('merged.syx', C),
      artifact('recording.wav', D, undefined, 'audio/wav'),
      artifact('timeline.txt', E, undefined, 'text/plain'),
    ], {
      target: 'fm1',
      createdAt: () => new Date('2026-08-08T10:00:00.000Z'),
    })

    expect(manifest.createdAt).toBe('2026-08-08T10:00:00.000Z')
    expect(manifest.artifactCount).toBe(5)
    expect(manifest.countsByKind['fm1-hardware-manifest']).toBe(1)
    expect(manifest.countsByKind['midi-monitor']).toBe(1)
    expect(manifest.countsByKind.sysex).toBe(1)
    expect(manifest.countsByKind['audio-wav']).toBe(1)
    expect(manifest.warnings).toEqual([])
    expect(manifest.artifacts[0]).not.toHaveProperty('jsonValue')
  })

  it('warns about duplicate content and target-specific missing evidence without claiming failure semantics', () => {
    const manifest = createPhysicalEvidencePackageManifest([
      artifact('one.syx', A),
      artifact('copy.syx', A),
    ], { target: 'dx7' })

    expect(manifest.duplicateHashes).toEqual([{ sha256: A, names: ['copy.syx', 'one.syx'] }])
    expect(manifest.warnings).toContain('No stock-DX7 hardware evidence manifest is present.')
    expect(manifest.warnings).toContain('No raw MIDI-monitor JSON export is present.')
    expect(manifest.warnings.at(-1)).toContain('multiple filenames')
  })

  it('rejects malformed hashes instead of creating an unverifiable package manifest', () => {
    expect(() => createPhysicalEvidencePackageManifest([
      artifact('bad.syx', 'not-a-sha'),
    ], { target: 'fm1' })).toThrow(/SHA-256/)
  })
})
