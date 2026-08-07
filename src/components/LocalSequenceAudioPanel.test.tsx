import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { MsfaAudioWorkletController } from '../audio/msfaAudioWorklet'
import { createInitializedSequence } from '../domain/sequence'
import { createInitializedVoice } from '../domain/voice'
import { LocalSequenceAudioPanel } from './LocalSequenceAudioPanel'

function unreachableController(): MsfaAudioWorkletController {
  throw new Error('Local sequence audio must not initialize during render')
}

describe('LocalSequenceAudioPanel', () => {
  it('keeps local audio explicit and separate from hardware MIDI', () => {
    const createController = vi.fn(unreachableController)
    const markup = renderToStaticMarkup(
      <LocalSequenceAudioPanel
        createController={createController}
        sequence={createInitializedSequence()}
        voice={createInitializedVoice('SEQ LOCAL')}
      />,
    )

    expect(createController).not.toHaveBeenCalled()
    expect(markup).toContain('Local sequence audio')
    expect(markup).toContain('Enable local audio')
    expect(markup).toContain('Play local')
    expect(markup).toContain('Stop local')
    expect(markup).toContain('independent from the hardware MIDI Play/Stop controls')
    expect(markup).toContain('never sends sequence notes or transport to the selected MIDI output')
    expect(markup).toContain('Internal 120 BPM')
  })

  it('exposes external MIDI input clock as an explicit local-audio route', () => {
    const markup = renderToStaticMarkup(
      <LocalSequenceAudioPanel
        createController={unreachableController}
        sequence={{ ...createInitializedSequence(), clockMode: 'external' }}
        voice={createInitializedVoice('EXT CLOCK')}
      />,
    )

    expect(markup).toContain('External MIDI input clock')
    expect(markup).toContain('Arm external local')
    expect(markup).toContain('selected input')
    expect(markup).toContain('never sends sequence notes or transport to the selected MIDI output')
  })
})
