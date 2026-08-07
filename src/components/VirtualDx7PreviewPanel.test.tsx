import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { MsfaAudioWorkletController } from '../audio/msfaAudioWorklet'
import { createInitializedFxState } from '../domain/fx'
import { createInitializedVoice } from '../domain/voice'
import { VirtualDx7PreviewPanel } from './VirtualDx7PreviewPanel'

function unreachableController(): MsfaAudioWorkletController {
  throw new Error('The local audio controller must not be created during render')
}

describe('VirtualDx7PreviewPanel / Virtual FM-1 target', () => {
  it('keeps browser audio explicit and defaults to the dry limited route', () => {
    const createController = vi.fn(unreachableController)
    const markup = renderToStaticMarkup(
      <VirtualDx7PreviewPanel
        createController={createController}
        fxState={createInitializedFxState()}
        voice={createInitializedVoice('LOCAL TEST')}
      />,
    )
    expect(createController).not.toHaveBeenCalled()
    expect(markup).toContain('Virtual FM-1 preview')
    expect(markup).toContain('Enable local audio')
    expect(markup).toContain('LOCAL AUDIO OFF')
    expect(markup).toContain('Dry bypass')
    expect(markup).toContain('Master gain')
    expect(markup).toContain('Virtual FM-1 render diagnostics')
    expect(markup).toContain('measurement pending')
    expect(markup).toContain('Reference A/B · offline render')
    expect(markup).toContain('Download note WAV')
    expect(markup).toContain('Download chord WAV')
    expect(markup).toContain('-6 dB')
    expect(markup).toContain('limiter -1 dB')
    expect(markup).toContain('16 voices')
    expect(markup).toContain('never requests Web MIDI')
  })

  it('retains local performance controls without activating hardware paths', () => {
    const markup = renderToStaticMarkup(
      <VirtualDx7PreviewPanel
        createController={unreachableController}
        fxState={createInitializedFxState()}
        voice={createInitializedVoice('NO MIDI')}
      />,
    )
    expect(markup).toContain('Pitch-bend range')
    expect(markup).toContain('Mod wheel range')
    expect(markup).toContain('Aftertouch range')
    expect(markup).toContain('Sustain')
    expect(markup).toContain('Enable local audio to audition this voice without MIDI hardware.')
    expect(markup).not.toContain('Connect and select a MIDI output to play.')
  })
})
