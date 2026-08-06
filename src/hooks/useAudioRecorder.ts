import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  chooseAudioInputDevice,
  chooseCompressedRecordingMimeType,
  createAudioInputConstraints,
  createRecordingFilename,
  encodePcm16Wav,
  INITIAL_AUDIO_RECORDER_STATE,
  isFm1AudioDeviceLabel,
  mergePcmChunks,
  reduceAudioRecorderState,
  toAudioInputDevices,
  type AudioInputDevice,
  type RecordingFilenameMetadata,
} from '../audio/recorder'

export type AudioRecordingFormat = 'wav' | 'compressed'

export interface AudioTrackDiagnostics {
  label: string
  deviceId: string | null
  sampleRate: number | null
  channelCount: number | null
  echoCancellation: boolean | null
  noiseSuppression: boolean | null
  autoGainControl: boolean | null
}

export interface AudioRecordingResult {
  blob: Blob
  durationMs: number
  filename: string
  mimeType: string
}

interface UseAudioRecorderOptions {
  filenameMetadata: Omit<RecordingFilenameMetadata, 'timestamp'>
  onSafetyStop?: () => void
}

const METER_FFT_SIZE = 2048
const RECORDING_BUFFER_SIZE = 4096
const CLIPPING_THRESHOLD = 0.98

function mediaErrorMessage(cause: unknown): string {
  if (cause instanceof DOMException) {
    if (cause.name === 'NotAllowedError' || cause.name === 'SecurityError') {
      return 'Microphone permission was denied. Allow microphone access for this site and try again.'
    }
    if (cause.name === 'NotFoundError' || cause.name === 'DevicesNotFoundError') {
      return 'No audio input device is available.'
    }
    if (cause.name === 'NotReadableError' || cause.name === 'TrackStartError') {
      return 'The selected audio input is already in use or could not be opened.'
    }
    if (cause.name === 'OverconstrainedError') {
      return 'The selected audio input no longer supports the requested settings.'
    }
  }
  return cause instanceof Error ? cause.message : 'The audio input could not be opened.'
}

function readDiagnostics(track: MediaStreamTrack, context: AudioContext): AudioTrackDiagnostics {
  const settings = track.getSettings()
  return {
    label: track.label || 'Audio input',
    deviceId: settings.deviceId ?? null,
    sampleRate: settings.sampleRate ?? context.sampleRate ?? null,
    channelCount: settings.channelCount ?? null,
    echoCancellation: settings.echoCancellation ?? null,
    noiseSuppression: settings.noiseSuppression ?? null,
    autoGainControl: settings.autoGainControl ?? null,
  }
}

function labelsAreVisible(devices: readonly AudioInputDevice[]): boolean {
  return devices.some((device) => device.label !== 'Audio input')
}

export function useAudioRecorder({ filenameMetadata, onSafetyStop }: UseAudioRecorderOptions) {
  const supported = useMemo(
    () => typeof navigator !== 'undefined'
      && Boolean(navigator.mediaDevices?.getUserMedia)
      && typeof AudioContext !== 'undefined',
    [],
  )
  const [state, dispatch] = useReducer(reduceAudioRecorderState, INITIAL_AUDIO_RECORDER_STATE)
  const [devices, setDevices] = useState<readonly AudioInputDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<AudioTrackDiagnostics | null>(null)
  const [level, setLevel] = useState(0)
  const [clipping, setClipping] = useState(false)
  const [monitoring, setMonitoringState] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [result, setResult] = useState<AudioRecordingResult | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const monitorGainRef = useRef<GainNode | null>(null)
  const meterFrameRef = useRef<number | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const processorSinkRef = useRef<GainNode | null>(null)
  const pcmChunksRef = useRef<Float32Array[][]>([])
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recorderChunksRef = useRef<Blob[]>([])
  const compressedMimeTypeRef = useRef<string | null>(null)
  const recordingFormatRef = useRef<AudioRecordingFormat | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const elapsedTimerRef = useRef<number | null>(null)
  const filenameMetadataRef = useRef(filenameMetadata)
  const safetyStopRef = useRef(onSafetyStop)
  const manualDeviceSelectionRef = useRef(false)

  filenameMetadataRef.current = filenameMetadata
  safetyStopRef.current = onSafetyStop

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current !== null) window.clearInterval(elapsedTimerRef.current)
    elapsedTimerRef.current = null
  }, [])

  const stopRecordingNodes = useCallback(() => {
    const processor = processorRef.current
    if (processor) {
      processor.onaudioprocess = null
      try {
        sourceRef.current?.disconnect(processor)
      } catch {
        // The source may already have been disconnected during device teardown.
      }
      processor.disconnect()
    }
    processorSinkRef.current?.disconnect()
    processorRef.current = null
    processorSinkRef.current = null
  }, [])

  const stopMeter = useCallback(() => {
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current)
    meterFrameRef.current = null
    setLevel(0)
    setClipping(false)
  }, [])

  const releaseStream = useCallback(() => {
    stopElapsedTimer()
    stopRecordingNodes()
    stopMeter()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    recorderRef.current = null
    recorderChunksRef.current = []
    recordingFormatRef.current = null
    sourceRef.current?.disconnect()
    analyserRef.current?.disconnect()
    monitorGainRef.current?.disconnect()
    sourceRef.current = null
    analyserRef.current = null
    monitorGainRef.current = null
    const stream = streamRef.current
    streamRef.current = null
    for (const track of stream?.getTracks() ?? []) track.stop()
    const context = contextRef.current
    contextRef.current = null
    if (context && context.state !== 'closed') void context.close()
    pcmChunksRef.current = []
    setDiagnostics(null)
    setMonitoringState(false)
    setElapsedMs(0)
  }, [stopElapsedTimer, stopMeter, stopRecordingNodes])

  const failSafely = useCallback((message: string, deviceRemoved = false) => {
    safetyStopRef.current?.()
    releaseStream()
    dispatch(deviceRemoved ? { type: 'device-removed', message } : { type: 'failure', message })
    setStatus(null)
  }, [releaseStream])

  const setSelectedDeviceId = useCallback((deviceId: string | null) => {
    manualDeviceSelectionRef.current = true
    setSelectedDeviceIdState(deviceId)
  }, [])

  const refreshDevices = useCallback(async (): Promise<readonly AudioInputDevice[]> => {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    const nextDevices = toAudioInputDevices(await navigator.mediaDevices.enumerateDevices())
    setDevices(nextDevices)
    setSelectedDeviceIdState((current) => {
      if (current && nextDevices.some((device) => device.deviceId === current)) return current
      if (manualDeviceSelectionRef.current) return null
      if (!labelsAreVisible(nextDevices)) return null
      return chooseAudioInputDevice(nextDevices, null)
    })
    return nextDevices
  }, [])

  const startMeter = useCallback((analyser: AnalyserNode) => {
    const samples = new Float32Array(analyser.fftSize)
    const update = () => {
      analyser.getFloatTimeDomainData(samples)
      let sum = 0
      let peak = 0
      for (const sample of samples) {
        sum += sample * sample
        peak = Math.max(peak, Math.abs(sample))
      }
      setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 2.8))
      setClipping(peak >= CLIPPING_THRESHOLD)
      meterFrameRef.current = requestAnimationFrame(update)
    }
    stopMeter()
    meterFrameRef.current = requestAnimationFrame(update)
  }, [stopMeter])

  const attachStream = useCallback((stream: MediaStream) => {
    releaseStream()
    const track = stream.getAudioTracks()[0]
    if (!track) {
      for (const currentTrack of stream.getTracks()) currentTrack.stop()
      throw new Error('The selected device did not provide an audio track.')
    }

    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = METER_FFT_SIZE
    analyser.smoothingTimeConstant = 0.75
    source.connect(analyser)

    streamRef.current = stream
    contextRef.current = context
    sourceRef.current = source
    analyserRef.current = analyser
    setDiagnostics(readDiagnostics(track, context))
    track.addEventListener('ended', () => {
      if (streamRef.current === stream) failSafely('The selected audio input was disconnected.', true)
    }, { once: true })
    startMeter(analyser)
  }, [failSafely, releaseStream, startMeter])

  const connect = useCallback(async () => {
    if (!supported || !navigator.mediaDevices?.getUserMedia) {
      dispatch({ type: 'failure', message: 'This browser does not expose the required Web Audio input APIs.' })
      return
    }

    dispatch({ type: 'permission-requested' })
    setStatus(null)
    setResult(null)

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia(createAudioInputConstraints(selectedDeviceId))
      const availableDevices = await refreshDevices()
      const suggestedDeviceId = manualDeviceSelectionRef.current
        ? selectedDeviceId
        : chooseAudioInputDevice(availableDevices, null)
      const openedDeviceId = stream.getAudioTracks()[0]?.getSettings().deviceId ?? null

      if (suggestedDeviceId && openedDeviceId !== suggestedDeviceId) {
        for (const track of stream.getTracks()) track.stop()
        stream = await navigator.mediaDevices.getUserMedia(createAudioInputConstraints(suggestedDeviceId))
      }

      attachStream(stream)
      const connectedDeviceId = stream.getAudioTracks()[0]?.getSettings().deviceId
        ?? suggestedDeviceId
        ?? selectedDeviceId
        ?? 'default'
      setSelectedDeviceIdState(connectedDeviceId)
      dispatch({ type: 'permission-granted', deviceId: connectedDeviceId })
      setStatus(isFm1AudioDeviceLabel(stream.getAudioTracks()[0]?.label ?? '')
        ? 'FM-1-labelled audio input connected. Physical synth-audio verification is still required.'
        : 'Audio input connected. Select the FM-1-labelled input manually when available.')
    } catch (cause) {
      for (const track of stream?.getTracks() ?? []) track.stop()
      const message = mediaErrorMessage(cause)
      releaseStream()
      safetyStopRef.current?.()
      if (cause instanceof DOMException && (cause.name === 'NotAllowedError' || cause.name === 'SecurityError')) {
        dispatch({ type: 'permission-denied', message })
      } else {
        dispatch({ type: 'failure', message })
      }
    }
  }, [attachStream, refreshDevices, releaseStream, selectedDeviceId, supported])

  const startElapsedTimer = useCallback(() => {
    stopElapsedTimer()
    const startedAt = performance.now()
    startedAtRef.current = startedAt
    setElapsedMs(0)
    elapsedTimerRef.current = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 200)
  }, [stopElapsedTimer])

  const finishElapsedTimer = useCallback((): number => {
    const duration = startedAtRef.current === null ? 0 : performance.now() - startedAtRef.current
    stopElapsedTimer()
    startedAtRef.current = null
    setElapsedMs(duration)
    return duration
  }, [stopElapsedTimer])

  const startWavRecording = useCallback(() => {
    const context = contextRef.current
    const source = sourceRef.current
    if (!context || !source) throw new Error('Connect an audio input before recording.')

    const requestedChannels = Math.max(1, diagnostics?.channelCount ?? 2)
    const processor = context.createScriptProcessor(RECORDING_BUFFER_SIZE, requestedChannels, requestedChannels)
    const sink = context.createGain()
    sink.gain.value = 0
    pcmChunksRef.current = []
    processor.onaudioprocess = (event) => {
      if (pcmChunksRef.current.length === 0) {
        pcmChunksRef.current = Array.from({ length: event.inputBuffer.numberOfChannels }, () => [])
      }
      const availableChannels = Math.min(event.inputBuffer.numberOfChannels, pcmChunksRef.current.length)
      for (let channel = 0; channel < availableChannels; channel += 1) {
        pcmChunksRef.current[channel]?.push(Float32Array.from(event.inputBuffer.getChannelData(channel)))
      }
    }
    source.connect(processor)
    processor.connect(sink)
    sink.connect(context.destination)
    processorRef.current = processor
    processorSinkRef.current = sink
  }, [diagnostics?.channelCount])

  const startCompressedRecording = useCallback(() => {
    const stream = streamRef.current
    if (!stream || typeof MediaRecorder === 'undefined') {
      throw new Error('This browser does not provide compressed audio recording.')
    }
    const mimeType = chooseCompressedRecordingMimeType(MediaRecorder.isTypeSupported.bind(MediaRecorder))
    if (!mimeType) throw new Error('No supported WebM/Opus or Ogg/Opus recording format was found.')

    const recorder = new MediaRecorder(stream, { mimeType })
    recorderChunksRef.current = []
    compressedMimeTypeRef.current = mimeType
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) recorderChunksRef.current.push(event.data)
    })
    recorderRef.current = recorder
    recorder.start(250)
  }, [])

  const startRecording = useCallback((format: AudioRecordingFormat = 'wav') => {
    if (!streamRef.current || (state.phase !== 'ready' && state.phase !== 'stopped')) return
    setResult(null)
    setStatus(null)
    setClipping(false)

    try {
      if (format === 'compressed') startCompressedRecording()
      else startWavRecording()
      recordingFormatRef.current = format
      startElapsedTimer()
      dispatch({ type: 'recording-started' })
    } catch (cause) {
      failSafely(cause instanceof Error ? cause.message : 'Recording could not be started.')
    }
  }, [failSafely, startCompressedRecording, startElapsedTimer, startWavRecording, state.phase])

  const stopRecording = useCallback(async () => {
    if (state.phase !== 'recording') return
    const durationMs = finishElapsedTimer()
    const format = recordingFormatRef.current

    try {
      if (format === 'compressed') {
        const recorder = recorderRef.current
        if (!recorder) throw new Error('The compressed recorder is unavailable.')
        const blob = await new Promise<Blob>((resolve, reject) => {
          recorder.addEventListener('error', () => reject(new Error('The browser compressed recorder failed.')), { once: true })
          recorder.addEventListener('stop', () => {
            resolve(new Blob(recorderChunksRef.current, { type: compressedMimeTypeRef.current ?? 'audio/webm' }))
          }, { once: true })
          recorder.stop()
        })
        const mimeType = compressedMimeTypeRef.current ?? blob.type ?? 'audio/webm'
        const extension = mimeType.includes('ogg') ? 'ogg' : 'webm'
        setResult({
          blob,
          durationMs,
          filename: createRecordingFilename(filenameMetadataRef.current, extension),
          mimeType,
        })
        recorderRef.current = null
        recorderChunksRef.current = []
      } else {
        stopRecordingNodes()
        const context = contextRef.current
        if (!context) throw new Error('The audio context closed before the WAV could be created.')
        const channels = pcmChunksRef.current
          .filter((chunks) => chunks.length > 0)
          .map(mergePcmChunks)
        if (channels.length === 0) throw new Error('No PCM audio frames were captured.')
        const bytes = encodePcm16Wav(channels, context.sampleRate)
        const wavBytes = Uint8Array.from(bytes)
        setResult({
          blob: new Blob([wavBytes.buffer], { type: 'audio/wav' }),
          durationMs,
          filename: createRecordingFilename(filenameMetadataRef.current, 'wav'),
          mimeType: 'audio/wav',
        })
        pcmChunksRef.current = []
      }
      recordingFormatRef.current = null
      dispatch({ type: 'recording-stopped' })
      setStatus('Recording stopped. Audio remains only in memory until you save it.')
    } catch (cause) {
      failSafely(cause instanceof Error ? cause.message : 'Recording could not be finalized.')
    }
  }, [failSafely, finishElapsedTimer, state.phase, stopRecordingNodes])

  const cancelRecording = useCallback(() => {
    if (state.phase !== 'recording' && state.phase !== 'stopped') return
    stopElapsedTimer()
    startedAtRef.current = null
    setElapsedMs(0)
    stopRecordingNodes()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    recorderRef.current = null
    recorderChunksRef.current = []
    pcmChunksRef.current = []
    recordingFormatRef.current = null
    setResult(null)
    dispatch({ type: 'recording-cancelled' })
    setStatus('Recording cancelled. No audio was saved.')
  }, [state.phase, stopElapsedTimer, stopRecordingNodes])

  const setMonitoring = useCallback(async (enabled: boolean) => {
    const context = contextRef.current
    const source = sourceRef.current
    if (!context || !source) return
    try {
      if (enabled) {
        if (monitorGainRef.current) return
        if (context.state === 'suspended') await context.resume()
        const gain = context.createGain()
        gain.gain.value = 1
        source.connect(gain)
        gain.connect(context.destination)
        monitorGainRef.current = gain
        setMonitoringState(true)
      } else {
        monitorGainRef.current?.disconnect()
        monitorGainRef.current = null
        setMonitoringState(false)
      }
    } catch (cause) {
      failSafely(cause instanceof Error ? cause.message : 'Audio monitoring failed.')
    }
  }, [failSafely])

  const disconnect = useCallback(() => {
    safetyStopRef.current?.()
    releaseStream()
    dispatch({ type: 'disconnect' })
    setResult(null)
    setStatus('Audio input disconnected.')
  }, [releaseStream])

  const clearResult = useCallback(() => {
    setResult(null)
    if (state.phase === 'stopped') dispatch({ type: 'recording-cancelled' })
  }, [state.phase])

  useEffect(() => {
    if (!supported) return
    void refreshDevices().catch(() => undefined)
    const handleDeviceChange = () => {
      void refreshDevices().then((nextDevices) => {
        const connectedId = streamRef.current?.getAudioTracks()[0]?.getSettings().deviceId
        if (connectedId && !nextDevices.some((device) => device.deviceId === connectedId)) {
          failSafely('The selected audio input was removed. Reconnect it before recording again.', true)
        }
      }).catch((cause: unknown) => failSafely(mediaErrorMessage(cause)))
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [failSafely, refreshDevices, supported])

  useEffect(() => () => {
    safetyStopRef.current?.()
    releaseStream()
  }, [releaseStream])

  const compressedMimeType = useMemo(() => {
    if (typeof MediaRecorder === 'undefined') return null
    return chooseCompressedRecordingMimeType(MediaRecorder.isTypeSupported.bind(MediaRecorder))
  }, [])

  return {
    supported,
    state,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    diagnostics,
    level,
    clipping,
    monitoring,
    elapsedMs,
    result,
    status,
    compressedMimeType,
    connect,
    disconnect,
    refreshDevices,
    startRecording,
    stopRecording,
    cancelRecording,
    setMonitoring,
    clearResult,
  }
}
