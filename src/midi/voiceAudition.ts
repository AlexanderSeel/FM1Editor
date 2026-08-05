import type { Dx7Voice } from '../domain/voice'
import { encodeSingleVoiceData } from '../sysex/dx7'
import {
  encodeAllNotesOff,
  encodeFm1ParameterWrite,
  encodeNoteOff,
  encodeNoteOn,
  encodeProgramChange,
} from './fm1Protocol'
import type { MidiOutputTarget } from './output'

const DEFAULT_PARAMETER_INTERVAL_MS = 6

export interface Fm1VoiceParameterWrite {
  parameter: number
  value: number
  message: Uint8Array
}

export interface VoiceSendOptions {
  parameterIntervalMs?: number
  onProgress?: (completed: number, total: number) => void
  wait?: (milliseconds: number) => Promise<void>
}

export interface VoiceSendResult {
  protocol: 'fm1-parameter-stream'
  messageCount: number
  durationMs: number
  outputName: string
}

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

function assertParameterInterval(intervalMs: number): void {
  if (!Number.isFinite(intervalMs) || intervalMs < 0 || intervalMs > 1000) {
    throw new RangeError(`Parameter interval must be from 0 to 1000 ms; received ${intervalMs}.`)
  }
}

function defaultWait(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve()
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export function buildFm1VoiceParameterWrites(voice: Dx7Voice): readonly Fm1VoiceParameterWrite[] {
  const data = encodeSingleVoiceData(voice)
  return Array.from(data, (value, parameter) => ({
    parameter,
    value,
    message: encodeFm1ParameterWrite(parameter, value),
  }))
}

/**
 * Sends the current voice through the only live-edit SysEx frame documented by
 * M-VAVE: one parameter write per edit-buffer byte. The semantic mapping of
 * IDs 0..154 still needs physical FM-1 verification, so the UI must continue
 * to present this operation as experimental.
 */
export async function sendVoiceToFm1(
  output: MidiOutputTarget,
  voice: Dx7Voice,
  options: VoiceSendOptions = {},
): Promise<VoiceSendResult> {
  const parameterIntervalMs = options.parameterIntervalMs ?? DEFAULT_PARAMETER_INTERVAL_MS
  const wait = options.wait ?? defaultWait
  assertParameterInterval(parameterIntervalMs)

  const writes = buildFm1VoiceParameterWrites(voice)
  await output.open()
  output.clear?.()
  output.send(encodeAllNotesOff(1))

  const startedAt = performance.now()
  for (let index = 0; index < writes.length; index += 1) {
    const write = writes[index]
    if (!write) continue
    output.send(write.message)
    options.onProgress?.(index + 1, writes.length)
    if (index + 1 < writes.length) await wait(parameterIntervalMs)
  }

  return {
    protocol: 'fm1-parameter-stream',
    messageCount: writes.length,
    durationMs: Math.max(0, performance.now() - startedAt),
    outputName: output.name?.trim() || 'selected MIDI output',
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
