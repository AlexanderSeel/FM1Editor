export const REFERENCE_AUDIO_MAX_BYTES = 25 * 1024 * 1024
export const REFERENCE_AUDIO_MAX_DECODED_DURATION_SECONDS = 120
export const REFERENCE_AUDIO_MAX_DURATION_SECONDS = 30
export const REFERENCE_AUDIO_MIN_REGION_SECONDS = 0.05
export const REFERENCE_AUDIO_MIN_DURATION_SECONDS = REFERENCE_AUDIO_MIN_REGION_SECONDS
export const REFERENCE_AUDIO_SILENCE_THRESHOLD_DB = -60
export const REFERENCE_AUDIO_NORMALIZED_PEAK = Math.pow(10, -1 / 20)
export const REFERENCE_AUDIO_NORMALIZATION_PEAK = REFERENCE_AUDIO_NORMALIZED_PEAK
export const REFERENCE_AUDIO_PRIVACY = 'Local only: decoded audio and analysis stay in this browser unless a future server action is explicitly enabled.' as const

export interface ReferenceAudioFileLike {
  name: string
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface ReferenceAudioRegion {
  startSeconds: number
  endSeconds: number
}

export interface ReferenceAudioPreparationOptions {
  region?: ReferenceAudioRegion
  trimSilence?: boolean
  normalize?: boolean
  manualPitchHz?: number | null
}

export interface DecodedReferenceAudio {
  sampleRate: number
  durationSeconds: number
  channels: readonly Float32Array[]
}

export interface DecodedReferenceAudioFile extends DecodedReferenceAudio {
  filename: string
  mimeType: string
  sizeBytes: number
  contentSha256: string
}

export interface PreparedReferenceAudio {
  sampleRate: number
  decodedDurationSeconds: number
  selectedRegion: ReferenceAudioRegion
  trimmedLeadingSeconds: number
  trimmedTrailingSeconds: number
  durationSeconds: number
  samples: Float32Array
  peakBeforeNormalization: number
  normalizationGain: number
  detectedPitchHz: number | null
  analysisPitchHz: number | null
  pitchSource: 'manual' | 'detected' | 'unresolved'
  privacy: typeof REFERENCE_AUDIO_PRIVACY
  filename?: string
  mimeType?: string
  sizeBytes?: number
  contentSha256?: string
}

function assertFinite(label: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite.`)
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot).toLowerCase()
}

export function validateReferenceAudioFile(file: Pick<ReferenceAudioFileLike, 'name' | 'type' | 'size'>): void {
  if (!Number.isInteger(file.size) || file.size <= 0) throw new Error('Reference audio file is empty.')
  if (file.size > REFERENCE_AUDIO_MAX_BYTES) throw new Error(`Reference audio exceeds the ${REFERENCE_AUDIO_MAX_BYTES / 1024 / 1024} MB file-size limit.`)
  const extension = extensionOf(file.name)
  const extensionAllowed = extension === '.wav' || extension === '.mp3'
  const type = file.type.toLowerCase()
  const mimeAllowed = type === '' || type === 'audio/wav' || type === 'audio/x-wav' || type === 'audio/mpeg' || type === 'audio/mp3'
  if (!extensionAllowed || !mimeAllowed) throw new Error('Reference audio must be a WAV or MP3 file.')
}

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is required to hash local reference audio.')
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

export function mixReferenceChannelsToMono(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) throw new Error('Decoded reference audio contains no channels.')
  const length = channels[0]?.length ?? 0
  if (length === 0) throw new Error('Decoded reference audio contains no samples.')
  if (channels.some((channel) => channel.length !== length)) throw new Error('Decoded reference audio channels have inconsistent lengths.')
  const mono = new Float32Array(length)
  for (const channel of channels) {
    for (let index = 0; index < length; index += 1) {
      mono[index] = (mono[index] ?? 0) + (channel[index] ?? 0) / channels.length
    }
  }
  return mono
}

function silenceThresholdAmplitude(thresholdDb: number): number {
  return Math.pow(10, thresholdDb / 20)
}

export function findReferenceSilenceBounds(
  samples: Float32Array,
  thresholdDb = REFERENCE_AUDIO_SILENCE_THRESHOLD_DB,
): { start: number; endExclusive: number } {
  assertFinite('thresholdDb', thresholdDb)
  const threshold = silenceThresholdAmplitude(thresholdDb)
  let start = 0
  while (start < samples.length && Math.abs(samples[start] ?? 0) <= threshold) start += 1
  if (start === samples.length) return { start: 0, endExclusive: samples.length }
  let endExclusive = samples.length
  while (endExclusive > start && Math.abs(samples[endExclusive - 1] ?? 0) <= threshold) endExclusive -= 1
  return { start, endExclusive }
}

function peakOf(samples: Float32Array): number {
  let peak = 0
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
  return peak
}

export function normalizeReferenceSamples(
  samples: Float32Array,
  targetPeak = REFERENCE_AUDIO_NORMALIZED_PEAK,
): { samples: Float32Array; peakBeforeNormalization: number; normalizationGain: number } {
  assertFinite('targetPeak', targetPeak)
  if (targetPeak <= 0 || targetPeak > 1) throw new RangeError('targetPeak must be greater than 0 and no more than 1.')
  const peakBeforeNormalization = peakOf(samples)
  if (peakBeforeNormalization === 0) return { samples: samples.slice(), peakBeforeNormalization, normalizationGain: 1 }
  const normalizationGain = targetPeak / peakBeforeNormalization
  return {
    samples: Float32Array.from(samples, (sample) => Math.max(-1, Math.min(1, sample * normalizationGain))),
    peakBeforeNormalization,
    normalizationGain,
  }
}

export function estimateReferencePitchHz(samples: Float32Array, sampleRate: number): number | null {
  assertFinite('sampleRate', sampleRate)
  if (sampleRate <= 0 || samples.length < 128) return null
  const maximumLag = Math.min(Math.floor(sampleRate / 50), samples.length - 2)
  const minimumLag = Math.max(1, Math.floor(sampleRate / 2000))
  if (maximumLag <= minimumLag) return null
  const analysisLength = Math.min(samples.length, Math.floor(sampleRate * 0.35))
  let rms = 0
  for (let index = 0; index < analysisLength; index += 1) {
    const sample = samples[index] ?? 0
    rms += sample * sample
  }
  rms = Math.sqrt(rms / analysisLength)
  if (rms < 1e-4) return null

  let bestLag = 0
  let bestCorrelation = -Infinity
  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let correlation = 0
    let energyA = 0
    let energyB = 0
    const count = analysisLength - lag
    if (count <= 32) break
    for (let index = 0; index < count; index += 1) {
      const left = samples[index] ?? 0
      const right = samples[index + lag] ?? 0
      correlation += left * right
      energyA += left * left
      energyB += right * right
    }
    const denominator = Math.sqrt(energyA * energyB)
    if (denominator <= 0) continue
    const normalizedCorrelation = correlation / denominator
    if (normalizedCorrelation > bestCorrelation) {
      bestCorrelation = normalizedCorrelation
      bestLag = lag
    }
  }
  if (bestLag === 0 || bestCorrelation < 0.6) return null
  return sampleRate / bestLag
}

export function prepareReferenceAudio(
  decoded: DecodedReferenceAudio,
  options: ReferenceAudioPreparationOptions = {},
): PreparedReferenceAudio {
  if (!Number.isFinite(decoded.sampleRate) || decoded.sampleRate <= 0) throw new Error('Decoded reference audio has an invalid sample rate.')
  const mono = mixReferenceChannelsToMono(decoded.channels)
  const actualDurationSeconds = mono.length / decoded.sampleRate
  if (actualDurationSeconds < REFERENCE_AUDIO_MIN_REGION_SECONDS) {
    throw new Error(`Decoded reference audio is shorter than ${REFERENCE_AUDIO_MIN_REGION_SECONDS} seconds.`)
  }
  if (decoded.durationSeconds > REFERENCE_AUDIO_MAX_DECODED_DURATION_SECONDS + 1e-6) {
    throw new Error(`Decoded reference audio exceeds the ${REFERENCE_AUDIO_MAX_DECODED_DURATION_SECONDS} second limit.`)
  }

  const region = options.region ?? {
    startSeconds: 0,
    endSeconds: Math.min(actualDurationSeconds, REFERENCE_AUDIO_MAX_DURATION_SECONDS),
  }
  assertFinite('region.startSeconds', region.startSeconds)
  assertFinite('region.endSeconds', region.endSeconds)
  const regionDuration = region.endSeconds - region.startSeconds
  if (region.startSeconds < 0 || region.endSeconds <= region.startSeconds || region.endSeconds > actualDurationSeconds + 1e-6) {
    throw new RangeError('Reference audio selection is outside the decoded audio.')
  }
  if (regionDuration < REFERENCE_AUDIO_MIN_REGION_SECONDS) {
    throw new RangeError(`Reference audio selection is shorter than ${REFERENCE_AUDIO_MIN_REGION_SECONDS} seconds.`)
  }
  if (regionDuration > REFERENCE_AUDIO_MAX_DURATION_SECONDS) {
    throw new RangeError(`Reference audio selection exceeds the ${REFERENCE_AUDIO_MAX_DURATION_SECONDS} second prepared-region limit.`)
  }

  const regionStart = Math.floor(region.startSeconds * decoded.sampleRate)
  const regionEnd = Math.min(mono.length, Math.ceil(region.endSeconds * decoded.sampleRate))
  let selected = mono.slice(regionStart, regionEnd)
  let trimStartFrames = 0
  let trimEndFrames = 0
  if (options.trimSilence !== false) {
    const bounds = findReferenceSilenceBounds(selected)
    trimStartFrames = bounds.start
    trimEndFrames = selected.length - bounds.endExclusive
    selected = selected.slice(bounds.start, bounds.endExclusive)
  }
  if (selected.length === 0) throw new Error('The selected reference audio region contains no samples after trimming.')
  if (selected.length / decoded.sampleRate < REFERENCE_AUDIO_MIN_REGION_SECONDS) {
    throw new Error(`The selected reference audio region is shorter than ${REFERENCE_AUDIO_MIN_REGION_SECONDS} seconds after trimming.`)
  }

  const normalized = options.normalize === false
    ? { samples: selected.slice(), peakBeforeNormalization: peakOf(selected), normalizationGain: 1 }
    : normalizeReferenceSamples(selected)
  const detectedPitchHz = estimateReferencePitchHz(normalized.samples, decoded.sampleRate)
  const manualPitchHz = options.manualPitchHz ?? null
  if (manualPitchHz !== null) {
    assertFinite('manualPitchHz', manualPitchHz)
    if (manualPitchHz < 20 || manualPitchHz > 5000) throw new RangeError('manualPitchHz must be between 20 and 5000 Hz.')
  }
  const analysisPitchHz = manualPitchHz ?? detectedPitchHz

  return {
    sampleRate: decoded.sampleRate,
    decodedDurationSeconds: actualDurationSeconds,
    selectedRegion: { ...region },
    trimmedLeadingSeconds: trimStartFrames / decoded.sampleRate,
    trimmedTrailingSeconds: trimEndFrames / decoded.sampleRate,
    durationSeconds: normalized.samples.length / decoded.sampleRate,
    samples: normalized.samples,
    peakBeforeNormalization: normalized.peakBeforeNormalization,
    normalizationGain: normalized.normalizationGain,
    detectedPitchHz,
    analysisPitchHz,
    pitchSource: manualPitchHz !== null ? 'manual' : detectedPitchHz !== null ? 'detected' : 'unresolved',
    privacy: REFERENCE_AUDIO_PRIVACY,
  }
}

export const prepareDecodedReferenceAudio = prepareReferenceAudio

async function decodeAudioBytes(bytes: ArrayBuffer): Promise<DecodedReferenceAudio> {
  if (typeof AudioContext === 'undefined') throw new Error('Web Audio is required to decode reference WAV/MP3 audio.')
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(bytes.slice(0))
    return {
      sampleRate: buffer.sampleRate,
      durationSeconds: buffer.duration,
      channels: Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index).slice()),
    }
  } finally {
    await context.close().catch(() => undefined)
  }
}

export async function decodeReferenceAudioFile(
  file: ReferenceAudioFileLike,
  decodeAudio: (bytes: ArrayBuffer) => Promise<DecodedReferenceAudio> = decodeAudioBytes,
): Promise<DecodedReferenceAudioFile> {
  validateReferenceAudioFile(file)
  const bytes = await file.arrayBuffer()
  if (bytes.byteLength !== file.size) throw new Error('Reference audio file size changed while reading.')
  const [contentSha256, decoded] = await Promise.all([sha256Hex(bytes), decodeAudio(bytes)])
  if (decoded.durationSeconds > REFERENCE_AUDIO_MAX_DECODED_DURATION_SECONDS) {
    throw new Error(`Decoded reference audio exceeds the ${REFERENCE_AUDIO_MAX_DECODED_DURATION_SECONDS} second limit.`)
  }
  return {
    ...decoded,
    filename: file.name,
    mimeType: file.type || (extensionOf(file.name) === '.wav' ? 'audio/wav' : 'audio/mpeg'),
    sizeBytes: bytes.byteLength,
    contentSha256,
  }
}

export async function prepareReferenceAudioFile(
  file: ReferenceAudioFileLike,
  options: ReferenceAudioPreparationOptions = {},
  decodeAudio: (bytes: ArrayBuffer) => Promise<DecodedReferenceAudio> = decodeAudioBytes,
): Promise<PreparedReferenceAudio> {
  const decoded = await decodeReferenceAudioFile(file, decodeAudio)
  return {
    ...prepareReferenceAudio(decoded, options),
    filename: decoded.filename,
    mimeType: decoded.mimeType,
    sizeBytes: decoded.sizeBytes,
    contentSha256: decoded.contentSha256,
  }
}
