import {
  AUDIO_DESCRIPTOR_SCHEMA,
  type AudioDescriptorConfig,
  type AudioDescriptorProfile,
  type AudioSpectralResolutionDescriptor,
} from './audioDescriptors'

export const PRESET_DESCRIPTOR_CACHE_SCHEMA = 'fm1-editor.preset-descriptor-cache.v1' as const
export const PRESET_DESCRIPTOR_CACHE_DATABASE = 'fm1-editor-audio-to-fm' as const
export const PRESET_DESCRIPTOR_CACHE_STORE = 'preset-descriptors' as const

export interface PresetDescriptorCacheIdentity {
  readonly engineId: string
  readonly engineVersion: string
  readonly renderKey: string
  readonly descriptorConfig: AudioDescriptorConfig
}

export interface PresetDescriptorCache {
  get(key: string): Promise<AudioDescriptorProfile | null>
  put(key: string, descriptor: AudioDescriptorProfile): Promise<void>
  clear(): Promise<void>
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

export function createPresetDescriptorCacheKey(identity: PresetDescriptorCacheIdentity): string {
  if (!identity.engineId || !identity.engineVersion || !identity.renderKey) {
    throw new Error('Preset descriptor cache identity requires engine id, version and render key.')
  }
  return [
    PRESET_DESCRIPTOR_CACHE_SCHEMA,
    identity.engineId,
    identity.engineVersion,
    identity.renderKey,
    configIdentity(identity.descriptorConfig),
  ].join('|')
}

function cloneResolution(value: AudioSpectralResolutionDescriptor): AudioSpectralResolutionDescriptor {
  return {
    ...value,
    sampledFrameStarts: new Uint32Array(value.sampledFrameStarts),
    logMagnitude: new Float32Array(value.logMagnitude),
    logMelSpectrum: new Float32Array(value.logMelSpectrum),
    mfcc: new Float32Array(value.mfcc),
    spectralCentroidHz: new Float32Array(value.spectralCentroidHz),
    spectralRolloffHz: new Float32Array(value.spectralRolloffHz),
    spectralFlatness: new Float32Array(value.spectralFlatness),
    centroidMoments: { ...value.centroidMoments },
    rolloffMoments: { ...value.rolloffMoments },
    flatnessMoments: { ...value.flatnessMoments },
  }
}

export function cloneAudioDescriptorProfile(value: AudioDescriptorProfile): AudioDescriptorProfile {
  return {
    ...value,
    config: { ...value.config, fftSizes: [...value.config.fftSizes] },
    amplitudeEnvelopeRms: new Float32Array(value.amplitudeEnvelopeRms),
    amplitudeEnvelopePeak: new Float32Array(value.amplitudeEnvelopePeak),
    spectral: value.spectral.map(cloneResolution),
  }
}

function validDescriptor(value: unknown): value is AudioDescriptorProfile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AudioDescriptorProfile>
  return candidate.schema === AUDIO_DESCRIPTOR_SCHEMA
    && typeof candidate.sampleRate === 'number'
    && Number.isFinite(candidate.sampleRate)
    && candidate.sampleRate > 0
    && candidate.amplitudeEnvelopeRms instanceof Float32Array
    && candidate.amplitudeEnvelopePeak instanceof Float32Array
    && Array.isArray(candidate.spectral)
}

export function createMemoryPresetDescriptorCache(): PresetDescriptorCache {
  const values = new Map<string, AudioDescriptorProfile>()
  return {
    async get(key) {
      const value = values.get(key)
      return value ? cloneAudioDescriptorProfile(value) : null
    },
    async put(key, descriptor) {
      if (!validDescriptor(descriptor)) throw new Error('Preset descriptor cache accepts only versioned audio descriptor profiles.')
      values.set(key, cloneAudioDescriptorProfile(descriptor))
    },
    async clear() {
      values.clear()
    },
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'))
  })
}

export function createIndexedDbPresetDescriptorCache(options: {
  readonly indexedDb?: IDBFactory
  readonly databaseName?: string
} = {}): PresetDescriptorCache {
  const factory = options.indexedDb ?? globalThis.indexedDB
  if (!factory) throw new Error('IndexedDB is not available for the local descriptor cache.')
  const databaseName = options.databaseName ?? PRESET_DESCRIPTOR_CACHE_DATABASE
  let databasePromise: Promise<IDBDatabase> | null = null

  const database = () => {
    if (databasePromise) return databasePromise
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(databaseName, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(PRESET_DESCRIPTOR_CACHE_STORE)) {
          db.createObjectStore(PRESET_DESCRIPTOR_CACHE_STORE)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Unable to open local preset descriptor cache.'))
      request.onblocked = () => reject(new Error('Local preset descriptor cache upgrade is blocked by another tab.'))
    })
    return databasePromise
  }

  return {
    async get(key) {
      const db = await database()
      const transaction = db.transaction(PRESET_DESCRIPTOR_CACHE_STORE, 'readonly')
      const value = await requestResult(transaction.objectStore(PRESET_DESCRIPTOR_CACHE_STORE).get(key))
      await transactionDone(transaction)
      return validDescriptor(value) ? cloneAudioDescriptorProfile(value) : null
    },
    async put(key, descriptor) {
      if (!validDescriptor(descriptor)) throw new Error('Preset descriptor cache accepts only versioned audio descriptor profiles.')
      const db = await database()
      const transaction = db.transaction(PRESET_DESCRIPTOR_CACHE_STORE, 'readwrite')
      transaction.objectStore(PRESET_DESCRIPTOR_CACHE_STORE).put(cloneAudioDescriptorProfile(descriptor), key)
      await transactionDone(transaction)
    },
    async clear() {
      const db = await database()
      const transaction = db.transaction(PRESET_DESCRIPTOR_CACHE_STORE, 'readwrite')
      transaction.objectStore(PRESET_DESCRIPTOR_CACHE_STORE).clear()
      await transactionDone(transaction)
    },
  }
}
