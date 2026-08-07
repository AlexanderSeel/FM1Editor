export const AUDIO_DESCRIPTOR_SCHEMA = 'fm1-editor.audio-descriptors.v1' as const

export interface AudioDescriptorConfig {
  readonly envelopeWindowMs: number
  readonly envelopeHopMs: number
  readonly fftSizes: readonly number[]
  readonly spectralHopRatio: number
  readonly melBands: number
  readonly mfccCount: number
  readonly rolloffFraction: number
  readonly maxSpectralFrames: number
  readonly minimumHz: number
  readonly maximumHz: number | null
}

export interface AudioDescriptorMoments {
  readonly mean: number
  readonly standardDeviation: number
}

export interface AudioSpectralResolutionDescriptor {
  readonly fftSize: number
  readonly hopSize: number
  readonly totalFrameCount: number
  readonly sampledFrameStarts: Uint32Array
  readonly logMagnitude: Float32Array
  readonly logMelSpectrum: Float32Array
  readonly mfcc: Float32Array
  readonly spectralCentroidHz: Float32Array
  readonly spectralRolloffHz: Float32Array
  readonly spectralFlatness: Float32Array
  readonly centroidMoments: AudioDescriptorMoments
  readonly rolloffMoments: AudioDescriptorMoments
  readonly flatnessMoments: AudioDescriptorMoments
}

export interface AudioDescriptorProfile {
  readonly schema: typeof AUDIO_DESCRIPTOR_SCHEMA
  readonly sampleRate: number
  readonly sampleCount: number
  readonly durationSeconds: number
  readonly config: AudioDescriptorConfig
  readonly amplitudeEnvelopeRms: Float32Array
  readonly amplitudeEnvelopePeak: Float32Array
  readonly spectral: readonly AudioSpectralResolutionDescriptor[]
}

export const DEFAULT_AUDIO_DESCRIPTOR_CONFIG: AudioDescriptorConfig = Object.freeze({
  envelopeWindowMs: 20,
  envelopeHopMs: 10,
  fftSizes: Object.freeze([512, 1024, 2048]),
  spectralHopRatio: 0.25,
  melBands: 40,
  mfccCount: 13,
  rolloffFraction: 0.85,
  maxSpectralFrames: 256,
  minimumHz: 20,
  maximumHz: null,
})

function assertFiniteNumber(label: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite.`)
}

function assertPositiveInteger(label: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${label} must be a positive integer.`)
}

function assertPowerOfTwo(label: string, value: number): void {
  assertPositiveInteger(label, value)
  if ((value & (value - 1)) !== 0) throw new RangeError(`${label} must be a power of two.`)
}

function validateSamples(samples: Float32Array, sampleRate: number): void {
  assertFiniteNumber('sampleRate', sampleRate)
  if (sampleRate <= 0) throw new RangeError('sampleRate must be greater than zero.')
  if (samples.length === 0) throw new Error('Audio descriptors require at least one sample.')
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index]
    if (sample === undefined || !Number.isFinite(sample)) throw new Error(`Audio sample ${index} is not finite.`)
    if (sample < -1 || sample > 1) throw new RangeError(`Audio sample ${index} must be normalized to [-1, 1].`)
  }
}

function validateConfig(config: AudioDescriptorConfig, sampleRate: number): void {
  assertFiniteNumber('envelopeWindowMs', config.envelopeWindowMs)
  assertFiniteNumber('envelopeHopMs', config.envelopeHopMs)
  if (config.envelopeWindowMs <= 0 || config.envelopeHopMs <= 0) throw new RangeError('Envelope window and hop must be greater than zero.')
  if (config.fftSizes.length === 0) throw new Error('At least one FFT size is required.')
  config.fftSizes.forEach((size, index) => assertPowerOfTwo(`fftSizes[${index}]`, size))
  assertFiniteNumber('spectralHopRatio', config.spectralHopRatio)
  if (config.spectralHopRatio <= 0 || config.spectralHopRatio > 1) throw new RangeError('spectralHopRatio must be in (0, 1].')
  assertPositiveInteger('melBands', config.melBands)
  assertPositiveInteger('mfccCount', config.mfccCount)
  if (config.mfccCount > config.melBands) throw new RangeError('mfccCount may not exceed melBands.')
  assertFiniteNumber('rolloffFraction', config.rolloffFraction)
  if (config.rolloffFraction <= 0 || config.rolloffFraction >= 1) throw new RangeError('rolloffFraction must be in (0, 1).')
  assertPositiveInteger('maxSpectralFrames', config.maxSpectralFrames)
  assertFiniteNumber('minimumHz', config.minimumHz)
  if (config.minimumHz < 0 || config.minimumHz >= sampleRate / 2) throw new RangeError('minimumHz must be below Nyquist.')
  if (config.maximumHz !== null) {
    assertFiniteNumber('maximumHz', config.maximumHz)
    if (config.maximumHz <= config.minimumHz || config.maximumHz > sampleRate / 2) throw new RangeError('maximumHz must be above minimumHz and at or below Nyquist.')
  }
}

function cloneConfig(config: AudioDescriptorConfig): AudioDescriptorConfig {
  return {
    ...config,
    fftSizes: [...config.fftSizes],
  }
}

function frameCount(sampleCount: number, windowSize: number, hopSize: number): number {
  if (sampleCount <= windowSize) return 1
  return 1 + Math.ceil((sampleCount - windowSize) / hopSize)
}

function sampledFrameIndices(totalFrames: number, maximumFrames: number): Uint32Array {
  const count = Math.min(totalFrames, maximumFrames)
  const result = new Uint32Array(count)
  if (count === 1) return result
  for (let index = 0; index < count; index += 1) {
    result[index] = Math.round(index * (totalFrames - 1) / (count - 1))
  }
  return result
}

function hann(index: number, size: number): number {
  return size <= 1 ? 1 : 0.5 - 0.5 * Math.cos(2 * Math.PI * index / (size - 1))
}

function fftPower(samples: Float32Array, start: number, size: number): Float64Array {
  const real = new Float64Array(size)
  const imaginary = new Float64Array(size)
  for (let index = 0; index < size; index += 1) real[index] = (samples[start + index] ?? 0) * hann(index, size)

  let target = 0
  for (let index = 1; index < size; index += 1) {
    let bit = size >> 1
    while (target & bit) {
      target ^= bit
      bit >>= 1
    }
    target ^= bit
    if (index < target) {
      const realValue = real[index] ?? 0
      real[index] = real[target] ?? 0
      real[target] = realValue
      const imaginaryValue = imaginary[index] ?? 0
      imaginary[index] = imaginary[target] ?? 0
      imaginary[target] = imaginaryValue
    }
  }

  for (let length = 2; length <= size; length <<= 1) {
    const angle = -2 * Math.PI / length
    const baseReal = Math.cos(angle)
    const baseImaginary = Math.sin(angle)
    for (let offset = 0; offset < size; offset += length) {
      let twiddleReal = 1
      let twiddleImaginary = 0
      for (let pair = 0; pair < length / 2; pair += 1) {
        const left = offset + pair
        const right = left + length / 2
        const rightReal = real[right] ?? 0
        const rightImaginary = imaginary[right] ?? 0
        const transformedReal = rightReal * twiddleReal - rightImaginary * twiddleImaginary
        const transformedImaginary = rightReal * twiddleImaginary + rightImaginary * twiddleReal
        const leftReal = real[left] ?? 0
        const leftImaginary = imaginary[left] ?? 0
        real[left] = leftReal + transformedReal
        imaginary[left] = leftImaginary + transformedImaginary
        real[right] = leftReal - transformedReal
        imaginary[right] = leftImaginary - transformedImaginary
        const nextTwiddleReal = twiddleReal * baseReal - twiddleImaginary * baseImaginary
        twiddleImaginary = twiddleReal * baseImaginary + twiddleImaginary * baseReal
        twiddleReal = nextTwiddleReal
      }
    }
  }

  const bins = size / 2 + 1
  const power = new Float64Array(bins)
  const normalization = 1 / (size * size)
  for (let bin = 0; bin < bins; bin += 1) {
    const re = real[bin] ?? 0
    const im = imaginary[bin] ?? 0
    power[bin] = (re * re + im * im) * normalization
  }
  return power
}

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700)
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1)
}

function createMelFilters(
  fftSize: number,
  sampleRate: number,
  bandCount: number,
  minimumHz: number,
  maximumHz: number,
): readonly { left: number; center: number; right: number }[] {
  const minimumMel = hzToMel(minimumHz)
  const maximumMel = hzToMel(maximumHz)
  const points = Array.from({ length: bandCount + 2 }, (_, index) => {
    const mel = minimumMel + (maximumMel - minimumMel) * index / (bandCount + 1)
    const bin = Math.floor((fftSize + 1) * melToHz(mel) / sampleRate)
    return Math.max(0, Math.min(fftSize / 2, bin))
  })
  return Array.from({ length: bandCount }, (_, index) => ({
    left: points[index] ?? 0,
    center: points[index + 1] ?? 0,
    right: points[index + 2] ?? fftSize / 2,
  }))
}

function melPowers(power: Float64Array, filters: readonly { left: number; center: number; right: number }[]): Float64Array {
  const result = new Float64Array(filters.length)
  filters.forEach((filter, filterIndex) => {
    let sum = 0
    for (let bin = filter.left; bin <= filter.right; bin += 1) {
      const binPower = power[bin] ?? 0
      let weight = 0
      if (bin <= filter.center && filter.center > filter.left) weight = (bin - filter.left) / (filter.center - filter.left)
      else if (bin > filter.center && filter.right > filter.center) weight = (filter.right - bin) / (filter.right - filter.center)
      else if (filter.left === filter.center && bin === filter.center) weight = 1
      else if (filter.center === filter.right && bin === filter.center) weight = 1
      sum += binPower * Math.max(0, weight)
    }
    result[filterIndex] = sum
  })
  return result
}

function dct(logMel: Float64Array, coefficientCount: number): Float64Array {
  const result = new Float64Array(coefficientCount)
  const scale0 = Math.sqrt(1 / logMel.length)
  const scale = Math.sqrt(2 / logMel.length)
  for (let coefficient = 0; coefficient < coefficientCount; coefficient += 1) {
    let sum = 0
    for (let band = 0; band < logMel.length; band += 1) {
      sum += (logMel[band] ?? 0) * Math.cos(Math.PI * coefficient * (band + 0.5) / logMel.length)
    }
    result[coefficient] = sum * (coefficient === 0 ? scale0 : scale)
  }
  return result
}

function spectralFeatures(
  power: Float64Array,
  sampleRate: number,
  fftSize: number,
  rolloffFraction: number,
): { centroidHz: number; rolloffHz: number; flatness: number } {
  let totalPower = 0
  let weightedFrequency = 0
  let logPowerSum = 0
  const epsilon = 1e-20
  for (let bin = 0; bin < power.length; bin += 1) {
    const value = power[bin] ?? 0
    const frequency = bin * sampleRate / fftSize
    totalPower += value
    weightedFrequency += frequency * value
    logPowerSum += Math.log(value + epsilon)
  }
  const centroidHz = totalPower > epsilon ? weightedFrequency / totalPower : 0
  const target = totalPower * rolloffFraction
  let cumulative = 0
  let rolloffBin = 0
  for (let bin = 0; bin < power.length; bin += 1) {
    cumulative += power[bin] ?? 0
    if (cumulative >= target) {
      rolloffBin = bin
      break
    }
  }
  const arithmeticMean = totalPower / power.length
  const geometricMean = Math.exp(logPowerSum / power.length)
  const flatness = arithmeticMean > epsilon ? geometricMean / arithmeticMean : 0
  return {
    centroidHz,
    rolloffHz: rolloffBin * sampleRate / fftSize,
    flatness,
  }
}

function moments(values: Float32Array): AudioDescriptorMoments {
  if (values.length === 0) return { mean: 0, standardDeviation: 0 }
  let mean = 0
  for (const value of values) mean += value
  mean /= values.length
  let variance = 0
  for (const value of values) {
    const difference = value - mean
    variance += difference * difference
  }
  variance /= values.length
  return { mean, standardDeviation: Math.sqrt(variance) }
}

function buildEnvelope(samples: Float32Array, sampleRate: number, windowMs: number, hopMs: number): {
  rms: Float32Array
  peak: Float32Array
} {
  const windowSize = Math.max(1, Math.round(sampleRate * windowMs / 1000))
  const hopSize = Math.max(1, Math.round(sampleRate * hopMs / 1000))
  const count = frameCount(samples.length, windowSize, hopSize)
  const rms = new Float32Array(count)
  const peak = new Float32Array(count)
  for (let frame = 0; frame < count; frame += 1) {
    const start = frame * hopSize
    let sumSquares = 0
    let maximum = 0
    let actualCount = 0
    for (let index = 0; index < windowSize && start + index < samples.length; index += 1) {
      const value = samples[start + index] ?? 0
      sumSquares += value * value
      maximum = Math.max(maximum, Math.abs(value))
      actualCount += 1
    }
    rms[frame] = actualCount > 0 ? Math.sqrt(sumSquares / actualCount) : 0
    peak[frame] = maximum
  }
  return { rms, peak }
}

function buildSpectralResolution(
  samples: Float32Array,
  sampleRate: number,
  fftSize: number,
  config: AudioDescriptorConfig,
): AudioSpectralResolutionDescriptor {
  const hopSize = Math.max(1, Math.round(fftSize * config.spectralHopRatio))
  const totalFrameCount = frameCount(samples.length, fftSize, hopSize)
  const sampledIndices = sampledFrameIndices(totalFrameCount, config.maxSpectralFrames)
  const sampledStarts = new Uint32Array(sampledIndices.length)
  const bins = fftSize / 2 + 1
  const logMagnitude = new Float32Array(sampledIndices.length * bins)
  const logMelSpectrum = new Float32Array(sampledIndices.length * config.melBands)
  const mfcc = new Float32Array(sampledIndices.length * config.mfccCount)
  const centroid = new Float32Array(sampledIndices.length)
  const rolloff = new Float32Array(sampledIndices.length)
  const flatness = new Float32Array(sampledIndices.length)
  const maximumHz = config.maximumHz ?? sampleRate / 2
  const filters = createMelFilters(fftSize, sampleRate, config.melBands, config.minimumHz, maximumHz)

  sampledIndices.forEach((frameIndex, outputFrame) => {
    const start = frameIndex * hopSize
    sampledStarts[outputFrame] = start
    const power = fftPower(samples, start, fftSize)
    for (let bin = 0; bin < bins; bin += 1) {
      logMagnitude[outputFrame * bins + bin] = Math.log((power[bin] ?? 0) + 1e-12)
    }
    const mel = melPowers(power, filters)
    const logMel = new Float64Array(mel.length)
    for (let band = 0; band < mel.length; band += 1) {
      const value = Math.log((mel[band] ?? 0) + 1e-12)
      logMel[band] = value
      logMelSpectrum[outputFrame * config.melBands + band] = value
    }
    const coefficients = dct(logMel, config.mfccCount)
    for (let coefficient = 0; coefficient < coefficients.length; coefficient += 1) {
      mfcc[outputFrame * config.mfccCount + coefficient] = coefficients[coefficient] ?? 0
    }
    const features = spectralFeatures(power, sampleRate, fftSize, config.rolloffFraction)
    centroid[outputFrame] = features.centroidHz
    rolloff[outputFrame] = features.rolloffHz
    flatness[outputFrame] = features.flatness
  })

  return {
    fftSize,
    hopSize,
    totalFrameCount,
    sampledFrameStarts: sampledStarts,
    logMagnitude,
    logMelSpectrum,
    mfcc,
    spectralCentroidHz: centroid,
    spectralRolloffHz: rolloff,
    spectralFlatness: flatness,
    centroidMoments: moments(centroid),
    rolloffMoments: moments(rolloff),
    flatnessMoments: moments(flatness),
  }
}

export function createAudioDescriptorProfile(
  samples: Float32Array,
  sampleRate: number,
  config: AudioDescriptorConfig = DEFAULT_AUDIO_DESCRIPTOR_CONFIG,
): AudioDescriptorProfile {
  validateSamples(samples, sampleRate)
  validateConfig(config, sampleRate)
  const snapshot = cloneConfig(config)
  const envelope = buildEnvelope(samples, sampleRate, snapshot.envelopeWindowMs, snapshot.envelopeHopMs)
  return {
    schema: AUDIO_DESCRIPTOR_SCHEMA,
    sampleRate,
    sampleCount: samples.length,
    durationSeconds: samples.length / sampleRate,
    config: snapshot,
    amplitudeEnvelopeRms: envelope.rms,
    amplitudeEnvelopePeak: envelope.peak,
    spectral: snapshot.fftSizes.map((fftSize) => buildSpectralResolution(samples, sampleRate, fftSize, snapshot)),
  }
}
