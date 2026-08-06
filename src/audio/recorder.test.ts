import { describe, expect, it } from 'vitest'
import {
  chooseAudioInputDevice,
  createAudioInputConstraints,
  createRecordingFilename,
  encodePcm16Wav,
  INITIAL_AUDIO_RECORDER_STATE,
  reduceAudioRecorderState,
  sanitizeRecordingSegment,
  type AudioInputDevice,
} from './recorder'

const devices: AudioInputDevice[] = [
  { deviceId: 'default', groupId: 'group-a', label: 'Default microphone' },
  { deviceId: 'fm1', groupId: 'group-b', label: 'Microphone (FM-1)' },
]

describe('audio input selection', () => {
  it('suggests an FM-1-labelled device when there is no manual selection', () => {
    expect(chooseAudioInputDevice(devices, null)).toBe('fm1')
  })

  it('preserves a valid manual selection', () => {
    expect(chooseAudioInputDevice(devices, 'default')).toBe('default')
  })

  it('falls back when the selected device is removed', () => {
    expect(chooseAudioInputDevice(devices.slice(0, 1), 'fm1')).toBe('default')
  })
})

describe('audio constraints', () => {
  it('requests the selected device with browser processing disabled where supported', () => {
    expect(createAudioInputConstraints('fm1')).toEqual({
      audio: {
        autoGainControl: { ideal: false },
        deviceId: { exact: 'fm1' },
        echoCancellation: { ideal: false },
        noiseSuppression: { ideal: false },
      },
      video: false,
    })
  })
})

describe('recording filenames', () => {
  it('sanitizes patch metadata and includes mode, bank, slot and timestamp', () => {
    expect(sanitizeRecordingSegment('  Bäsš / Lead  ')).toBe('bass-lead')
    expect(createRecordingFilename({
      patchName: 'Bäsš / Lead',
      targetMode: 'FM-1 USB',
      bank: 'A',
      slot: 3,
      timestamp: new Date('2026-08-06T08:07:09.123Z'),
    }, 'wav')).toBe('bass-lead-fm-1-usb-bank-a-slot-03-20260806T080709Z.wav')
  })
})

describe('PCM WAV encoding', () => {
  it('writes a valid little-endian PCM16 WAV header and interleaved samples', () => {
    const bytes = encodePcm16Wav([
      new Float32Array([-1, 0.5]),
      new Float32Array([1, -0.5]),
    ], 48_000)
    const view = new DataView(bytes.buffer)
    const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length))

    expect(ascii(0, 4)).toBe('RIFF')
    expect(ascii(8, 4)).toBe('WAVE')
    expect(ascii(12, 4)).toBe('fmt ')
    expect(ascii(36, 4)).toBe('data')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(2)
    expect(view.getUint32(24, true)).toBe(48_000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(8)
    expect(view.getInt16(44, true)).toBe(-32_768)
    expect(view.getInt16(46, true)).toBe(32_767)
    expect(view.getInt16(48, true)).toBe(16_384)
    expect(view.getInt16(50, true)).toBe(-16_384)
  })
})

describe('recorder state transitions', () => {
  it('moves through permission, recording, stop and device removal', () => {
    const requesting = reduceAudioRecorderState(INITIAL_AUDIO_RECORDER_STATE, { type: 'permission-requested' })
    const ready = reduceAudioRecorderState(requesting, { type: 'permission-granted', deviceId: 'fm1' })
    const recording = reduceAudioRecorderState(ready, { type: 'recording-started' })
    const stopped = reduceAudioRecorderState(recording, { type: 'recording-stopped' })
    const removed = reduceAudioRecorderState(stopped, { type: 'device-removed' })

    expect(requesting).toMatchObject({ phase: 'requesting', permission: 'requesting' })
    expect(ready).toMatchObject({ phase: 'ready', permission: 'granted', connectedDeviceId: 'fm1' })
    expect(recording.phase).toBe('recording')
    expect(stopped.phase).toBe('stopped')
    expect(removed).toMatchObject({ phase: 'error', connectedDeviceId: null })
  })

  it('records denied permission as a recoverable error state', () => {
    expect(reduceAudioRecorderState(INITIAL_AUDIO_RECORDER_STATE, {
      type: 'permission-denied',
      message: 'Permission denied',
    })).toEqual({
      phase: 'error',
      permission: 'denied',
      connectedDeviceId: null,
      error: 'Permission denied',
    })
  })
})
