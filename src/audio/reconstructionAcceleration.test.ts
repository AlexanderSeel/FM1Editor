import { afterEach, describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { encodeSingleVoiceData } from '../sysex/dx7'
import { REFERENCE_AUDIO_PRIVACY, type PreparedReferenceAudio } from './referenceAudio'
import {
  createReconstructionUploadConsent,
  discoverReconstructionAccelerator,
  isReconstructionUploadConsentValid,
  RECONSTRUCTION_ACCELERATOR_CAPABILITIES_SCHEMA,
  RECONSTRUCTION_ACCELERATOR_RESULT_SCHEMA,
  resetConsumedReconstructionConsentsForTests,
  resolveReconstructionExecutionMode,
  submitReconstructionAcceleration,
  type DiscoveredReconstructionAccelerator,
} from './reconstructionAcceleration'

function reference(hash = 'b'.repeat(64)): PreparedReferenceAudio {
  const sampleRate = 48_000
  const samples = Float32Array.from({ length: 4_800 }, (_, index) => Math.sin(2 * Math.PI * 220 * index / sampleRate) * 0.5)
  return {
    sampleRate,
    decodedDurationSeconds: 0.1,
    selectedRegion: { startSeconds: 0, endSeconds: 0.1 },
    trimmedLeadingSeconds: 0,
    trimmedTrailingSeconds: 0,
    durationSeconds: 0.1,
    samples,
    peakBeforeNormalization: 0.5,
    normalizationGain: 1,
    detectedPitchHz: 220,
    analysisPitchHz: 220,
    pitchSource: 'detected',
    privacy: REFERENCE_AUDIO_PRIVACY,
    filename: 'isolated-note.wav',
    mimeType: 'audio/wav',
    sizeBytes: samples.byteLength,
    contentSha256: hash,
  }
}

const capabilities = {
  schema: RECONSTRUCTION_ACCELERATOR_CAPABILITIES_SCHEMA,
  serviceId: 'fm1-python-worker',
  serviceVersion: '0.1.0',
  model: {
    id: 'licensed-initializer',
    version: '2026-08-08',
    kind: 'learned-initialization',
    licenseSpdx: 'Apache-2.0',
  },
  retention: {
    mode: 'ephemeral',
    maxSeconds: 60,
    deletion: 'automatic',
    statement: 'Reference bytes are deleted automatically after the request and never used for training.',
  },
  accepts: {
    mimeTypes: ['audio/wav'],
    maxBytes: 2_000_000,
  },
}

function responseJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

async function discovered(): Promise<DiscoveredReconstructionAccelerator> {
  return discoverReconstructionAccelerator('https://accelerator.example/api', async () => responseJson(capabilities))
}

function candidateVoiceBase64(): string {
  return Buffer.from(encodeSingleVoiceData(createInitializedVoice())).toString('base64')
}

afterEach(() => resetConsumedReconstructionConsentsForTests())

describe('reconstruction acceleration boundary', () => {
  it('rejects insecure non-local endpoints before capability discovery', async () => {
    let calls = 0
    await expect(discoverReconstructionAccelerator('http://accelerator.example', async () => {
      calls += 1
      return responseJson(capabilities)
    })).rejects.toThrow(/must use HTTPS/)
    expect(calls).toBe(0)
  })

  it('requires automatic deletion and complete model metadata', async () => {
    const unsafe = {
      ...capabilities,
      retention: { ...capabilities.retention, deletion: 'manual' },
    }
    await expect(discoverReconstructionAccelerator('https://accelerator.example', async () => responseJson(unsafe))).rejects.toThrow(/automatic reference deletion/)
  })

  it('keeps local execution until consent matches the exact file and policy', async () => {
    const service = await discovered()
    const current = reference()
    expect(resolveReconstructionExecutionMode(current, service, null)).toBe('local')
    const consent = createReconstructionUploadConsent(current, service, new Date('2026-08-08T08:00:00.000Z'))
    expect(isReconstructionUploadConsentValid(current, service, consent, new Date('2026-08-08T08:01:00.000Z'))).toBe(true)
    expect(resolveReconstructionExecutionMode(current, service, consent, new Date('2026-08-08T08:01:00.000Z'))).toBe('remote')
    expect(resolveReconstructionExecutionMode(reference('c'.repeat(64)), service, consent, new Date('2026-08-08T08:01:00.000Z'))).toBe('local')
  })

  it('uploads only after fresh consent, validates returned DX7 data and consumes the consent once', async () => {
    const service = await discovered()
    const current = reference()
    const now = new Date('2026-08-08T08:00:00.000Z')
    const consent = createReconstructionUploadConsent(current, service, now)
    let calls = 0
    const fetchImpl: typeof fetch = async (_input, init) => {
      calls += 1
      expect(init?.method).toBe('POST')
      expect(init?.credentials).toBe('omit')
      expect(init?.body).toBeInstanceOf(FormData)
      const form = init?.body as FormData
      const metadata = JSON.parse(String(form.get('metadata'))) as Record<string, unknown>
      expect(metadata.referenceSha256).toBe(current.contentSha256)
      expect(metadata.consentId).toBe(consent.id)
      const upload = form.get('reference')
      expect(upload).toBeInstanceOf(Blob)
      expect((upload as Blob).type).toBe('audio/wav')
      return responseJson({
        schema: RECONSTRUCTION_ACCELERATOR_RESULT_SCHEMA,
        requestId: 'request-1',
        serviceId: capabilities.serviceId,
        serviceVersion: capabilities.serviceVersion,
        modelId: capabilities.model.id,
        modelVersion: capabilities.model.version,
        candidates: [{
          voiceDataBase64: candidateVoiceBase64(),
          distance: 0.123,
          sourceInitialization: 'Licensed learned initializer',
        }],
        retentionReceipt: {
          referenceDeleted: true,
          deletedAt: '2026-08-08T08:00:02.000Z',
          deleteBy: null,
        },
      })
    }

    const result = await submitReconstructionAcceleration(current, service, consent, { fetchImpl, now: () => now })
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0]?.distance).toBe(0.123)
    expect(result.candidates[0]?.voice.operators).toHaveLength(6)
    expect(result.retentionReceipt.referenceDeleted).toBe(true)
    expect(resolveReconstructionExecutionMode(current, service, consent, now)).toBe('local')
    await expect(submitReconstructionAcceleration(current, service, consent, { fetchImpl, now: () => now })).rejects.toThrow(/fresh explicit upload consent/)
    expect(calls).toBe(1)
  })

  it('does not call the upload endpoint when consent belongs to another reference', async () => {
    const service = await discovered()
    const consent = createReconstructionUploadConsent(reference('d'.repeat(64)), service, new Date('2026-08-08T08:00:00.000Z'))
    let calls = 0
    await expect(submitReconstructionAcceleration(reference('e'.repeat(64)), service, consent, {
      now: () => new Date('2026-08-08T08:01:00.000Z'),
      fetchImpl: async () => {
        calls += 1
        return responseJson({})
      },
    })).rejects.toThrow(/fresh explicit upload consent/)
    expect(calls).toBe(0)
  })
})
