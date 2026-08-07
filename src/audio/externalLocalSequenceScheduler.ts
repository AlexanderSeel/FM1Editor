import {
  getSequenceClockMode,
  getStepNotes,
  validateSequence,
  type Fm1Sequence,
} from '../domain/sequence'
import { buildPlaybackSteps, type PlaybackStep } from '../domain/sequenceOperations'
import type { LocalSequenceNoteTarget } from './localSequenceScheduler'

export interface ExternalLocalSequenceCallbacks {
  onStep?: (step: PlaybackStep, timestamp: number) => void
  onClock?: (estimatedBpm: number, pulseIntervalMs: number) => void
  onTransport?: (state: 'started' | 'continued' | 'stopped') => void
  onError?: (error: Error) => void
}

export interface ExternalLocalSequencePlayer {
  readonly running: boolean
  handleMidiMessage(data: ArrayLike<number>, timestamp?: number): void
  stop(): void
}

function sharesNote(left: PlaybackStep | undefined, right: PlaybackStep | undefined, note: number): boolean {
  return Boolean(
    left?.step.enabled
    && left.step.tie
    && right?.step.enabled
    && getStepNotes(right.step).includes(note),
  )
}

function errorOf(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('External-clock local sequence playback failed')
}

export function createExternalLocalSequencePlayer(
  target: LocalSequenceNoteTarget,
  sequence: Fm1Sequence,
  callbacks: ExternalLocalSequenceCallbacks = {},
): ExternalLocalSequencePlayer {
  validateSequence(sequence)
  if (getSequenceClockMode(sequence) !== 'external') {
    throw new Error('External-clock local sequence playback requires sequence clockMode "external".')
  }

  const playback = buildPlaybackSteps(sequence, 0)
  let running = false
  let pulseCount = 0
  let cursor = 0
  let lastClockTimestamp: number | null = null
  let pulseIntervalMs = 60_000 / sequence.bpm / 24
  let generation = 0
  const activeNotes = new Set<number>()
  const noteOffTimers = new Map<number, ReturnType<typeof setTimeout>>()

  const clearNoteTimer = (note: number) => {
    const timer = noteOffTimers.get(note)
    if (timer) clearTimeout(timer)
    noteOffTimers.delete(note)
  }

  const fail = (cause: unknown) => {
    const error = errorOf(cause)
    generation += 1
    running = false
    noteOffTimers.forEach((timer) => clearTimeout(timer))
    noteOffTimers.clear()
    activeNotes.clear()
    Promise.resolve(target.allNotesOff()).catch(() => undefined)
    callbacks.onError?.(error)
  }

  const invoke = (action: Promise<void> | void) => {
    Promise.resolve(action).catch(fail)
  }

  const releaseNote = (note: number) => {
    clearNoteTimer(note)
    if (!activeNotes.delete(note)) return
    invoke(target.noteOff(note))
  }

  const releaseAll = () => {
    generation += 1
    noteOffTimers.forEach((timer) => clearTimeout(timer))
    noteOffTimers.clear()
    activeNotes.clear()
    Promise.resolve(target.allNotesOff()).catch((cause: unknown) => callbacks.onError?.(errorOf(cause)))
  }

  const triggerStep = (timestamp: number) => {
    if (playback.length === 0) return
    const current = playback[cursor % playback.length]
    const previous = playback[(cursor - 1 + playback.length) % playback.length]
    const next = playback[(cursor + 1) % playback.length]
    if (!current) return

    ;[...activeNotes].forEach((note) => {
      if (!sharesNote(previous, current, note)) releaseNote(note)
    })

    if (current.step.enabled) {
      for (const note of getStepNotes(current.step)) {
        if (!activeNotes.has(note)) {
          activeNotes.add(note)
          invoke(target.noteOn(note, current.step.velocity))
        }
        if (!sharesNote(current, next, note)) {
          clearNoteTimer(note)
          const currentGeneration = generation
          const gateMs = Math.max(1, pulseIntervalMs * 6 * (current.step.gate / 100))
          noteOffTimers.set(note, setTimeout(() => {
            if (currentGeneration !== generation) return
            releaseNote(note)
          }, gateMs))
        }
      }
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
      pulseIntervalMs = 60_000 / sequence.bpm / 24
      callbacks.onTransport?.('started')
      return
    }
    if (status === 0xfb) {
      running = true
      callbacks.onTransport?.('continued')
      return
    }
    if (status === 0xfc) {
      running = false
      releaseAll()
      callbacks.onTransport?.('stopped')
      return
    }
    if (status !== 0xf8 || !running) return

    if (lastClockTimestamp !== null) {
      const interval = timestamp - lastClockTimestamp
      if (interval > 0 && interval < 1_000) pulseIntervalMs = pulseIntervalMs * 0.8 + interval * 0.2
    }
    lastClockTimestamp = timestamp
    callbacks.onClock?.(60_000 / (pulseIntervalMs * 24), pulseIntervalMs)
    if (pulseCount % 6 === 0) triggerStep(timestamp)
    pulseCount += 1
  }

  return {
    get running() {
      return running
    },
    handleMidiMessage,
    stop() {
      running = false
      releaseAll()
    },
  }
}
