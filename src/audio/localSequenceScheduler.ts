import {
  getSequenceClockMode,
  getStepNotes,
  validateSequence,
  type Fm1Sequence,
} from '../domain/sequence'
import { buildPlaybackSteps, type PlaybackStep } from '../domain/sequenceOperations'

export interface LocalSequenceNoteTarget {
  noteOn(note: number, velocity: number): Promise<void> | void
  noteOff(note: number): Promise<void> | void
  allNotesOff(): Promise<void> | void
}

export interface LocalSequenceEvent {
  offsetMs: number
  kind: 'note-on' | 'note-off'
  note: number
  velocity?: number
  timelineIndex: number
  sourceStepIndex: number
  patternId: string
  patternName: string
  arrangementIndex: number
}

export interface LocalSequencePlan {
  events: readonly LocalSequenceEvent[]
  playback: readonly PlaybackStep[]
  durationMs: number
  bpm: number
  swing: number
}

export interface LocalSequencePlayerCallbacks {
  onStep?: (step: PlaybackStep, expectedTimestamp: number) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export interface LocalSequencePlayOptions {
  startDelayMs?: number
  loop?: boolean
  seed?: number
}

export interface LocalSequencePlayer {
  readonly playing: boolean
  play(options?: LocalSequencePlayOptions): void
  stop(): void
}

function stepDurationMs(bpm: number): number {
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

function eventOrder(kind: LocalSequenceEvent['kind']): number {
  return kind === 'note-off' ? 0 : 1
}

export function buildLocalSequencePlan(sequence: Fm1Sequence, seed = 0): LocalSequencePlan {
  validateSequence(sequence)
  if (getSequenceClockMode(sequence) !== 'internal') {
    throw new Error('Local audio sequencer currently supports internal BPM clock only.')
  }

  const duration = stepDurationMs(sequence.bpm)
  const swingOffset = duration * (sequence.swing / 100) * 0.5
  const playback = buildPlaybackSteps(sequence, seed)
  const events: LocalSequenceEvent[] = []

  playback.forEach((playbackStep, timelineIndex) => {
    const stepOffset = timelineIndex * duration + (timelineIndex % 2 === 1 ? swingOffset : 0)
    const previous = playback[timelineIndex - 1]
    const next = playback[timelineIndex + 1]
    if (!playbackStep.step.enabled) return

    const gateDuration = duration * (playbackStep.step.gate / 100)
    for (const note of getStepNotes(playbackStep.step)) {
      if (!sharesNote(previous, playbackStep, note)) {
        events.push({
          offsetMs: stepOffset,
          kind: 'note-on',
          note,
          velocity: playbackStep.step.velocity,
          timelineIndex,
          sourceStepIndex: playbackStep.sourceStepIndex,
          patternId: playbackStep.patternId,
          patternName: playbackStep.patternName,
          arrangementIndex: playbackStep.arrangementIndex,
        })
      }
      if (!sharesNote(playbackStep, next, note)) {
        events.push({
          offsetMs: stepOffset + gateDuration,
          kind: 'note-off',
          note,
          timelineIndex,
          sourceStepIndex: playbackStep.sourceStepIndex,
          patternId: playbackStep.patternId,
          patternName: playbackStep.patternName,
          arrangementIndex: playbackStep.arrangementIndex,
        })
      }
    }
  })

  const lastIndex = Math.max(0, playback.length - 1)
  const finalSwing = lastIndex % 2 === 1 ? swingOffset : 0
  return {
    events: events.sort((left, right) => left.offsetMs - right.offsetMs || eventOrder(left.kind) - eventOrder(right.kind)),
    playback,
    durationMs: playback.length * duration + finalSwing,
    bpm: sequence.bpm,
    swing: sequence.swing,
  }
}

function errorOf(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Local sequence playback failed')
}

export function createLocalSequencePlayer(
  target: LocalSequenceNoteTarget,
  sequence: Fm1Sequence,
  callbacks: LocalSequencePlayerCallbacks = {},
): LocalSequencePlayer {
  let runId = 0
  let timers: ReturnType<typeof setTimeout>[] = []
  let playing = false

  const clearTimers = () => {
    for (const timer of timers) clearTimeout(timer)
    timers = []
  }

  const fail = (cause: unknown) => {
    const error = errorOf(cause)
    runId += 1
    playing = false
    clearTimers()
    Promise.resolve(target.allNotesOff()).catch(() => undefined)
    callbacks.onError?.(error)
  }

  const scheduleCycle = (currentRun: number, options: Required<LocalSequencePlayOptions>, cycleSeed: number) => {
    if (currentRun !== runId) return
    const plan = buildLocalSequencePlan(sequence, cycleSeed)
    const cycleStart = performance.now() + options.startDelayMs

    for (const step of plan.playback) {
      const offset = step.timelineIndex * stepDurationMs(sequence.bpm)
        + (step.timelineIndex % 2 === 1 ? stepDurationMs(sequence.bpm) * (sequence.swing / 100) * 0.5 : 0)
      timers.push(setTimeout(() => {
        if (currentRun !== runId) return
        callbacks.onStep?.(step, cycleStart + offset)
      }, Math.max(0, cycleStart + offset - performance.now())))
    }

    for (const event of plan.events) {
      timers.push(setTimeout(() => {
        if (currentRun !== runId) return
        const action = event.kind === 'note-on'
          ? target.noteOn(event.note, event.velocity ?? 100)
          : target.noteOff(event.note)
        Promise.resolve(action).catch(fail)
      }, Math.max(0, cycleStart + event.offsetMs - performance.now())))
    }

    timers.push(setTimeout(() => {
      if (currentRun !== runId) return
      if (options.loop) {
        clearTimers()
        scheduleCycle(currentRun, { ...options, startDelayMs: 0 }, (cycleSeed + 1) >>> 0)
        return
      }
      playing = false
      clearTimers()
      Promise.resolve(target.allNotesOff())
        .then(() => callbacks.onComplete?.())
        .catch(fail)
    }, Math.max(0, cycleStart + plan.durationMs - performance.now())))
  }

  return {
    get playing() {
      return playing
    },
    play(options = {}) {
      const normalized: Required<LocalSequencePlayOptions> = {
        startDelayMs: options.startDelayMs ?? 50,
        loop: options.loop ?? false,
        seed: options.seed ?? 0,
      }
      if (!Number.isFinite(normalized.startDelayMs) || normalized.startDelayMs < 0 || normalized.startDelayMs > 5_000) {
        throw new RangeError('Local sequence startDelayMs must be between 0 and 5000')
      }
      buildLocalSequencePlan(sequence, normalized.seed)
      runId += 1
      const currentRun = runId
      playing = true
      clearTimers()
      Promise.resolve(target.allNotesOff())
        .then(() => scheduleCycle(currentRun, normalized, normalized.seed >>> 0))
        .catch(fail)
    },
    stop() {
      runId += 1
      playing = false
      clearTimers()
      Promise.resolve(target.allNotesOff()).catch((cause: unknown) => callbacks.onError?.(errorOf(cause)))
    },
  }
}
