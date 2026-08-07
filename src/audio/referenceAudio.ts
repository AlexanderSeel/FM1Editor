export const REFERENCE_AUDIO_MAX_BYTES = 25 * 1024 * 1024
export const REFERENCE_AUDIO_MAX_DURATION_SECONDS = 30
export const REFERENCE_AUDIO_MIN_REGION_SECONDS = 0.05
export const REFERENCE_AUDIO_SILENCE_THRESHOLD_DB = -60
export const REFERENCE_AUDIO_NORMALIZED_PEAK = 0.8912509381337456 // -1 dBFS

export interface ReferenceAudioRegion {
  startSeconds: number
  endSeconds: number
}

export interface ReferenceAudioPreparationOptions {
  region: ReferenceAudioRegion
  trimSilence: boolean
  normalize: boolean
  manualPitchHz?: number | null
}

export interface PreparedReferenceAudio {
  readonly sampleRate: number
  readonly samples: Float32Array
  readonly region: ReferenceAudioRegion
  readonly detectedPitchHz: number | null
  readonly analysisPitchHz: number | null
  readonly normalizationGain: number
  readonly trimmedLeadingSeconds: number
  readonly trimmedTrailingSeconds: number
  readonly durationSeconds: number
}

export interface DecodedReferenceAudio {
  readonly filename: string
  readonly mimeType: string
  readonly sizeBytes: number
  readonly contentSha256: string
  readonly sampleRate: number
  readonly durationSeconds: number
  readonly channels: readonly Float32Array[]
  readonly privacy: 'local-browser-only'
}

function assertFinite(label: string, value: number): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`)
  return value
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf('.')
  return index >= 0 ? filename.slice(index).toLowerCase() : ''
}

export function validateReferenceAudioFile(file: Pick<File, 'name' | 'size' | 'type'>): void {
  if (!Number.isInteger(file.size) || file.size <= 0) throw new Error('Reference audio file is empty.')
  if (file.size > REFERENCE_AUDIO_MAX_BYTES) {
    throw new Error(`Reference audio must be ${Math.round(REFERENCE_AUDIO_MAX_BYTES / 1024 / 1024)} MB or smaller.`)
  }
  const extension = extensionOf(file.name)
  const mime = file.type.toLowerCase()
  const extensionAllowed = extension === '.wav' || extension === '.mp3'
  const mimeAllowed = mime === 'audio/wav' || mime === 'audio/wave' || mime === 'audio/x-wav' || mime === 'audio/mpeg' || mime === 'audio/mp3' || mime === ''
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
    for (let index = 0; index < length; index += 1) mono[index] += (channel[index] ?? 0) / channels.length
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
  let endExclusive = samples.length
  while (endExclusive > start && Math.abs(samples[endExclusive - 1] ?? 0) <= threshold) endExclusive -= 1
  return { start, endExclusive }
}

export function estimateReferencePitchHz(
  samples: Float32Array,
  sampleRate: number,
  minimumHz = 45,
  maximumHz = 2_000,
): number | null {
  assertFinite('sampleRate', sampleRate)
  if (sampleRate <= 0 || samples.length < 64) return null
  const minLag = Math.max(1, Math.floor(sampleRate / maximumHz))
  const maxLag = Math.min(samples.length - 2, Math.ceil(sampleRate / minimumHz))
  if (maxLag <= minLag) return null

  let energy = 0
  let mean = 0
  for (const sample of samples) mean += sample
  mean /= samples.length
  for (const sample of samples) {
    const centered = sample - mean
    energy += centered * centered
  }
  if (energy / samples.length < 1e-8) return null

  const analysisLength = Math.min(samples.length, Math.floor(sampleRate * 0.5))
  let bestLag = 0
  let bestCorrelation = 0
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let cross = 0
    let leftEnergy = 0
    let rightEnergy = 0
    const count = analysisLength - lag
    if (count <= 16) break
    for (let index = 0; index < count; index += 1) {
      const left = (samples[index] ?? 0) - mean
      const right = (samples[index + lag] ?? 0) - mean
      cross += left * right
      leftEnergy += left * left
      rightEnergy += right * right
    }
    const denominator = Math.sqrt(leftEnergy * rightEnergy)
    const correlation = denominator > 0 ? cross / denominator : 0
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }
  if (bestLag === 0 || bestCorrelation < 0.55) return null
  return sampleRate / bestLag
}

export function prepareReferenceAudio(
  decoded: Pick<DecodedReferenceAudio, 'sampleRate' | 'durationSeconds' | 'channels'>,
  options: ReferenceAudioPreparationOptions,
): PreparedReferenceAudio {
  if (!Number.isFinite(decoded.sampleRate) || decoded.sampleRate <= 0) throw new Error('Decoded reference sample rate is invalid.')
  if (!Number.isFinite(decoded.durationSeconds) || decoded.durationSeconds <= 0) throw new Error('Decoded reference duration is invalid.')
  const startSeconds = clamp(assertFinite('region.startSeconds', options.region.startSeconds), 0, decoded.durationSeconds)
  const endSeconds = clamp(assertFinite('region.endSeconds', options.region.endSeconds), 0, decoded.durationSeconds)
  if (endSeconds - startSeconds < REFERENCE_AUDIO_MIN_REGION_SECONDS) {
    throw new Error(`Reference region must be at least ${REFERENCE_AUDIO_MIN_REGION_SECONDS} seconds.`)
  }

  const fullMono = mixReferenceChannelsToMono(decoded.channels)
  const startSample = Math.floor(startSeconds * decoded.sampleRate)
  const endSample = Math.min(fullMono.length, Math.ceil(endSeconds * decoded.sampleRate))
  let selected = fullMono.slice(startSample, endSample)
  let trimmedLeadingSamples = 0
  let trimmedTrailingSamples = 0

  if (options.trimSilence) {
    const bounds = findReferenceSilenceBounds(selected)
    trimmedLeadingSamples = bounds.start
    trimmedTrailingSamples = selected.length - bounds.endExclusive
    selected = selected.slice(bounds.start, bounds.endExclusive)
  }
  if (selected.length === 0) throw new Error('The selected reference region is silent after trimming.')
  if (selected.length / decoded.sampleRate > REFERENCE_AUDIO_MAX_DURATION_SECONDS) {
    throw new Error(`Prepared reference region must be ${REFERENCE_AUDIO_MAX_DURATION_SECONDS} seconds or shorter.`)
  }

  let peak = 0
  for (const sample of selected) peak = Math.max(peak, Math.abs(sample))
  const normalizationGain = options.normalize && peak > 0 ? REFERENCE_AUDIO_NORMALIZED_PEAK / peak : 1
  const samples = new Float32Array(selected.length)
  for (let index = 0; index < selected.length; index += 1) samples[index] = clamp((selected[index] ?? 0) * normalizationGain, -1, 1)

  const detectedPitchHz = estimateReferencePitchHz(samples, decoded.sampleRate)
  const manualPitchHz = options.manualPitchHz
  if (manualPitchHz !== undefined && manualPitchHz !== null && (!Number.isFinite(manualPitchHz) || manualPitchHz < 20 || manualPitchHz > 5_000)) {
    throw new RangeError('Manual reference pitch must be between 20 and 5000 Hz.')
  }

  const preparedStart = startSeconds + trimmedLeadingSamples / decoded.sampleRate
  const preparedEnd = endSeconds - trimmedTrailingSamples / decoded.sampleRate
  return {
    sampleRate: decoded.sampleRate,
    samples,
    region: { startSeconds: preparedStart, endSeconds: preparedEnd },
    detectedPitchHz,
    analysisPitchHz: manualPitchHz ?? detectedPitchHz,
    normalizationGain,
    trimmedLeadingSeconds: trimmedLeadingSamples / decoded.sampleRate,
    trimmedTrailingSeconds: trimmedTrailingSamples / decoded.sampleRate,
    durationSeconds: samples.length / decoded.sampleRate,
  }
}

export async function decodeReferenceAudioFile(
  file: File,
  createContext: () => AudioContext = () => new AudioContext(),
): Promise<DecodedReferenceAudio> {
  validateReferenceAudioFile(file)
  const bytes = await file.arrayBuffer()
  const contentSha256 = await sha256Hex(bytes)
  const context = createContext()
  try {
    const buffer = await context.decodeAudioData(bytes.slice(0))
    if (buffer.duration > REFERENCE_AUDIO_MAX_DURATION_SECONDS * 4) {
      throw new Error(`Decoded reference audio must be ${REFERENCE_AUDIO_MAX_DURATION_SECONDS * 4} seconds or shorter before region selection.`)
    }
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => new Float32Array(buffer.getChannelData(index)))
    return {
      filename: file.name,
      mimeType: file.type || (extensionOf(file.name) === '.mp3' ? 'audio/mpeg' : 'audio/wav'),
      sizeBytes: file.size,
      contentSha256,
      sampleRate: buffer.sampleRate,
      durationSeconds: buffer.duration,
      channels,
      privacy: 'local-browser-only',
    }
  } finally {
    await context.close().catch(() => undefined)
  }
}
