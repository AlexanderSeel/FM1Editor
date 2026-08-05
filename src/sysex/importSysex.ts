import type { Dx7Voice } from '../domain/voice'
import {
  decodeSingleVoiceMessage,
  decodeVoiceBankMessage,
  DX7_BANK_MESSAGE_LENGTH,
  DX7_SINGLE_MESSAGE_LENGTH,
  Dx7SysexError,
} from './dx7'

export interface ImportedSingleVoice {
  kind: 'single-voice'
  channel: number
  voice: Dx7Voice
  raw: Uint8Array
}

export interface ImportedVoiceBank {
  kind: 'voice-bank'
  channel: number
  voices: readonly Dx7Voice[]
  raw: Uint8Array
}

export interface UnsupportedSysexMessage {
  kind: 'unsupported'
  raw: Uint8Array
  reason: string
}

export type ImportedSysexMessage = ImportedSingleVoice | ImportedVoiceBank | UnsupportedSysexMessage

export function extractSysexMessages(file: Uint8Array): Uint8Array[] {
  const messages: Uint8Array[] = []
  let start = -1

  for (let index = 0; index < file.length; index += 1) {
    const value = file[index]
    if (value === 0xf0) start = index
    if (value === 0xf7 && start >= 0) {
      messages.push(file.slice(start, index + 1))
      start = -1
    }
  }

  if (start >= 0) throw new Dx7SysexError('The file ends inside an incomplete SysEx message.')
  if (messages.length === 0) throw new Dx7SysexError('The file does not contain a complete SysEx message.')
  return messages
}

export function importSysexFile(file: Uint8Array): ImportedSysexMessage[] {
  return extractSysexMessages(file).map((message): ImportedSysexMessage => {
    try {
      if (message.length === DX7_SINGLE_MESSAGE_LENGTH && message[3] === 0x00) {
        const decoded = decodeSingleVoiceMessage(message)
        return { kind: 'single-voice', ...decoded, raw: message }
      }
      if (message.length === DX7_BANK_MESSAGE_LENGTH && message[3] === 0x09) {
        const decoded = decodeVoiceBankMessage(message)
        return { kind: 'voice-bank', ...decoded, raw: message }
      }
      return {
        kind: 'unsupported',
        raw: message,
        reason: `Unsupported SysEx message (${message.length} bytes, format ${message[3] ?? 'unknown'}).`,
      }
    } catch (cause) {
      return {
        kind: 'unsupported',
        raw: message,
        reason: cause instanceof Error ? cause.message : 'Could not parse SysEx message.',
      }
    }
  })
}
