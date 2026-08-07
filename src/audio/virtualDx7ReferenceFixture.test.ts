import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeSingleVoiceMessage, DX7_SINGLE_MESSAGE_LENGTH } from '../sysex/dx7'
import { createMsfaCompatibleVoiceBridge } from './msfaVoiceBridge'
import { createVirtualDx7RenderPlan } from './virtualDx7Engine'
import {
  createVirtualDx7ReferenceRenderRequest,
  createVirtualDx7ReferenceSysex,
  createVirtualDx7ReferenceVoice,
  VIRTUAL_DX7_REFERENCE_BRIDGE_SHA256,
  VIRTUAL_DX7_REFERENCE_SYSEX_SHA256,
  VIRTUAL_DX7_REFERENCE_VOICE_DATA_SHA256,
} from './virtualDx7ReferenceFixture'

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function nativeReferencePatch(): Uint8Array {
  const hex = readFileSync(new URL('../../native/virtual-dx7-spike/reference-patch-v1.hex', import.meta.url), 'utf8').trim()
  if (!/^[0-9a-f]{312}$/i.test(hex)) throw new Error('Native virtual-DX7 reference patch must contain exactly 156 hexadecimal bytes.')
  return Uint8Array.from(hex.match(/../g) ?? [], (value) => Number.parseInt(value, 16))
}

describe('virtual DX7 synthetic reference fixture', () => {
  it('generates one deterministic checksum-valid Yamaha single-voice SysEx message', () => {
    const first = createVirtualDx7ReferenceSysex()
    const second = createVirtualDx7ReferenceSysex()
    const decoded = decodeSingleVoiceMessage(first)

    expect(first).toHaveLength(DX7_SINGLE_MESSAGE_LENGTH)
    expect(Array.from(second)).toEqual(Array.from(first))
    expect(sha256(first)).toBe(VIRTUAL_DX7_REFERENCE_SYSEX_SHA256)
    expect(sha256(first.slice(6, 161))).toBe(VIRTUAL_DX7_REFERENCE_VOICE_DATA_SHA256)
    expect(decoded.channel).toBe(0)
    expect(decoded.voice.name).toBe('FM1 REF V1')
    expect(decoded.voice.algorithm).toBe(5)
    expect(decoded.voice.feedback).toBe(3)
  })

  it('matches the fixed renderer feasibility request', () => {
    const request = createVirtualDx7ReferenceRenderRequest()
    const plan = createVirtualDx7RenderPlan(request)

    expect(request.midiNote).toBe(60)
    expect(request.velocity).toBe(100)
    expect(request.sampleRate).toBe(48_000)
    expect(plan.noteOnFrames).toBe(48_000)
    expect(plan.releaseFrames).toBe(24_000)
    expect(plan.totalFrames).toBe(72_000)
    expect(plan.randomSeed).toBe(42)
  })

  it('produces a private engine bridge from the same semantic voice', () => {
    const plan = createVirtualDx7RenderPlan(createVirtualDx7ReferenceRenderRequest())
    const bridge = createMsfaCompatibleVoiceBridge(plan)
    const sysex = createVirtualDx7ReferenceSysex()

    // The first 145 voice bytes are synthesis parameters. The last ten voice
    // bytes are the display name, which the private engine bridge deliberately
    // canonicalizes because name metadata is excluded from render identity.
    expect(Array.from(bridge.voiceData.slice(0, 145)))
      .toEqual(Array.from(sysex.slice(6, 6 + 145)))
    expect(Array.from(bridge.voiceData.slice(145))).not.toEqual(Array.from(sysex.slice(151, 161)))
    expect(sha256(bridge.patchBuffer)).toBe(VIRTUAL_DX7_REFERENCE_BRIDGE_SHA256)
    expect(Array.from(nativeReferencePatch())).toEqual(Array.from(bridge.patchBuffer))
  })

  it('is repository-defined semantic data without imported source bytes', () => {
    const voice = createVirtualDx7ReferenceVoice()

    expect(voice.source).toBeUndefined()
    expect(voice.operators).toHaveLength(6)
    expect(voice.operators.every((operator) => operator.outputLevel > 0)).toBe(true)
  })
})
