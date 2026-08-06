import { describe, expect, it } from 'vitest'
import { analyzeSysexFile, importSysexFile } from './importSysex'
import { buildSyntheticSysexFixtureCorpus } from './syntheticFixtureCorpus'

function fixture(id: string) {
  const result = buildSyntheticSysexFixtureCorpus().find((entry) => entry.id === id)
  if (!result) throw new Error(`Missing synthetic fixture ${id}.`)
  return result
}

describe('synthetic SysEx compatibility fixture corpus', () => {
  it('is deterministic, uniquely named and covered by explicit expectations', () => {
    const first = buildSyntheticSysexFixtureCorpus()
    const second = buildSyntheticSysexFixtureCorpus()

    expect(new Set(first.map((entry) => entry.id)).size).toBe(first.length)
    expect(first).toHaveLength(9)
    first.forEach((entry, index) => {
      expect(entry.description.length).toBeGreaterThan(20)
      expect(entry.bytes).toEqual(second[index]?.bytes)
    })
  })

  it('matches every fixture diagnostic contract without mutating original bytes', () => {
    buildSyntheticSysexFixtureCorpus().forEach((entry) => {
      const original = entry.bytes.slice()
      const report = analyzeSysexFile(entry.bytes)

      expect(report.completeMessageCount, entry.id).toBe(entry.expectation.completeMessageCount)
      expect(report.supportedMessageCount, entry.id).toBe(entry.expectation.supportedMessageCount)
      expect(report.diagnostics.map((diagnostic) => diagnostic.code), entry.id)
        .toEqual(entry.expectation.diagnosticCodes)
      expect(entry.bytes, entry.id).toEqual(original)
    })
  })

  it('round-trips a maximum-channel single voice with varied legal values', () => {
    const source = fixture('valid-single-channel-16')
    const report = analyzeSysexFile(source.bytes)
    const entry = report.entries[0]

    expect(entry?.kind).toBe('single-voice')
    if (entry?.kind !== 'single-voice') throw new Error('Expected a single-voice fixture.')
    expect(entry.channel).toBe(15)
    expect(entry.voice.name).toBe('SYN0000001')
    expect(entry.voice.algorithm).toBe(1)
    expect(entry.voice.operators).toHaveLength(6)
    expect(entry.raw).toEqual(source.bytes)
  })

  it('imports a complete 32-voice bank with distinct names and full algorithm coverage', () => {
    const report = analyzeSysexFile(fixture('valid-bank-channel-9').bytes)
    const entry = report.entries[0]

    expect(entry?.kind).toBe('voice-bank')
    if (entry?.kind !== 'voice-bank') throw new Error('Expected a voice-bank fixture.')
    expect(entry.channel).toBe(8)
    expect(entry.voices).toHaveLength(32)
    expect(new Set(entry.voices.map((voice) => voice.name)).size).toBe(32)
    expect(entry.voices.map((voice) => voice.algorithm)).toEqual(
      Array.from({ length: 32 }, (_, index) => index + 1),
    )
    expect(entry.voices[0]?.name).toBe('SYN0000001')
    expect(entry.voices[31]?.name).toBe('SYN0000032')
  })

  it('reports reserved single-voice values with semantic paths', () => {
    const report = analyzeSysexFile(fixture('legacy-single-reserved-values').bytes)
    const entry = report.entries[0]

    expect(entry?.kind).toBe('single-voice')
    if (entry?.kind !== 'single-voice') throw new Error('Expected a single-voice fixture.')
    expect(entry.normalizations).toEqual([
      {
        path: 'OP6.keyboardScaling.breakPoint',
        originalValue: 127,
        normalizedValue: 99,
      },
      {
        path: 'OP6.detune',
        originalValue: 15,
        normalizedValue: 14,
      },
    ])
    expect(entry.voice.operators[5].keyboardScaling.breakPoint).toBe(99)
    expect(entry.voice.operators[5].detune).toBe(14)
  })

  it('prefixes reserved bank values with the affected voice index', () => {
    const report = analyzeSysexFile(fixture('legacy-bank-reserved-values').bytes)
    const entry = report.entries[0]

    expect(entry?.kind).toBe('voice-bank')
    if (entry?.kind !== 'voice-bank') throw new Error('Expected a voice-bank fixture.')
    expect(entry.normalizations.map((normalization) => normalization.path)).toEqual([
      'voice[1].OP6.keyboardScaling.breakPoint',
      'voice[1].OP6.detune',
    ])
  })

  it('salvages supported messages from a mixed file while strict import rejects the truncated tail', () => {
    const mixed = fixture('mixed-salvage-file')
    const report = analyzeSysexFile(mixed.bytes)

    expect(report.entries.map((entry) => entry.kind)).toEqual([
      'single-voice',
      'unsupported',
      'unsupported',
      'voice-bank',
    ])
    expect(report.ignoredByteCount).toBe(3)
    expect(() => importSysexFile(mixed.bytes)).toThrow(/ends inside a SysEx message/i)
  })

  it('keeps strict import fatal for nested and truncated messages', () => {
    expect(() => importSysexFile(fixture('nested-start').bytes)).toThrow(/new SysEx start byte/i)
    expect(() => importSysexFile(fixture('truncated-single').bytes)).toThrow(/ends inside a SysEx message/i)
  })
})
