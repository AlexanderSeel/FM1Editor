import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import {
  createLocalVoiceAuditionManager,
  type LocalVoiceAuditionManager,
} from '../audio/localVoiceAudition'

export interface LocalVoiceAuditionState {
  activeVoice: Dx7Voice | null
  phase: 'idle' | 'starting' | 'playing' | 'release' | 'error'
  status: string | null
  error: string | null
}

export type LocalAuditionVoiceSource = Dx7Voice | Promise<Dx7Voice>

export interface LocalVoiceAuditionActions extends LocalVoiceAuditionState {
  prepareAudition(): Promise<void>
  auditionVoice(voice: LocalAuditionVoiceSource): Promise<void>
  stopAudition(): Promise<void>
}

function voiceLabel(voice: Dx7Voice | null): string {
  return voice?.name || 'UNTITLED'
}

export function useLocalVoiceAudition(): LocalVoiceAuditionActions {
  const [state, setState] = useState<LocalVoiceAuditionState>({
    activeVoice: null,
    phase: 'idle',
    status: null,
    error: null,
  })
  const managerRef = useRef<LocalVoiceAuditionManager | null>(null)

  if (managerRef.current === null) {
    managerRef.current = createLocalVoiceAuditionManager(undefined, {
      onStart: (voice) => setState({
        activeVoice: voice,
        phase: 'playing',
        status: `Local audition: ${voiceLabel(voice)} · C4`,
        error: null,
      }),
      onRelease: (voice) => setState({
        activeVoice: voice,
        phase: 'release',
        status: `Local audition release: ${voiceLabel(voice)}`,
        error: null,
      }),
      onStop: () => setState({
        activeVoice: null,
        phase: 'idle',
        status: 'Local audition finished.',
        error: null,
      }),
      onError: (error, voice) => setState({
        activeVoice: voice,
        phase: 'error',
        status: null,
        error: error.message,
      }),
    })
  }

  useEffect(() => () => {
    const manager = managerRef.current
    managerRef.current = null
    if (manager) void manager.dispose()
  }, [])

  const prepareAudition = useCallback(async () => {
    try {
      await managerRef.current?.prepare()
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error('Local voice audition could not enable browser audio')
      setState({
        activeVoice: null,
        phase: 'error',
        status: null,
        error: error.message,
      })
      throw error
    }
  }, [])

  const auditionVoice = useCallback((voiceSource: LocalAuditionVoiceSource): Promise<void> => {
    const manager = managerRef.current
    // Start AudioContext creation/resume synchronously in the originating click.
    // The voice itself may arrive later from asynchronous ZIP/catalog parsing.
    const preparation = manager?.prepare()

    return (async () => {
      let voice: Dx7Voice | null = null
      try {
        voice = await voiceSource
        setState({
          activeVoice: voice,
          phase: 'starting',
          status: `Starting local audition: ${voiceLabel(voice)}…`,
          error: null,
        })
        await preparation
        await manager?.audition(voice)
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error('Local voice audition failed')
        setState({
          activeVoice: voice,
          phase: 'error',
          status: null,
          error: error.message,
        })
        throw error
      }
    })()
  }, [])

  const stopAudition = useCallback(async () => {
    await managerRef.current?.stop()
  }, [])

  return {
    ...state,
    prepareAudition,
    auditionVoice,
    stopAudition,
  }
}
