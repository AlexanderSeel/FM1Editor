import {
  AUDIO_DESCRIPTOR_SCHEMA,
  type AudioDescriptorProfile,
  type AudioSpectralResolutionDescriptor,
} from './audioDescriptors'

export const AUDIO_DESCRIPTOR_FINGERPRINT_SCHEMA = 'fm1-editor.audio-descriptor-fingerprint.v1' as const
export const AUDIO_DESCRIPTOR_FINGERPRINT_ENVELOPE_POINTS = 32 as const

export interface AudioSpectralFingerprint {
  readonly fftSize: number
  readonly meanLogMel: Float32Array
  readonly meanMfcc: Float32Array
  readonly centroidMeanHz: number
  readonly centroidStandardDeviationHz: number
  readonly rolloffMeanHz: number
  readonly rolloffStandardDeviationHz: number
  readonly flatnessMean: number
  readonly flatnessStandardDeviation: number
}

export interface AudioDescriptorFingerprint {
  readonly schema: typeof AUDIO_DESCRIPTOR_FINGERPRINT_SCHEMA
  readonly sourceDescriptorSchema: typeof AUDIO_DESCRIPTOR_SCHEMA
  readonly sampleRate: number
  readonly durationSeconds: number
  readonly envelopeRms: Float32Array
  readonly envelopePeak: Float32Array
  readonly spectral: readonly AudioSpectralFingerprint[]
}

export interface FingerprintMetricBreakdown {
  readonly envelope: number
  readonly mel: number
  readonly mfcc: number
  readonly centroid: number
  readonly rolloff: number
  readonly flatness: number
  readonly total: number
}

function resample(values: Float32Array, points: number): Float32Array {
  if (values.length === 0) return new Float32Array(points)
  if (values.length === 1) return new Float32Array(points).fill(values[0] ?? 0)
  const result = new Float32Array(points)
  for (let index = 0; index < points; index += 1) {
    const position = points === 1 ? 0 : index * (values.length - 1) / (points - 1)
    const left = Math.floor(position)
    const right = Math.min(values.length - 1, left + 1)
    const amount = position - left
    result[index] = (values[left] ?? 0) * (1 - amount) + (values[right] ?? 0) * amount
  }
  return result
}

function meanFrames(values: Float32Array, frameCount: number, width: number): Float32Array {
  const result = new Float32Array(width)
  if (frameCount <= 0 || width <= 0) return result
  if (values.length !== frameCount * width) throw new Error('Descriptor frame matrix shape is inconsistent.')
  for (let frame = 0; frame < frameCount; frame += 1) {
    const offset = frame * width
    for (let column = 0; column < width; column += 1) {
      result[column] = (result[column] ?? 0) + (values[offset + column] ?? 0) / frameCount
    }
  }
  return result
}

function compactResolution(
  resolution: AudioSpectralResolutionDescriptor,
  melBands: number,
  mfccCount: number,
): AudioSpectralFingerprint {
  const frameCount = resolution.sampledFrameStarts.length
  return {
    fftSize: resolution.fftSize,
    meanLogMel: meanFrames(resolution.logMelSpectrum, frameCount, melBands),
    meanMfcc: meanFrames(resolution.mfcc, frameCount, mfccCount),
    centroidMeanHz: resolution.centroidMoments.mean,
    centroidStandardDeviationHz: resolution.centroidMoments.standardDeviation,
    rolloffMeanHz: resolution.rolloffMoments.mean,
    rolloffStandardDeviationHz: resolution.rolloffMoments.standardDeviation,
    flatnessMean: resolution.flatnessMoments.mean,
    flatnessStandardDeviation: resolution.flatnessMoments.standardDeviation,
  }
}

export function createAudioDescriptorFingerprint(profile: AudioDescriptorProfile): AudioDescriptorFingerprint {
  if (profile.schema !== AUDIO_DESCRIPTOR_SCHEMA) throw new Error('Unsupported audio descriptor schema.')
  return {
    schema: AUDIO_DESCRIPTOR_FINGERPRINT_SCHEMA,
    sourceDescriptorSchema: AUDIO_DESCRIPTOR_SCHEMA,
    sampleRate: profile.sampleRate,
    durationSeconds: profile.durationSeconds,
    envelopeRms: resample(profile.amplitudeEnvelopeRms, AUDIO_DESCRIPTOR_FINGERPRINT_ENVELOPE_POINTS),
    envelopePeak: resample(profile.amplitudeEnvelopePeak, AUDIO_DESCRIPTOR_FINGERPRINT_ENVELOPE_POINTS),
    spectral: profile.spectral.map((resolution) => compactResolution(
      resolution,
      profile.config.melBands,
      profile.config.mfccCount,
    )),
  }
}

function rmsDistance(left: Float32Array, right: Float32Array, scale = 1): number {
  if (left.length !== right.length) throw new Error('Fingerprint vectors must have equal lengths.')
  if (left.length === 0) return 0
  let sum = 0
  for (let index = 0; index < left.length; index += 1) {
    const difference = ((left[index] ?? 0) - (right[index] ?? 0)) / scale
    sum += difference * difference
  }
  return Math.sqrt(sum / left.length)
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

export function compareAudioDescriptorFingerprints(
  reference: AudioDescriptorFingerprint,
  candidate: AudioDescriptorFingerprint,
): FingerprintMetricBreakdown {
  if (reference.schema !== AUDIO_DESCRIPTOR_FINGERPRINT_SCHEMA || candidate.schema !== AUDIO_DESCRIPTOR_FINGERPRINT_SCHEMA) {
    throw new Error('Unsupported audio descriptor fingerprint schema.')
  }
  if (reference.spectral.length !== candidate.spectral.length) throw new Error('Fingerprint spectral resolutions differ.')
  const nyquist = Math.max(reference.sampleRate, candidate.sampleRate) / 2
  const envelope = mean([
    rmsDistance(reference.envelopeRms, candidate.envelopeRms),
    rmsDistance(reference.envelopePeak, candidate.envelopePeak),
  ])
  const mel: number[] = []
  const mfcc: number[] = []
  const centroid: number[] = []
  const rolloff: number[] = []
  const flatness: number[] = []
  reference.spectral.forEach((left, index) => {
    const right = candidate.spectral[index]
    if (!right || left.fftSize !== right.fftSize) throw new Error('Fingerprint FFT resolutions differ.')
    mel.push(rmsDistance(left.meanLogMel, right.meanLogMel, 12))
    mfcc.push(rmsDistance(left.meanMfcc, right.meanMfcc, 20))
    centroid.push(Math.abs(left.centroidMeanHz - right.centroidMeanHz) / nyquist)
    centroid.push(Math.abs(left.centroidStandardDeviationHz - right.centroidStandardDeviationHz) / nyquist)
    rolloff.push(Math.abs(left.rolloffMeanHz - right.rolloffMeanHz) / nyquist)
    rolloff.push(Math.abs(left.rolloffStandardDeviationHz - right.rolloffStandardDeviationHz) / nyquist)
    flatness.push(Math.abs(left.flatnessMean - right.flatnessMean))
    flatness.push(Math.abs(left.flatnessStandardDeviation - right.flatnessStandardDeviation))
  })
  const metrics = {
    envelope,
    mel: mean(mel),
    mfcc: mean(mfcc),
    centroid: mean(centroid),
    rolloff: mean(rolloff),
    flatness: mean(flatness),
  }
  return {
    ...metrics,
    total: metrics.envelope * 0.18
      + metrics.mel * 0.32
      + metrics.mfcc * 0.22
      + metrics.centroid * 0.10
      + metrics.rolloff * 0.10
      + metrics.flatness * 0.08,
  }
}

export function fingerprintFloatCount(fingerprint: AudioDescriptorFingerprint): number {
  return fingerprint.envelopeRms.length + fingerprint.envelopePeak.length + fingerprint.spectral.reduce(
    (sum, resolution) => sum + resolution.meanLogMel.length + resolution.meanMfcc.length + 6,
    0,
  )
}
