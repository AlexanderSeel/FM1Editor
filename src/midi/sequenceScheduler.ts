import type { Fm1Sequence } from '../domain/sequence'
import { validateSequence } from '../domain/sequence'
import { encodeNoteOff, encodeNoteOn, encodeRealtimeMessage } from './fm1Protocol'
import type { MidiOutputTarget } from './output'

export interface ScheduledMidiEvent {
  timestamp: number
  data: Uint8Array
  stepIndex?: number
  kind: 'start' | 'note-on' | 'note-off' | 'stop'
}

function stepDurationMs(bpm: number): number {
  return 60_000 / bpm / 4
}

export function buildSequenceEvents(sequence: Fm1Sequence, startTimestamp: number): ScheduledMidiEvent[] {
  validateSequence(sequence)
  const duration = stepDurationMs(sequence.bpm)
  const swingOffset = duration * (sequence.swing / 100) * 0.5
  const events: ScheduledMidiEvent[] = [
    { timestamp: startTimestamp, data: encodeRealtimeMessage('start'), kind: 'start' },
  ]

  for (let index = 0; index < sequence.length; index += 1) {
    const step = sequence.steps[index]
    if (!step?.enabled) continue
    const offset = index * duration + (index % 2 === 1 ? swingOffset : 0)
    const noteOnTime = startTimestamp + offset
    const gateDuration = duration * (step.gate / 100)
    const nextStep = sequence.steps[index + 1]
    const tied = step.tie && index + 1 < sequence.length && nextStep?.enabled && nextStep.note === step.note

    events.push({
      timestamp: noteOnTime,
      data: encodeNoteOn(sequence.midiChannel, step.note, step.velocity),
      stepIndex: index,
      kind: 'note-on',
    })

    if (!tied) {
      events.push({
        timestamp: noteOnTime + gateDuration,
        data: encodeNoteOff(sequence.midiChannel, step.note),
        stepIndex: index,
        kind: 'note-off',
      })
    }
  }

  events.push({
    timestamp: startTimestamp + sequence.length * duration + swingOffset,
    data: encodeRealtimeMessage('stop'),
    kind: 'stop',
  })

  return events.sort((left, right) => left.timestamp - right.timestamp || (left.kind === 'note-off' ? -1 : 1))
}

export function scheduleSequence(output: MidiOutputTarget, sequence: Fm1Sequence, startDelayMs = 80): ScheduledMidiEvent[] {
  const startTimestamp = performance.now() + startDelayMs
  const events = buildSequenceEvents(sequence, startTimestamp)
  events.forEach((event) => output.send(event.data, event.timestamp))
  return events
}

export function stopSequence(output: MidiOutputTarget, midiChannel: number): void {
  output.clear?.()
  output.send(encodeControlAllNotesOff(midiChannel))
  output.send(encodeRealtimeMessage('stop'))
}

function encodeControlAllNotesOff(channel: number): Uint8Array {
  if (!Number.isInteger(channel) || channel < 1 || channel > 16) throw new RangeError('MIDI channel must be from 1 to 16.')
  return Uint8Array.of(0xb0 | (channel - 1), 123, 0)
}
