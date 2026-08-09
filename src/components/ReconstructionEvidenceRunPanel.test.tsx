import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ReconstructionEvidenceRunPanel } from './ReconstructionEvidenceRunPanel'

describe('ReconstructionEvidenceRunPanel', () => {
  it('requires the explicit 2+2+2 isolated-file declaration before running', () => {
    const onAuditionVoice = vi.fn(async () => undefined)
    const onStopAudition = vi.fn(async () => undefined)
    const markup = renderToStaticMarkup(
      <ReconstructionEvidenceRunPanel onAuditionVoice={onAuditionVoice} onStopAudition={onStopAudition} />,
    )

    expect(markup).toContain('2+2+2 final evidence run · local only')
    expect(markup).toContain('FM-friendly electronic / sustained')
    expect(markup).toContain('Pitched acoustic / instrument')
    expect(markup).toContain('Difficult transient / noisy / nonlinear')
    expect(markup).toContain('Full bundled catalog · final evidence preferred')
    expect(markup).toContain('Run 2+2+2 evidence set')
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('source audio stays in browser memory')
    expect(onAuditionVoice).not.toHaveBeenCalled()
    expect(onStopAudition).not.toHaveBeenCalled()
  })
})
