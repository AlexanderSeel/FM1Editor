import { readFileSync } from 'node:fs'
import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { importSysexFile } from '../sysex/importSysex'
import { createMsfaOfflineEngine, type MsfaEmscriptenModule } from './msfaOfflineEngine'
import { createVirtualDx7RenderPlan } from './virtualDx7Engine'

async function loadPackagedModule(): Promise<MsfaEmscriptenModule> {
  const moduleUrl = new URL('../../public/virtual-dx7/fm1-msfa.mjs', import.meta.url)
  const wasmUrl = new URL('../../public/virtual-dx7/fm1-msfa.wasm', import.meta.url)
  const imported = await import(/* @vite-ignore */ moduleUrl.href) as {
    default?: (options?: { wasmBinary?: Uint8Array }) => Promise<MsfaEmscriptenModule>
  }
  if (typeof imported.default !== 'function') throw new Error('Packaged MSFA factory is unavailable')
  return imported.default({ wasmBinary: new Uint8Array(readFileSync(wasmUrl)) })
}

function firstRealBankVoices() {
  const archive = unzipSync(new Uint8Array(readFileSync(new URL('../../public/catalog/sysexFinal.zip', import.meta.url))))
  for (const [filename, bytes] of Object.entries(archive).sort(([left], [right]) => left.localeCompare(right))) {
    if (!filename.toLowerCase().endsWith('.syx')) continue
    const parsed = importSysexFile(bytes)
    const bank = parsed.find((item): item is Extract<(typeof parsed)[number], { kind: 'voice-bank' }> => item.kind === 'voice-bank')
    if (bank) return { filename, voices: bank.voices }
  }
  throw new Error('Bundled catalog contains no importable 32-voice DX7 bank')
}

function peak(samples: Float32Array): number {
  let result = 0
  for (const sample of samples) result = Math.max(result, Math.abs(sample))
  return result
}

describe('real catalog voice rendering', () => {
  it('renders audible PCM from decoded packed-bank voices through the packaged engine', async () => {
    const { filename, voices } = firstRealBankVoices()
    const module = await loadPackagedModule()
    const engine = createMsfaOfflineEngine({ moduleFactory: async () => module })
    const results: { slot: number; name: string; peak: number }[] = []

    for (let index = 0; index < Math.min(voices.length, 8); index += 1) {
      const voice = voices[index]
      if (!voice) continue
      const plan = createVirtualDx7RenderPlan({
        voice,
        midiNote: 60,
        velocity: 105,
        sampleRate: 48_000,
        noteOnSeconds: 0.35,
        releaseSeconds: 0.15,
        randomSeed: 42,
      })
      const render = await engine.render(plan)
      results.push({ slot: index + 1, name: voice.name, peak: peak(render.samples) })
    }

    console.info('real-bank-render', JSON.stringify({ filename, results }))
    expect(results).toHaveLength(8)
    expect(results.filter((result) => result.peak > 1e-6).length).toBeGreaterThanOrEqual(6)
  })
})
