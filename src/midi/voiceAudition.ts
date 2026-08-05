import type { Dx7Voice } from '../domain/voice'
import { encodeSingleVoiceMessage } from '../sysex/dx7'
import type { MidiOutputTarget } from './output'

export interface VoiceSendResult {
  message: Uint8Array
  midiChannel: number
  outputName: string
}

export async function sendVoiceToFm1(
  output: MidiOutputTarget,
  voice: Dx7Voice,
  midiChannel: number,
): Promise<VoiceSendResult> {
  if (!Number.isInteger(midiChannel) || midiChannel < 1 || midiChannel > 16) {
    throw new RangeError(`MIDI channel must be from 1 to 16; received ${midiChannel}.`)
  }

  await output.open()
  const message = encodeSingleVoiceMessage(voice, midiChannel - 1)
  output.send(message)
  return {
    message,
    midiChannel,
    outputName: output.name?.trim() || 'selected MIDI output',
  }
}
