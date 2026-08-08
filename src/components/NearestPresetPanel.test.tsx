import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { REFERENCE_AUDIO_PRIVACY, type PreparedReferenceAudio } from '../audio/referenceAudio'
import { NearestPresetPanel } from './NearestPresetPanel'

function reference(): PreparedReferenceAudio {
  return {
    sampleRate: 48_000,
    decodedDurationSeconds: 0.5,
    selectedRegion: { startSeconds: 0, endSeconds: 0.5 },
    trimmedLeadingSeconds: 0,
    trimmedTrailingSeconds: 0,
    durationSeconds: 0.5,
    samples: new Float32Array(24_000),
    peakBeforeNormalization: 0.5,
    normalizationGain: 1,
    detectedPitchHz: 440,
    analysisPitchHz: 440,
    pitchSource: 'detected',
    privacy: REFERENCE_AUDIO_PRIVACY,
  }
}

describe('NearestPresetPanel', () => {
  it('makes recreation primary while keeping similar-preset search explicit and disabled until a reference exists', () => {
    const markup = renderToStaticMarkup(
      <NearestPresetPanel
        onAuditionVoice={vi.fn()}
        onLoadVoice={vi.fn()}
        onStopAudition={vi.fn()}
        reference={null}
      />,
    )
    expect(markup).toContain('Recreate sound · local synthesis')
    expect(markup).toContain('Recreate sound')
    expect(markup).toContain('Find similar presets')
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('Nothing is uploaded')
    expect(markup).toContain('Full local bundled catalog')
  })

  it('exposes reference A playback without loading or transmitting a candidate automatically', () => {
    const onLoadVoice = vi.fn()
    const onAuditionVoice = vi.fn()
    const markup = renderToStaticMarkup(
      <NearestPresetPanel
        onAuditionVoice={onAuditionVoice}
        onLoadVoice={onLoadVoice}
        onStopAudition={vi.fn()}
        reference={reference()}
      />,
    )
    expect(markup).toContain('▶ Play reference A')
    expect(markup).toContain('Quick scan · first 256 bundled voices')
    expect(markup).toContain('REFERENCE READY')
    expect(onLoadVoice).not.toHaveBeenCalled()
    expect(onAuditionVoice).not.toHaveBeenCalled()
  })
})
