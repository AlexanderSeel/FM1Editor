import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PersistentWorkspace } from './PersistentWorkspace'

describe('PersistentWorkspace', () => {
  it('keeps inactive children rendered while hiding the workspace', () => {
    const markup = renderToStaticMarkup(
      <PersistentWorkspace active={false}>
        <span data-testid="sequencer-runtime">Sequencer runtime</span>
      </PersistentWorkspace>,
    )

    expect(markup).toContain('hidden=""')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('data-testid="sequencer-runtime"')
  })

  it('shows active workspace content without a hidden attribute', () => {
    const markup = renderToStaticMarkup(
      <PersistentWorkspace active>
        <span>Sequencer runtime</span>
      </PersistentWorkspace>,
    )

    expect(markup).not.toContain('hidden=""')
    expect(markup).toContain('aria-hidden="false"')
  })
})
