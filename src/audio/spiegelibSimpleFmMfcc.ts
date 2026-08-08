export const SPIEGELIB_MFCC_SAMPLE_RATE = 44_100
export const SPIEGELIB_MFCC_SAMPLE_COUNT = 44_100
export const SPIEGELIB_MFCC_FFT_SIZE = 2_048
export const SPIEGELIB_MFCC_HOP_SIZE = 1_024
export const SPIEGELIB_MFCC_MEL_BANDS = 128
export const SPIEGELIB_MFCC_COUNT = 13
export const SPIEGELIB_MFCC_FRAME_COUNT = 44
export const SPIEGELIB_MFCC_FLAT_SIZE = SPIEGELIB_MFCC_FRAME_COUNT * SPIEGELIB_MFCC_COUNT

function reflectSample(samples: Float32Array, index: number): number {
  const length = samples.length
  if (index >= 0 && index < length) return samples[index] ?? 0
  if (length < 2) return samples[0] ?? 0
  let reflected = index
  while (reflected < 0 || reflected >= length) {
    if (reflected < 0) reflected = -reflected
    else reflected = 2 * length - 2 - reflected
  }
  return samples[reflected] ?? 0
}

function periodicHann(index: number, size: number): number {
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * index / size)
}

function fftPowerFrame(samples: Float32Array, centeredStart: number): Float64Array {
  const size = SPIEGELIB_MFCC_FFT_SIZE
  const half = size >> 1
  const real = new Float64Array(size)
  const imaginary = new Float64Array(size)
  for (let index = 0; index < size; index += 1) {
    real[index] = reflectSample(samples, centeredStart + index) * periodicHann(index, size)
  }

  let target = 0
  for (let index = 1; index < size; index += 1) {
    let bit = half
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

  const power = new Float64Array(half + 1)
  for (let bin = 0; bin <= half; bin += 1) {
    const re = real[bin] ?? 0
    const im = imaginary[bin] ?? 0
    power[bin] = re * re + im * im
  }
  return power
}

// Librosa 0.7.x Slaney mel conversion (htk=False).
function hzToSlaneyMel(frequency: number): number {
  const fMin = 0
  const fSp = 200 / 3
  const minLogHz = 1_000
  const minLogMel = (minLogHz - fMin) / fSp
  const logStep = Math.log(6.4) / 27
  if (frequency < minLogHz) return (frequency - fMin) / fSp
  return minLogMel + Math.log(frequency / minLogHz) / logStep
}

function slaneyMelToHz(mel: number): number {
  const fMin = 0
  const fSp = 200 / 3
  const minLogHz = 1_000
  const minLogMel = (minLogHz - fMin) / fSp
  const logStep = Math.log(6.4) / 27
  if (mel < minLogMel) return fMin + fSp * mel
  return minLogHz * Math.exp(logStep * (mel - minLogMel))
}

function createLibrosa072MelBasis(): readonly Float32Array[] {
  const nFft = SPIEGELIB_MFCC_FFT_SIZE
  const bins = nFft / 2 + 1
  const melMin = hzToSlaneyMel(0)
  const melMax = hzToSlaneyMel(SPIEGELIB_MFCC_SAMPLE_RATE / 2)
  const melFrequencies = new Float64Array(SPIEGELIB_MFCC_MEL_BANDS + 2)
  for (let index = 0; index < melFrequencies.length; index += 1) {
    const mel = melMin + (melMax - melMin) * index / (melFrequencies.length - 1)
    melFrequencies[index] = slaneyMelToHz(mel)
  }

  const filters: Float32Array[] = []
  for (let band = 0; band < SPIEGELIB_MFCC_MEL_BANDS; band += 1) {
    const lowerFrequency = melFrequencies[band] ?? 0
    const centerFrequency = melFrequencies[band + 1] ?? 0
    const upperFrequency = melFrequencies[band + 2] ?? 0
    const lowerWidth = centerFrequency - lowerFrequency
    const upperWidth = upperFrequency - centerFrequency
    const energyNormalization = 2 / (upperFrequency - lowerFrequency)
    const filter = new Float32Array(bins)
    for (let bin = 0; bin < bins; bin += 1) {
      const frequency = bin * SPIEGELIB_MFCC_SAMPLE_RATE / nFft
      const lower = lowerWidth > 0 ? (frequency - lowerFrequency) / lowerWidth : 0
      const upper = upperWidth > 0 ? (upperFrequency - frequency) / upperWidth : 0
      filter[bin] = Math.max(0, Math.min(lower, upper)) * energyNormalization
    }
    filters.push(filter)
  }
  return filters
}

const MEL_BASIS = createLibrosa072MelBasis()

function dctOrtho13(logMel: Float64Array): Float64Array {
  const output = new Float64Array(SPIEGELIB_MFCC_COUNT)
  const n = logMel.length
  for (let coefficient = 0; coefficient < SPIEGELIB_MFCC_COUNT; coefficient += 1) {
    let sum = 0
    for (let index = 0; index < n; index += 1) {
      sum += (logMel[index] ?? 0) * Math.cos(Math.PI * coefficient * (index + 0.5) / n)
    }
    output[coefficient] = sum * (coefficient === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n))
  }
  return output
}

export function extractSpiegelibSimpleFmRawMfcc(samples: Float32Array): Float32Array {
  if (samples.length !== SPIEGELIB_MFCC_SAMPLE_COUNT) {
    throw new Error(`SpiegeLib simple-FM MFCC input must contain exactly ${SPIEGELIB_MFCC_SAMPLE_COUNT} samples at ${SPIEGELIB_MFCC_SAMPLE_RATE} Hz.`)
  }
  for (let index = 0; index < samples.length; index += 1) {
    const value = samples[index]
    if (value === undefined || !Number.isFinite(value)) throw new Error(`MFCC input sample ${index} must be finite.`)
  }

  const melPower = Array.from({ length: SPIEGELIB_MFCC_FRAME_COUNT }, () => new Float64Array(SPIEGELIB_MFCC_MEL_BANDS))
  for (let frame = 0; frame < SPIEGELIB_MFCC_FRAME_COUNT; frame += 1) {
    // Librosa center=True pads n_fft/2 samples; this equivalent centered start
    // avoids allocating the 2048-sample reflected padding explicitly.
    const start = frame * SPIEGELIB_MFCC_HOP_SIZE - SPIEGELIB_MFCC_FFT_SIZE / 2
    const power = fftPowerFrame(samples, start)
    for (let band = 0; band < SPIEGELIB_MFCC_MEL_BANDS; band += 1) {
      const filter = MEL_BASIS[band]
      let sum = 0
      for (let bin = 0; bin < power.length; bin += 1) sum += (filter?.[bin] ?? 0) * (power[bin] ?? 0)
      melPower[frame]![band] = sum
    }
  }

  // librosa.power_to_db(ref=1.0, amin=1e-10, top_db=80) applies the
  // top-db floor relative to the global maximum across the full matrix.
  let maximumDb = Number.NEGATIVE_INFINITY
  const logMel = melPower.map((frame) => {
    const values = new Float64Array(frame.length)
    for (let index = 0; index < frame.length; index += 1) {
      const db = 10 * Math.log10(Math.max(1e-10, frame[index] ?? 0))
      values[index] = db
      maximumDb = Math.max(maximumDb, db)
    }
    return values
  })
  const floorDb = maximumDb - 80

  const flattened = new Float32Array(SPIEGELIB_MFCC_FLAT_SIZE)
  for (let frame = 0; frame < SPIEGELIB_MFCC_FRAME_COUNT; frame += 1) {
    const values = logMel[frame]
    if (!values) throw new Error(`Missing MFCC frame ${frame}.`)
    for (let index = 0; index < values.length; index += 1) values[index] = Math.max(values[index] ?? floorDb, floorDb)
    const coefficients = dctOrtho13(values)
    for (let coefficient = 0; coefficient < SPIEGELIB_MFCC_COUNT; coefficient += 1) {
      flattened[frame * SPIEGELIB_MFCC_COUNT + coefficient] = coefficients[coefficient] ?? 0
    }
  }
  return flattened
}
