import type { AudioDescriptorConfig } from './audioDescriptors'
import {
  AUDIO_DESCRIPTOR_FINGERPRINT_SCHEMA,
  type AudioDescriptorFingerprint,
  type AudioSpectralFingerprint,
} from './audioDescriptorFingerprint'

export const PRESET_FINGERPRINT_CACHE_SCHEMA = 'fm1-editor.preset-fingerprint-cache.v1' as const
const DATABASE_NAME = 'fm1-editor-preset-fingerprints'
const STORE_NAME = 'fingerprints'

export interface PresetFingerprintCache {
  get(key: string): Promise<AudioDescriptorFingerprint | null>
  put(key: string, fingerprint: AudioDescriptorFingerprint): Promise<void>
  clear(): Promise<void>
}

export interface PresetFingerprintCacheIdentity {
  readonly engineId: string
  readonly engineVersion: string
  readonly renderKey: string
  readonly descriptorConfig: AudioDescriptorConfig
}

function configIdentity(config: AudioDescriptorConfig): string {
  return JSON.stringify({
    envelopeWindowMs: config.envelopeWindowMs,
    envelopeHopMs: config.envelopeHopMs,
    fftSizes: [...config.fftSizes],
    spectralHopRatio: config.spectralHopRatio,
    melBands: config.melBands,
    mfccCount: config.mfccCount,
    rolloffFraction: config.rolloffFraction,
    maxSpectralFrames: config.maxSpectralFrames,
    minimumHz: config.minimumHz,
    maximumHz: config.maximumHz,
  })
}

export function createPresetFingerprintCacheKey(identity: PresetFingerprintCacheIdentity): string {
  return [
    PRESET_FINGERPRINT_CACHE_SCHEMA,
    AUDIO_DESCRIPTOR_FINGERPRINT_SCHEMA,
    identity.engineId,
    identity.engineVersion,
    identity.renderKey,
    configIdentity(identity.descriptorConfig),
  ].join('|')
}

function cloneSpectral(value: AudioSpectralFingerprint): AudioSpectralFingerprint {
  return { ...value, meanLogMel: new Float32Array(value.meanLogMel), meanMfcc: new Float32Array(value.meanMfcc) }
}

export function cloneAudioDescriptorFingerprint(value: AudioDescriptorFingerprint): AudioDescriptorFingerprint {
  return {
    ...value,
    envelopeRms: new Float32Array(value.envelopeRms),
    envelopePeak: new Float32Array(value.envelopePeak),
    spectral: value.spectral.map(cloneSpectral),
  }
}

function valid(value: unknown): value is AudioDescriptorFingerprint {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AudioDescriptorFingerprint>
  return candidate.schema === AUDIO_DESCRIPTOR_FINGERPRINT_SCHEMA
    && candidate.envelopeRms instanceof Float32Array
    && candidate.envelopePeak instanceof Float32Array
    && Array.isArray(candidate.spectral)
}

export function createMemoryPresetFingerprintCache(): PresetFingerprintCache {
  const values = new Map<string, AudioDescriptorFingerprint>()
  return {
    async get(key) {
      const value = values.get(key)
      return value ? cloneAudioDescriptorFingerprint(value) : null
    },
    async put(key, fingerprint) {
      if (!valid(fingerprint)) throw new Error('Preset fingerprint cache requires a versioned fingerprint.')
      values.set(key, cloneAudioDescriptorFingerprint(fingerprint))
    },
    async clear() { values.clear() },
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB fingerprint request failed.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB fingerprint transaction failed.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB fingerprint transaction aborted.'))
  })
}

export function createIndexedDbPresetFingerprintCache(options: { readonly indexedDb?: IDBFactory; readonly databaseName?: string } = {}): PresetFingerprintCache {
  const factory = options.indexedDb ?? globalThis.indexedDB
  if (!factory) throw new Error('IndexedDB is unavailable for the local compact preset index.')
  const databaseName = options.databaseName ?? DATABASE_NAME
  let openPromise: Promise<IDBDatabase> | null = null
  const database = () => {
    openPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(databaseName, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Unable to open local compact preset index.'))
      request.onblocked = () => reject(new Error('Local compact preset index is blocked by another tab.'))
    })
    return openPromise
  }
  return {
    async get(key) {
      const db = await database()
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const value = await requestResult(transaction.objectStore(STORE_NAME).get(key))
      await transactionDone(transaction)
      return valid(value) ? cloneAudioDescriptorFingerprint(value) : null
    },
    async put(key, fingerprint) {
      if (!valid(fingerprint)) throw new Error('Preset fingerprint cache requires a versioned fingerprint.')
      const db = await database()
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(cloneAudioDescriptorFingerprint(fingerprint), key)
      await transactionDone(transaction)
    },
    async clear() {
      const db = await database()
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).clear()
      await transactionDone(transaction)
    },
  }
}
