import type { Dx7Voice } from '../domain/voice'
import {
  decodeSingleVoiceMessage,
  decodeVoiceBankMessage,
  DX7_BANK_MESSAGE_LENGTH,
  DX7_SINGLE_MESSAGE_LENGTH,
  Dx7SysexError,
} from './dx7'
import {
  normalizeLegacyVoiceWithReport,
  type Dx7CompatibilityNormalization,
} from './normalizeLegacyVoice'

export interface ImportedSingleVoice {
  kind: 'single-voice'
  channel: number
  voice: Dx7Voice
  raw: Uint8Array
  normalizations: readonly Dx7CompatibilityNormalization[]
}

export interface ImportedVoiceBank {
  kind: 'voice-bank'
  channel: number
  voices: readonly Dx7Voice[]
  raw: Uint8Array
  normalizations: readonly Dx7CompatibilityNormalization[]
}

export interface UnsupportedSysexMessage {
  kind: 'unsupported'
  raw: Uint8Array
  reason: string
}

export type ImportedSysexMessage = ImportedSingleVoice | ImportedVoiceBank | UnsupportedSysexMessage

export type SysexDiagnosticSeverity = 'info' | 'warning' | 'error'

export type SysexDiagnosticCode =
  | 'ignored-bytes'
  | 'stray-end'
  | 'nested-start'
  | 'incomplete-message'
  | 'unsupported-message'
  | 'decode-error'
  | 'compatibility-normalization'

export interface SysexDiagnostic {
  code: SysexDiagnosticCode
  severity: SysexDiagnosticSeverity
  message: string
  offset: number
  messageIndex?: number
  length?: number
  manufacturer?: number
  format?: number
}

export interface SysexImportReport {
  entries: readonly ImportedSysexMessage[]
  diagnostics: readonly SysexDiagnostic[]
  completeMessageCount: number
  supportedMessageCount: number
  ignoredByteCount: number
}

interface ExtractedSysexMessage {
  raw: Uint8Array
  start: number
  end: number
  index: number
}

interface ExtractionReport {
  messages: readonly ExtractedSysexMessage[]
  diagnostics: readonly SysexDiagnostic[]
  ignoredByteCount: number
}

interface DecodedMessageResult {
  entry: ImportedSysexMessage
  diagnostics: readonly SysexDiagnostic[]
}

function hexByte(value: number | undefined): string {
  return value === undefined ? 'unknown' : `0x${value.toString(16).padStart(2, '0').toUpperCase()}`
}

function scanSysexFile(file: Uint8Array): ExtractionReport {
  const messages: ExtractedSysexMessage[] = []
  const diagnostics: SysexDiagnostic[] = []
  let start: number | null = null
  let ignoredByteCount = 0
  let firstIgnoredOffset: number | null = null

  for (let offset = 0; offset < file.length; offset += 1) {
    const value = file[offset]

    if (value === 0xf0) {
      if (start !== null) {
        diagnostics.push({
          code: 'nested-start',
          severity: 'error',
          message: `A new SysEx start byte was found before the message at offset ${start} ended.`,
          offset,
          length: offset - start,
        })
      }
      start = offset
      continue
    }

    if (value === 0xf7) {
      if (start === null) {
        diagnostics.push({
          code: 'stray-end',
          severity: 'warning',
          message: `Ignored a SysEx end byte without a matching start at offset ${offset}.`,
          offset,
          length: 1,
        })
        ignoredByteCount += 1
        firstIgnoredOffset ??= offset
        continue
      }

      const index = messages.length
      messages.push({
        raw: file.slice(start, offset + 1),
        start,
        end: offset + 1,
        index,
      })
      start = null
      continue
    }

    if (start === null) {
      ignoredByteCount += 1
      firstIgnoredOffset ??= offset
    }
  }

  if (start !== null) {
    diagnostics.push({
      code: 'incomplete-message',
      severity: 'error',
      message: `The file ends inside a SysEx message that started at offset ${start}.`,
      offset: start,
      length: file.length - start,
    })
  }

  if (ignoredByteCount > 0 && firstIgnoredOffset !== null) {
    diagnostics.unshift({
      code: 'ignored-bytes',
      severity: 'info',
      message: `Ignored ${ignoredByteCount} byte${ignoredByteCount === 1 ? '' : 's'} outside complete SysEx messages.`,
      offset: firstIgnoredOffset,
      length: ignoredByteCount,
    })
  }

  return { messages, diagnostics, ignoredByteCount }
}

function createNormalizationDiagnostics(
  normalizations: readonly Dx7CompatibilityNormalization[],
  message: ExtractedSysexMessage,
): SysexDiagnostic[] {
  return normalizations.map((normalization) => ({
    code: 'compatibility-normalization',
    severity: 'warning',
    message: `Normalized ${normalization.path} from ${normalization.originalValue} to ${normalization.normalizedValue} for Yamaha DX7 compatibility.`,
    offset: message.start,
    messageIndex: message.index,
    length: message.raw.length,
    ...(message.raw[1] === undefined ? {} : { manufacturer: message.raw[1] }),
    ...(message.raw[3] === undefined ? {} : { format: message.raw[3] }),
  }))
}

function prefixNormalization(
  normalization: Dx7CompatibilityNormalization,
  voiceIndex: number,
): Dx7CompatibilityNormalization {
  return {
    ...normalization,
    path: `voice[${voiceIndex + 1}].${normalization.path}`,
  }
}

function decodeMessage(message: ExtractedSysexMessage): DecodedMessageResult {
  const { raw, start, index } = message
  const manufacturer = raw[1]
  const format = raw[3]

  try {
    if (raw.length === DX7_SINGLE_MESSAGE_LENGTH && format === 0x00) {
      const decoded = decodeSingleVoiceMessage(raw)
      const normalized = normalizeLegacyVoiceWithReport(decoded.voice)
      return {
        entry: {
          kind: 'single-voice',
          ...decoded,
          voice: normalized.voice,
          raw,
          normalizations: normalized.normalizations,
        },
        diagnostics: createNormalizationDiagnostics(normalized.normalizations, message),
      }
    }
    if (raw.length === DX7_BANK_MESSAGE_LENGTH && format === 0x09) {
      const normalizedVoices = decodedVoiceBank(message)
      return {
        entry: {
          kind: 'voice-bank',
          channel: normalizedVoices.channel,
          voices: normalizedVoices.voices,
          raw,
          normalizations: normalizedVoices.normalizations,
        },
        diagnostics: createNormalizationDiagnostics(normalizedVoices.normalizations, message),
      }
    }

    const reason = `Unsupported SysEx message (${raw.length} bytes, manufacturer ${hexByte(manufacturer)}, format ${hexByte(format)}).`
    return {
      entry: { kind: 'unsupported', raw, reason },
      diagnostics: [{
        code: 'unsupported-message',
        severity: 'warning',
        message: reason,
        offset: start,
        messageIndex: index,
        length: raw.length,
        ...(manufacturer === undefined ? {} : { manufacturer }),
        ...(format === undefined ? {} : { format }),
      }],
    }
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'Could not parse SysEx message.'
    return {
      entry: { kind: 'unsupported', raw, reason },
      diagnostics: [{
        code: 'decode-error',
        severity: 'error',
        message: reason,
        offset: start,
        messageIndex: index,
        length: raw.length,
        ...(manufacturer === undefined ? {} : { manufacturer }),
        ...(format === undefined ? {} : { format }),
      }],
    }
  }
}

function decodedVoiceBank(message: ExtractedSysexMessage): {
  channel: number
  voices: readonly Dx7Voice[]
  normalizations: readonly Dx7CompatibilityNormalization[]
} {
  const decoded = decodeVoiceBankMessage(message.raw)
  const normalizations: Dx7CompatibilityNormalization[] = []
  const voices = decoded.voices.map((voice, voiceIndex) => {
    const normalized = normalizeLegacyVoiceWithReport(voice)
    normalizations.push(...normalized.normalizations.map((entry) => prefixNormalization(entry, voiceIndex)))
    return normalized.voice
  })
  return { channel: decoded.channel, voices, normalizations }
}

export function analyzeSysexFile(file: Uint8Array): SysexImportReport {
  const extraction = scanSysexFile(file)
  const decoded = extraction.messages.map(decodeMessage)
  const entries = decoded.map((result) => result.entry)
  const diagnostics = [
    ...extraction.diagnostics,
    ...decoded.flatMap((result) => result.diagnostics),
  ]

  return {
    entries,
    diagnostics,
    completeMessageCount: extraction.messages.length,
    supportedMessageCount: entries.filter((entry) => entry.kind !== 'unsupported').length,
    ignoredByteCount: extraction.ignoredByteCount,
  }
}

export function extractSysexMessages(file: Uint8Array): Uint8Array[] {
  const report = scanSysexFile(file)
  const fatal = report.diagnostics.find((diagnostic) =>
    diagnostic.code === 'incomplete-message' || diagnostic.code === 'nested-start',
  )
  if (fatal) throw new Dx7SysexError(fatal.message)
  if (report.messages.length === 0) throw new Dx7SysexError('The file does not contain a complete SysEx message.')
  return report.messages.map((message) => message.raw)
}

export function importSysexFile(file: Uint8Array): ImportedSysexMessage[] {
  extractSysexMessages(file)
  return [...analyzeSysexFile(file).entries]
}
