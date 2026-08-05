import {
  encodeAllNotesOff,
  encodeNoteOff,
  encodeNoteOn,
  encodeProgramChange,
} from './fm1Protocol'
import type { MidiOutputTarget } from './output'

export interface PresetRecallResult {
  midiChannel: number
  preset: number
  outputName: string
}

function assertMidiChannel(midiChannel: number): void {
  if (!Number.isInteger(midiChannel) || midiChannel < 1 || midiChannel > 16) {
    throw new RangeError(`MIDI channel must be from 1 to 16; received ${midiChannel}.`)
  }
}

function assertPreset(preset: number): void {
  if (!Number.isInteger(preset) || preset < 1 || preset > 128) {
    throw new RangeError(`Preset must be from 1 to 128; received ${preset}.`)
  }
}

export async function recallFm1Preset(
  output: MidiOutputTarget,
  midiChannel: number,
  preset: number,
): Promise<PresetRecallResult> {
  assertMidiChannel(midiChannel)
  assertPreset(preset)
  await output.open()
  output.clear?.()
  output.send(encodeAllNotesOff(midiChannel))
  output.send(encodeProgramChange(midiChannel, preset - 1))
  return {
    midiChannel,
    preset,
    outputName: output.name?.trim() || 'selected MIDI output',
  }
}

export async function playFm1TestNote(
  output: MidiOutputTarget,
  midiChannel: number,
  note = 60,
  velocity = 100,
  durationMs = 450,
): Promise<void> {
  assertMidiChannel(midiChannel)
  if (!Number.isInteger(note) || note < 0 || note > 127) {
    throw new RangeError(`MIDI note must be from 0 to 127; received ${note}.`)
  }
  if (!Number.isInteger(velocity) || velocity < 1 || velocity > 127) {
    throw new RangeError(`MIDI velocity must be from 1 to 127; received ${velocity}.`)
  }
  if (!Number.isFinite(durationMs) || durationMs < 20 || durationMs > 10_000) {
    throw new RangeError(`Test-note duration must be from 20 to 10000 ms; received ${durationMs}.`)
  }

  await output.open()
  const now = performance.now()
  output.send(encodeNoteOn(midiChannel, note, velocity), now + 10)
  output.send(encodeNoteOff(midiChannel, note), now + durationMs)
}
