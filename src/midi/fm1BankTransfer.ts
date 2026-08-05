import type { Dx7Voice } from '../domain/voice'
import { encodeVoiceBankMessage } from '../sysex/dx7'
import { encodeAllNotesOff } from './fm1Protocol'
import type { MidiOutputTarget } from './output'

export type Fm1BankLetter = 'A' | 'B' | 'C' | 'D'

export interface Fm1PresetLocation {
  bank: Fm1BankLetter
  slot: number
  preset: number
}

export interface Fm1BankTransferResult extends Fm1PresetLocation {
  outputName: string
  byteLength: number
  mergedBank: readonly Dx7Voice[]
}

const BANK_LETTERS: readonly Fm1BankLetter[] = ['A', 'B', 'C', 'D']

function assertBankSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > 32) {
    throw new RangeError(`Bank slot must be from 1 to 32; received ${slot}.`)
  }
}

export function resolveFm1PresetLocation(bank: Fm1BankLetter, slot: number): Fm1PresetLocation {
  assertBankSlot(slot)
  const bankIndex = BANK_LETTERS.indexOf(bank)
  if (bankIndex < 0) throw new RangeError(`Unsupported FM-1 bank ${String(bank)}.`)
  return { bank, slot, preset: bankIndex * 32 + slot }
}

export function mergeVoiceIntoFm1Bank(
  baseBank: readonly Dx7Voice[],
  voice: Dx7Voice,
  slot: number,
): readonly Dx7Voice[] {
  if (baseBank.length !== 32) {
    throw new RangeError(`A complete FM-1 transfer base must contain 32 voices; received ${baseBank.length}.`)
  }
  assertBankSlot(slot)
  return baseBank.map((candidate, index) => index === slot - 1 ? voice : candidate)
}

export async function sendMergedBankToFm1(
  output: MidiOutputTarget,
  baseBank: readonly Dx7Voice[],
  voice: Dx7Voice,
  bank: Fm1BankLetter,
  slot: number,
  noteChannel = 1,
): Promise<Fm1BankTransferResult> {
  const location = resolveFm1PresetLocation(bank, slot)
  const mergedBank = mergeVoiceIntoFm1Bank(baseBank, voice, slot)
  const message = encodeVoiceBankMessage(mergedBank)

  await output.open()
  output.clear?.()
  output.send(encodeAllNotesOff(noteChannel))
  output.send(message)

  return {
    ...location,
    outputName: output.name?.trim() || 'selected MIDI output',
    byteLength: message.byteLength,
    mergedBank,
  }
}
