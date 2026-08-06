import type { Dx7Voice } from '../domain/voice'
import {
  DX7_BANK_VOICE_COUNT,
  encodeSingleVoiceMessage,
  encodeVoiceBankMessage,
} from '../sysex/dx7'
import { encodeAllNotesOff } from './fm1Protocol'
import type { MidiOutputTarget } from './output'

export type Dx7BulkTransferKind = 'single-voice' | 'voice-bank'

export interface Dx7BulkTransferResult {
  kind: Dx7BulkTransferKind
  midiChannel: number
  byteLength: number
  outputName: string
}

function assertMidiChannel(midiChannel: number): void {
  if (!Number.isInteger(midiChannel) || midiChannel < 1 || midiChannel > 16) {
    throw new RangeError(`MIDI channel must be from 1 to 16; received ${midiChannel}.`)
  }
}

async function sendDx7BulkMessage(
  output: MidiOutputTarget,
  message: Uint8Array,
  kind: Dx7BulkTransferKind,
  midiChannel: number,
): Promise<Dx7BulkTransferResult> {
  assertMidiChannel(midiChannel)
  await output.open()
  output.clear?.()
  output.send(encodeAllNotesOff(midiChannel))
  output.send(message)
  return {
    kind,
    midiChannel,
    byteLength: message.byteLength,
    outputName: output.name?.trim() || 'selected MIDI output',
  }
}

/**
 * Sends the standard Yamaha 155-byte edit-buffer voice as one 163-byte SysEx
 * message. The stock DX7 must have matching MIDI channel/System Info settings;
 * Memory Protect requirements remain a hardware-side responsibility.
 */
export async function sendSingleVoiceToDx7(
  output: MidiOutputTarget,
  voice: Dx7Voice,
  midiChannel = 1,
): Promise<Dx7BulkTransferResult> {
  assertMidiChannel(midiChannel)
  return sendDx7BulkMessage(
    output,
    encodeSingleVoiceMessage(voice, midiChannel - 1),
    'single-voice',
    midiChannel,
  )
}

/** Sends one standard Yamaha 4,104-byte, 32-voice bank SysEx message. */
export async function sendVoiceBankToDx7(
  output: MidiOutputTarget,
  voices: readonly Dx7Voice[],
  midiChannel = 1,
): Promise<Dx7BulkTransferResult> {
  assertMidiChannel(midiChannel)
  if (voices.length !== DX7_BANK_VOICE_COUNT) {
    throw new RangeError(`A Yamaha DX7 bank transfer requires exactly ${DX7_BANK_VOICE_COUNT} voices; received ${voices.length}.`)
  }
  return sendDx7BulkMessage(
    output,
    encodeVoiceBankMessage(voices, midiChannel - 1),
    'voice-bank',
    midiChannel,
  )
}
