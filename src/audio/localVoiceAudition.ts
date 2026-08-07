import type { Dx7Voice } from '../domain/voice'
import {
  createDefaultMsfaLocalPerformanceConfig,
  createMsfaAudioWorkletController,
  type MsfaAudioWorkletController,
} from './msfaAudioWorklet'

export interface LocalVoiceAuditionOptions {
  midiNote?: number
  velocity?: number
  noteOnMs?: number
  releaseTailMs?: number
  randomSeed?: number
}

export interface LocalVoiceAuditionCallbacks {
  onStart?: (voice: Dx7Voice) => void
  onRelease?: (voice: Dx7Voice) => void
  onStop?: (voice: Dx7Voice | null) => void
  onError?: (error: Error, voice: Dx7Voice | null) => void
}

export interface LocalVoiceAuditionManager {
  readonly active: boolean
  readonly activeVoice: Dx7Voice | null
  /**
   * Create/resume browser-local audio immediately from a direct user gesture.
   * The prepared controller is reused by a later audition after asynchronous
   * catalog/library loading so browser autoplay policy cannot silently block it.
   */
  prepare(): Promise<void>
  audition(voice: Dx7Voice, options?: LocalVoiceAuditionOptions): Promise<void>
  stop(): Promise<void>
  dispose(): Promise<void>
}

function integerRange(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} through ${maximum}`)
  }
  return value
}

function finiteRange(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}`)
  }
  return value
}

function errorOf(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('Local voice audition failed')
}

export function createLocalVoiceAuditionManager(
  createController: () => MsfaAudioWorkletController = createMsfaAudioWorkletController,
  callbacks: LocalVoiceAuditionCallbacks = {},
): LocalVoiceAuditionManager {
  let controller: MsfaAudioWorkletController | null = null
  let currentVoice: Dx7Voice | null = null
  let noteTimer: ReturnType<typeof setTimeout> | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null
  let generation = 0

  const clearTimers = () => {
    if (noteTimer !== null) clearTimeout(noteTimer)
    if (closeTimer !== null) clearTimeout(closeTimer)
    noteTimer = null
    closeTimer = null
  }

  const controllerUsable = (candidate: MsfaAudioWorkletController | null) => (
    candidate !== null && candidate.state !== 'closed' && candidate.state !== 'error'
  )

  const ensureController = (): MsfaAudioWorkletController => {
    if (!controllerUsable(controller)) controller = createController()
    return controller as MsfaAudioWorkletController
  }

  const closeController = async (notify: boolean) => {
    const closing = controller
    const stoppedVoice = currentVoice
    controller = null
    currentVoice = null
    clearTimers()
    if (closing) {
      try {
        await closing.allNotesOff()
      } catch {
        // Close still proceeds if a best-effort all-notes-off command fails.
      }
      try {
        await closing.close()
      } catch {
        // The controller itself already performs best-effort shutdown.
      }
    }
    if (notify) callbacks.onStop?.(stoppedVoice)
  }

  const prepare = async () => {
    // ensureController() intentionally runs before the first await. This makes
    // AudioContext construction/resume start inside the originating click.
    const prepared = ensureController()
    try {
      await prepared.enable()
    } catch (cause) {
      const error = errorOf(cause)
      if (controller === prepared) await closeController(false)
      throw error
    }
  }

  const manager: LocalVoiceAuditionManager = {
    get active() {
      return currentVoice !== null
    },
    get activeVoice() {
      return currentVoice
    },
    prepare,
    async audition(voice, options = {}) {
      const midiNote = integerRange(options.midiNote ?? 60, 0, 127, 'midiNote')
      const velocity = integerRange(options.velocity ?? 105, 1, 127, 'velocity')
      const noteOnMs = finiteRange(options.noteOnMs ?? 900, 100, 10_000, 'noteOnMs')
      const releaseTailMs = finiteRange(options.releaseTailMs ?? 900, 0, 10_000, 'releaseTailMs')
      const randomSeed = integerRange(options.randomSeed ?? 42, 0, 0xffff_ffff, 'randomSeed')
      const run = ++generation

      clearTimers()
      // As with prepare(), create/resume audio before the first await. Direct
      // library audition therefore also retains its click activation.
      const nextController = ensureController()
      currentVoice = voice
      try {
        await nextController.enable()
        if (run !== generation || controller !== nextController) return
        // Reuse a prepared/active controller rather than closing and recreating
        // it after asynchronous catalog work has already completed.
        await nextController.allNotesOff()
        if (run !== generation || controller !== nextController) return
        await nextController.loadVoice(voice, randomSeed)
        await nextController.configurePerformance(createDefaultMsfaLocalPerformanceConfig())
        await nextController.noteOn(midiNote, velocity)
        if (run !== generation || controller !== nextController) return
        callbacks.onStart?.(voice)

        noteTimer = setTimeout(() => {
          if (run !== generation || controller !== nextController) return
          void nextController.noteOff(midiNote).then(() => {
            if (run === generation && controller === nextController) callbacks.onRelease?.(voice)
          }).catch((cause: unknown) => callbacks.onError?.(errorOf(cause), voice))
        }, noteOnMs)

        closeTimer = setTimeout(() => {
          if (run !== generation || controller !== nextController) return
          void closeController(true)
        }, noteOnMs + releaseTailMs)
      } catch (cause) {
        const error = errorOf(cause)
        callbacks.onError?.(error, voice)
        if (run === generation && controller === nextController) await closeController(false)
        throw error
      }
    },
    async stop() {
      generation += 1
      await closeController(true)
    },
    async dispose() {
      generation += 1
      await closeController(false)
    },
  }

  return manager
}
