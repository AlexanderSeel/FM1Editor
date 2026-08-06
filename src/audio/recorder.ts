export interface AudioInputDevice {
  deviceId: string
  groupId: string
  label: string
}

export type AudioRecorderPhase = 'idle' | 'requesting' | 'ready' | 'recording' | 'stopped' | 'error'
export type AudioPermissionState = 'idle' | 'requesting' | 'granted' | 'denied'

export interface AudioRecorderState {
  phase: AudioRecorderPhase
  permission: AudioPermissionState
  connectedDeviceId: string | null
  error: string | null
}

export type AudioRecorderEvent =
  | { type: 'permission-requested' }
  | { type: 'permission-granted'; deviceId: string }
  | { type: 'permission-denied'; message: string }
  | { type: 'recording-started' }
  | { type: 'recording-stopped' }
  | { type: 'recording-cancelled' }
  | { type: 'device-removed'; message?: string }
  | { type: 'disconnect' }
  | { type: 'failure'; message: string }

export interface RecordingFilenameMetadata {
  patchName: string
  targetMode: string
  bank?: string | null
  slot?: number | null
  timestamp?: Date
}

export const INITIAL_AUDIO_RECORDER_STATE: AudioRecorderState = {
  phase: 'idle',
  permission: 'idle',
  connectedDeviceId: null,
  error: null,
}

export function reduceAudioRecorderState(
  state: AudioRecorderState,
  event: AudioRecorderEvent,
): AudioRecorderState {
  switch (event.type) {
    case 'permission-requested':
      return { ...state, phase: 'requesting', permission: 'requesting', error: null }
    case 'permission-granted':
      return {
        phase: 'ready',
        permission: 'granted',
        connectedDeviceId: event.deviceId,
        error: null,
      }
    case 'permission-denied':
      return {
        phase: 'error',
        permission: 'denied',
        connectedDeviceId: null,
        error: event.message,
      }
    case 'recording-started':
      if (state.phase !== 'ready' && state.phase !== 'stopped') return state
      return { ...state, phase: 'recording', error: null }
    case 'recording-stopped':
      if (state.phase !== 'recording') return state
      return { ...state, phase: 'stopped', error: null }
    case 'recording-cancelled':
      if (state.phase !== 'recording' && state.phase !== 'stopped') return state
      return { ...state, phase: state.connectedDeviceId ? 'ready' : 'idle', error: null }
    case 'device-removed':
      return {
        phase: 'error',
        permission: state.permission,
        connectedDeviceId: null,
        error: event.message ?? 'The selected audio input was disconnected.',
      }
    case 'disconnect':
      return {
        phase: 'idle',
        permission: state.permission === 'denied' ? 'denied' : 'idle',
        connectedDeviceId: null,
        error: null,
      }
    case 'failure':
      return { ...state, phase: 'error', error: event.message }
  }
}

export function toAudioInputDevices(devices: Iterable<MediaDeviceInfo>): AudioInputDevice[] {
  return Array.from(devices)
    .filter((device) => device.kind === 'audioinput')
    .map((device) => ({
      deviceId: device.deviceId,
      groupId: device.groupId,
      label: device.label || 'Audio input',
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export function isFm1AudioDeviceLabel(label: string): boolean {
  return /(^|[^a-z0-9])fm[\s_-]?1([^a-z0-9]|$)/i.test(label)
}

export function chooseAudioInputDevice(
  devices: readonly AudioInputDevice[],
  currentDeviceId: string | null,
): string | null {
  if (currentDeviceId && devices.some((device) => device.deviceId === currentDeviceId)) {
    return currentDeviceId
  }
  return devices.find((device) => isFm1AudioDeviceLabel(device.label))?.deviceId
    ?? devices[0]?.deviceId
    ?? null
}

export function createAudioInputConstraints(deviceId: string | null): MediaStreamConstraints {
  const audio: MediaTrackConstraints = {
    autoGainControl: { ideal: false },
    echoCancellation: { ideal: false },
    noiseSuppression: { ideal: false },
  }
  if (deviceId) audio.deviceId = { exact: deviceId }
  return { audio, video: false }
}

export function sanitizeRecordingSegment(value: string, fallback = 'untitled'): string {
  const sanitized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return sanitized || fallback
}

function compactTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function createRecordingFilename(
  metadata: RecordingFilenameMetadata,
  extension: 'wav' | 'webm' | 'ogg',
): string {
  const segments = [
    sanitizeRecordingSegment(metadata.patchName),
    sanitizeRecordingSegment(metadata.targetMode, 'audio'),
  ]
  if (metadata.bank) segments.push(`bank-${sanitizeRecordingSegment(metadata.bank, 'unknown')}`)
  if (metadata.slot !== null && metadata.slot !== undefined) {
    segments.push(`slot-${String(metadata.slot).padStart(2, '0')}`)
  }
  segments.push(compactTimestamp(metadata.timestamp ?? new Date()))
  return `${segments.join('-')}.${extension}`
}

export function chooseCompressedRecordingMimeType(
  isTypeSupported: (mimeType: string) => boolean,
): string | null {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ]
  return candidates.find(isTypeSupported) ?? null
}

export function encodePcm16Wav(
  channels: readonly Float32Array[],
  sampleRate: number,
): Uint8Array {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error('A positive sample rate is required to create a WAV file.')
  }
  if (channels.length === 0) throw new Error('At least one PCM channel is required.')
  if (channels.length > 0xffff) throw new Error('The WAV channel count is invalid.')

  const frameCount = channels[0]?.length ?? 0
  if (channels.some((channel) => channel.length !== frameCount)) {
    throw new Error('All PCM channels must contain the same number of frames.')
  }

  const channelCount = channels.length
  const bytesPerSample = 2
  const dataLength = frameCount * channelCount * bytesPerSample
  const bytes = new Uint8Array(44 + dataLength)
  const view = new DataView(bytes.buffer)

  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, Math.round(sampleRate), true)
  view.setUint32(28, Math.round(sampleRate) * channelCount * bytesPerSample, true)
  view.setUint16(32, channelCount * bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channelIndex]?.[frame] ?? 0))
      const encoded = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, Math.round(encoded), true)
      offset += bytesPerSample
    }
  }

  return bytes
}

export function mergePcmChunks(chunks: readonly Float32Array[]): Float32Array {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const merged = new Float32Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}
