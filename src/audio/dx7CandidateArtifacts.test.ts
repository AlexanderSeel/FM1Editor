import { describe, expect, it } from 'vitest'
import { createInitializedVoice } from '../domain/voice'
import { decodeSingleVoiceMessage, DX7_SINGLE_MESSAGE_LENGTH } from '../sysex/dx7'
import { createDx7VoiceSemanticDiff, createDx7VoiceSyxArtifact } from './dx7CandidateArtifacts'

function changedVoice() {
  const base = createInitializedVoice('BASE')
  const operators = [...base.operators] as [...typeof base.operators]
  const op1 = operators[0]
  if (!op1) throw new Error('missing OP1')
  operators[0] = { ...op1, outputLevel: 73 }
  return {
    base,
    changed: {
      ...base,
      name: 'REFINED',
      operators,
      feedback: 5,
      source: { packed: new Uint8Array(128).fill(99), unpacked: new Uint8Array(155).fill(88) },
    },
  }
}

describe('DX7 candidate artifacts', () => {
  it('reports semantic parameter changes while ignoring raw source provenance', () => {
    const { base, changed } = changedVoice()
    const differences = createDx7VoiceSemanticDiff(base, changed)

    expect(differences).toEqual([
      { path: 'name', label: 'Name', before: 'BASE', after: 'REFINED' },
      { path: 'operators.0.outputLevel', label: 'OP1 output level', before: 99, after: 73 },
      { path: 'feedback', label: 'Feedback', before: 0, after: 5 },
    ])
  })

  it('does not report a difference when only packed/unpacked provenance changes', () => {
    const base = createInitializedVoice('SAME')
    const changed = { ...base, source: { packed: new Uint8Array(128).fill(1), unpacked: new Uint8Array(155).fill(2) } }
    expect(createDx7VoiceSemanticDiff(base, changed)).toEqual([])
  })

  it('encodes a standard checksum-valid Yamaha single-voice syx artifact without hardware access', () => {
    const voice = createInitializedVoice('MY VOICE')
    const artifact = createDx7VoiceSyxArtifact(voice, 3)

    expect(artifact.filename).toBe('MY-VOICE.syx')
    expect(artifact.mimeType).toBe('application/octet-stream')
    expect(artifact.bytes).toHaveLength(DX7_SINGLE_MESSAGE_LENGTH)
    const decoded = decodeSingleVoiceMessage(artifact.bytes)
    expect(decoded.channel).toBe(3)
    expect(decoded.voice.name).toBe('MY VOICE')
    expect(decoded.voice.algorithm).toBe(voice.algorithm)
  })
})
