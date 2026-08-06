import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('DX7 live parameter safety routing', () => {
  it('routes voice and function writes through the shared hardware gate', () => {
    const audition = source('./components/TargetVoiceAuditionPanel.tsx')

    expect(audition).toContain('const hardwareReady = systemInfoReady && memoryProtectOff')
    expect(audition).toContain('<Dx7VoiceParameterControls')
    expect(audition).toContain('<Dx7FunctionControls')
    expect(audition.match(/hardwareReady=\{hardwareReady\}/g)).toHaveLength(2)
    expect(audition.match(/sysexEnabled=\{sysexEnabled\}/g)).toHaveLength(2)
  })

  it('does not render function writes without an explicit parent gate', () => {
    const controls = source('./components/Dx7FunctionControls.tsx')

    expect(controls).toContain('const gateProvided = sysexEnabled !== undefined && hardwareReady !== undefined')
    expect(controls).toContain('if (!gateProvided) return null')
    expect(controls).toContain("sysexEnabled !== true || hardwareReady !== true")
  })

  it('exposes semantic voice changes without arbitrary raw parameter entry', () => {
    const voiceControls = source('./components/Dx7VoiceParameterControls.tsx')
    const voiceMap = source('./sysex/dx7VoiceParameterChange.ts')

    expect(voiceControls).toContain('Semantic editor values only; no arbitrary raw parameter entry.')
    expect(voiceControls).toContain('diffDx7VoiceParameterValues')
    expect(voiceControls).toContain('LIVE_THROTTLE_MS = 75')
    expect(voiceMap).toContain('const data = encodeSingleVoiceData(voice)')
    expect(voiceMap).toContain("label: 'Operator enable mask'")
  })
})
