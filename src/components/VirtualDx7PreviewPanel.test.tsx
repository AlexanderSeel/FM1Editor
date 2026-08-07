import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { MsfaAudioWorkletController } from '../audio/msfaAudioWorklet'
import { createInitializedVoice } from '../domain/voice'
import { VirtualDx7PreviewPanel } from './VirtualDx7PreviewPanel'

function unreachableController(): MsfaAudioWorkletController {
  throw new Error('The local audio controller must not be created during render')
}

describe('VirtualDx7PreviewPanel', () => {
  it('keeps browser audio disabled until the user explicitly enables it', () => {
    const createController = vi.fn(unreachableController)
    const markup = renderToStaticMarkup(
      <VirtualDx7PreviewPanel
        createController={createController}
        voice={createInitializedVoice('LOCAL TEST')}
      />,
    )

    expect(createController).not.toHaveBeenCalled()
    expect(markup).toContain('Local DX7-compatible preview')
    expect(markup).toContain('Enable local audio')
    expect(markup).toContain('LOCAL AUDIO OFF')
    expect(markup).toContain('Browser only')
    expect(markup).toContain('does not request Web MIDI')
    expect(markup).toContain('Dry · standard 12-TET · 16 voices')
    expect(markup).toContain('deterministic 16-voice allocation and stealing')
  })

  it('presents the local piano as unavailable before audio activation without asking for MIDI hardware', () => {
    const markup = renderToStaticMarkup(
      <VirtualDx7PreviewPanel
        createController={unreachableController}
        voice={createInitializedVoice('NO MIDI')}
      />,
    )

    expect(markup).toContain('Enable local audio to audition this voice without MIDI hardware.')
    expect(markup).not.toContain('Connect and select a MIDI output to play.')
  })
})
