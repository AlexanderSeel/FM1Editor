import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createInitializedFxState } from '../domain/fx'
import { createInitializedVoice } from '../domain/voice'
import { VirtualFm1PreviewExtras } from './VirtualFm1PreviewExtras'

describe('VirtualFm1PreviewExtras', () => {
  it('keeps reference playback optional and exposes explicit offline render actions', () => {
    const markup = renderToStaticMarkup(
      <VirtualFm1PreviewExtras
        fxEnabled={false}
        fxState={createInitializedFxState()}
        masterGainDb={-6}
        voice={createInitializedVoice('A B TEST')}
      />,
    )

    expect(markup).toContain('Reference A/B · offline render')
    expect(markup).toContain('No reference A')
    expect(markup).toContain('Play reference A')
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('Preview current B')
    expect(markup).toContain('Download note WAV')
    expect(markup).toContain('Download chord WAV')
    expect(markup).toContain('No hardware or upload is used')
  })

  it('describes FX render mode without claiming physical FM-1 equivalence', () => {
    const markup = renderToStaticMarkup(
      <VirtualFm1PreviewExtras
        fxEnabled
        fxState={createInitializedFxState()}
        masterGainDb={-9}
        voice={createInitializedVoice('FX WAV')}
      />,
    )

    expect(markup).toContain('FM-1-inspired FX/master/limiter')
    expect(markup).not.toContain('physically identical')
  })
})
