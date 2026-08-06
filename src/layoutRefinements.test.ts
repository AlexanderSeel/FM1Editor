import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('compact application chrome', () => {
  it('does not render decorative header knobs or redundant helper copy', () => {
    const app = source('./App.tsx')

    expect(app).not.toContain('fm1-knob')
    expect(app).not.toContain('Master')
    expect(app).not.toContain("hardwareLabel")
    expect(app).not.toContain('Use the hardware-style keys and recessed editor panels below.')
  })

  it('uses shared compact typography and darker screen tokens', () => {
    const styles = source('./layoutRefinements.css')
    const main = source('./main.tsx')

    expect(main).toContain("import './layoutRefinements.css'")
    expect(styles).toContain('--fm1-type-meta:')
    expect(styles).toContain('--fm1-type-control:')
    expect(styles).toContain('--fm1-type-title:')
    expect(styles).toContain('--fm1-screen: #4d9fbe')
    expect(styles).toContain('.fm1-control-deck')
    expect(styles).toContain('min-height: 108px')
  })
})
