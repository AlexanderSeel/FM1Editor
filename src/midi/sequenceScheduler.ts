import type { Fm1Sequence } from '../domain/sequence'
import { getSequenceClockMode, getStepNotes, validateSequence } from '../domain/sequence'
import { buildPlaybackSteps, type PlaybackStep } from '../domain/sequenceOperations'
import { encodeAllNotesOff, encodeNoteOff, encodeNoteOn, encodeRealtimeMessage } from './fm1Protocol'
import type { MidiOutputTarget } from './output'

export interface ScheduledMidiEvent {
  timestamp: number
  data: Uint8Array
  timelineIndex?: number
  stepIndex?: number
  patternId?: string
  patternName?: string
  arrangementIndex?: number
  kind: 'start' | 'continue' | 'clock' | 'note-on' | 'note-off' | 'stop'
}

export interface SequenceTimingDiagnostics {
  eventCount: number
  noteOnCount: number
  noteOffCount: number
  clockPulseCount: number
  playbackStepCount: number
  durationMs: number
}

export interface ExternalSequencePlayerCallbacks {
  onStep?: (step: PlaybackStep, timestamp: number) => void
  onClock?: (estimatedBpm: number, pulseIntervalMs: number) => void
  onTransport?: (state: 'started' | 'continued' | 'stopped') => void
}

export interface ExternalSequencePlayer {
  handleMidiMessage(data: ArrayLike<number>, timestamp?: number): void
  stop(): void
}

export function sequenceStepDurationMs(bpm: number): number {
  return 60_000 / bpm / 4
}

function sharesNote(left: PlaybackStep | undefined, right: PlaybackStep | undefined, note: number): boolean {
  return Boolean(
    left?.step.enabled
    && left.step.tie
    && right?.step.enabled
    && getStepNotes(right.step).includes(note),
  )
}

function eventOrder(kind: ScheduledMidiEvent['kind']): number {
  switch (kind) {
    case 'start': return 0
    case 'continue': return 1
    case 'clock': return 2
    case 'note-off': return 3
    case 'note-on': return 4
    case 'stop': return 5
  }
}

export function buildSequenceEvents(sequence: Fm1Sequence, startTimestamp: number, seed = Math.floor(startTimestamp)): ScheduledMidiEvent[] {
  validateSequence(sequence)
  if (getSequenceClockMode(sequence) !== 'internal') return []

  const duration = sequenceStepDurationMs(sequence.bpm)
  const swingOffset = duration * (sequence.swing / 100) * 0.5
  const playback = buildPlaybackSteps(sequence, seed)
  const events: ScheduledMidiEvent[] = [
    { timestamp: startTimestamp, data: encodeRealtimeMessage('start'), kind: 'start' },
  ]

  playback.forEach((playbackStep, timelineIndex) => {
    const offset = timelineIndex * duration + (timelineIndex % 2 === 1 ? swingOffset : 0)
    const noteOnTime = startTimestamp + offset
    const previous = playback[timelineIndex - 1]
    const next = playback[timelineIndex + 1]

    if (sequence.sendMidiClock !== false) {
      for (let pulse = 0; pulse < 6; pulse += 1) {
        events.push({
          timestamp: noteOnTime + pulse * (duration / 6),
          data: encodeRealtimeMessage('clock'),
          timelineIndex,
          stepIndex: playbackStep.sourceStepIndex,
          patternId: playbackStep.patternId,
          patternName: playbackStep.patternName,
          arrangementIndex: playbackStep.arrangementIndex,
          kind: 'clock',
        })
      }
    }

    if (!playbackStep.step.enabled) return
    const gateDuration = duration * (playbackStep.step.gate / 100)
    getStepNotes(playbackStep.step).forEach((note) => {
      if (!sharesNote(previous, playbackStep, note)) {
        events.push({
          timestamp: noteOnTime,
          data: encodeNoteOn(sequence.midiChannel, note, playbackStep.step.velocity),
          timelineIndex,
          stepIndex: playbackStep.sourceStepIndex,
          patternId: playbackStep.patternId,
          patternName: playbackStep.patternName,
          arrangementIndex: playbackStep.arrangementIndex,
          kind: 'note-on',
        })
      }
      if (!sharesNote(playbackStep, next, note)) {
        events.push({
          timestamp: noteOnTime + gateDuration,
          data: encodeNoteOff(sequence.midiChannel, note),
          timelineIndex,
          stepIndex: playbackStep.sourceStepIndex,
          patternId: playbackStep.patternId,
          patternName: playbackStep.patternName,
          arrangementIndex: playbackStep.arrangementIndex,
          kind: 'note-off',
        })
      }
    })
  })

  const lastIndex = Math.max(0, playback.length - 1)
  const finalSwing = lastIndex % 2 === 1 ? swingOffset : 0
  events.push({
    timestamp: startTimestamp + playback.length * duration + finalSwing,
    data: encodeRealtimeMessage('stop'),
    kind: 'stop',
  })

  return events.sort((left, right) => left.timestamp - right.timestamp || eventOrder(left.kind) - eventOrder(right.kind))
}

export function describeSequenceTiming(events: readonly ScheduledMidiEvent[]): SequenceTimingDiagnostics {
  const start = events.find((event) => event.kind === 'start')?.timestamp ?? 0
  const stop = [...events].reverse().find((event) => event.kind === 'stop')?.timestamp ?? start
  const timelineIndexes = new Set(events.flatMap((event) => event.timelineIndex === undefined ? [] : [event.timelineIndex]))
  return {
    eventCount: events.length,
    noteOnCount: events.filter((event) => event.kind === 'note-on').length,
    noteOffCount: events.filter((event) => event.kind === 'note-off').length,
    clockPulseCount: events.filter((event) => event.kind === 'clock').length,
    playbackStepCount: timelineIndexes.size,
    durationMs: Math.max(0, stop - start),
  }
}

export function scheduleSequence(output: MidiOutputTarget, sequence: Fm1Sequence, startDelayMs = 80): ScheduledMidiEvent[] {
  if (getSequenceClockMode(sequence) !== 'internal') {
    throw new Error('External clock mode waits for MIDI Start/Clock/Stop from the selected MIDI input.')
  }
  const startTimestamp = performance.now() + startDelayMs
  const events = buildSequenceEvents(sequence, startTimestamp)
  events.forEach((event) => output.send(event.data, event.timestamp))
  return events
}

export function stopSequence(output: MidiOutputTarget, midiChannel: number): void {
  output.clear?.()
  output.send(encodeAllNotesOff(midiChannel))
  output.send(encodeRealtimeMessage('stop'))
}

export function createExternalSequencePlayer(
  output: MidiOutputTarget,
  sequence: Fm1Sequence,
  callbacks: ExternalSequencePlayerCallbacks = {},
): ExternalSequencePlayer {
  validateSequence(sequence)
  const playback = buildPlaybackSteps(sequence, 0)
  let running = false
  let pulseCount = 0
  let cursor = 0
  let lastClockTimestamp: number | null = null
  let pulseIntervalMs = 60_000 / sequence.bpm / 24
  const activeNotes = new Set<number>()
  const noteOffTimers = new Map<number, ReturnType<typeof setTimeout>>()

  const sendRealtime = (message: 'start' | 'continue' | 'clock' | 'stop') => {
    if (sequence.sendMidiClock !== false) output.send(encodeRealtimeMessage(message))
  }

  const releaseNote = (note: number) => {
    const timer = noteOffTimers.get(note)
    if (timer) clearTimeout(timer)
    noteOffTimers.delete(note)
    if (!activeNotes.delete(note)) return
    output.send(encodeNoteOff(sequence.midiChannel, note))
  }

  const releaseAll = () => {
    ;[...activeNotes].forEach(releaseNote)
    output.send(encodeAllNotesOff(sequence.midiChannel))
  }

  const triggerStep = (timestamp: number) => {
    if (playback.length === 0) return
    const current = playback[cursor % playback.length]
    const previous = playback[(cursor - 1 + playback.length) % playback.length]
    const next = playback[(cursor + 1) % playback.length]
    if (!current) return

    const currentNotes = current.step.enabled ? getStepNotes(current.step) : []
    ;[...activeNotes].forEach((note) => {
      if (!sharesNote(previous, current, note)) releaseNote(note)
    })

    if (current.step.enabled) {
      currentNotes.forEach((note) => {
        if (!activeNotes.has(note)) {
          output.send(encodeNoteOn(sequence.midiChannel, note, current.step.velocity))
          activeNotes.add(note)
        }
        if (!sharesNote(current, next, note)) {
          const existing = noteOffTimers.get(note)
          if (existing) clearTimeout(existing)
          const gateMs = Math.max(1, pulseIntervalMs * 6 * (current.step.gate / 100))
          noteOffTimers.set(note, setTimeout(() => releaseNote(note), gateMs))
        }
      })
    }

    callbacks.onStep?.(current, timestamp)
    cursor = (cursor + 1) % playback.length
  }

  const handleMidiMessage = (data: ArrayLike<number>, timestamp = performance.now()) => {
    const status = data[0]
    if (status === 0xfa) {
      releaseAll()
      running = true
      pulseCount = 0
      cursor = 0
      lastClockTimestamp = null
      sendRealtime('start')
      callbacks.onTransport?.('started')
      return
    }
    if (status === 0xfb) {
      running = true
      sendRealtime('continue')
      callbacks.onTransport?.('continued')
      return
    }
    if (status === 0xfc) {
      running = false
      releaseAll()
      sendRealtime('stop')
      callbacks.onTransport?.('stopped')
      return
    }
    if (status !== 0xf8 || !running) return

    if (lastClockTimestamp !== null) {
      const interval = timestamp - lastClockTimestamp
      if (interval > 0 && interval < 1_000) pulseIntervalMs = pulseIntervalMs * 0.8 + interval * 0.2
    }
    lastClockTimestamp = timestamp
    sendRealtime('clock')
    callbacks.onClock?.(60_000 / (pulseIntervalMs * 24), pulseIntervalMs)
    if (pulseCount % 6 === 0) triggerStep(timestamp)
    pulseCount += 1
  }

  return {
    handleMidiMessage,
    stop: () => {
      running = false
      noteOffTimers.forEach((timer) => clearTimeout(timer))
      noteOffTimers.clear()
      releaseAll()
    },
  }
}
