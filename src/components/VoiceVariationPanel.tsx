import { useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import {
  cloneDx7Voice,
  createInitializedVoiceVariant,
  INITIALIZED_VOICE_VARIANTS,
  mutateVoice,
  randomizeVoice,
  type InitializedVoiceVariantId,
  type VoiceMutationAmount,
} from '../domain/voiceVariations'

interface VoiceVariationPanelProps {
  voice: Dx7Voice
  onChange: (voice: Dx7Voice) => void
}

type ComparisonSlot = 'A' | 'B'

export function VoiceVariationPanel({ voice, onChange }: VoiceVariationPanelProps) {
  const [variant, setVariant] = useState<InitializedVoiceVariantId>('basic-sine')
  const [mutationAmount, setMutationAmount] = useState<VoiceMutationAmount>('subtle')
  const [slotA, setSlotA] = useState(() => cloneDx7Voice(voice))
  const [slotB, setSlotB] = useState<Dx7Voice | null>(null)
  const [activeSlot, setActiveSlot] = useState<ComparisonSlot>('A')

  const stageComparison = (next: Dx7Voice) => {
    setSlotA(cloneDx7Voice(voice))
    setSlotB(cloneDx7Voice(next))
    setActiveSlot('B')
    onChange(next)
  }

  const recall = (slot: ComparisonSlot) => {
    const stored = slot === 'A' ? slotA : slotB
    if (!stored) return
    setActiveSlot(slot)
    onChange(cloneDx7Voice(stored))
  }

  const store = (slot: ComparisonSlot) => {
    const snapshot = cloneDx7Voice(voice)
    if (slot === 'A') setSlotA(snapshot)
    else setSlotB(snapshot)
    setActiveSlot(slot)
  }

  return (
    <section className="fm1-variation-panel grid gap-3 border p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="fm1-hardware-label text-[10px] text-lime-200">Voice laboratory</p>
          <h3 className="mt-1 text-base font-black text-white">Variations and A/B comparison</h3>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-400">
            Generated voices stay inside valid DX7 parameter ranges. Each generate action stores the current voice in A and the result in B, so both can be compared immediately.
          </p>
        </div>
        <div className="grid min-w-[190px] grid-cols-2 gap-1.5" aria-label="Voice comparison slots">
          {(['A', 'B'] as const).map((slot) => {
            const available = slot === 'A' || slotB !== null
            const stored = slot === 'A' ? slotA : slotB
            return (
              <button
                aria-pressed={activeSlot === slot}
                className="min-w-0 px-3 py-2 text-left"
                data-active={activeSlot === slot}
                disabled={!available}
                key={slot}
                onClick={() => recall(slot)}
                title={stored ? `Recall comparison ${slot}: ${stored.name}` : `Comparison ${slot} is empty`}
                type="button"
              >
                <span className="block text-[10px] font-black">{slot}</span>
                <span className="mt-0.5 block truncate font-mono text-[9px] opacity-70">{stored?.name ?? 'EMPTY'}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1.25fr)_auto_minmax(0,0.8fr)_auto]">
        <label className="grid gap-1.5 border border-white/8 bg-black/15 p-2.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-400">
          Initialized voice
          <select
            aria-label="Initialized voice variant"
            onChange={(event) => setVariant(event.target.value as InitializedVoiceVariantId)}
            value={variant}
          >
            {INITIALIZED_VOICE_VARIANTS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <button
          className="self-stretch px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em]"
          onClick={() => stageComparison(createInitializedVoiceVariant(variant))}
          type="button"
        >
          Load init
        </button>

        <label className="grid gap-1.5 border border-white/8 bg-black/15 p-2.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-400">
          Mutation amount
          <select
            aria-label="Mutation amount"
            onChange={(event) => setMutationAmount(event.target.value as VoiceMutationAmount)}
            value={mutationAmount}
          >
            <option value="subtle">Subtle</option>
            <option value="medium">Medium</option>
            <option value="strong">Strong</option>
          </select>
        </label>
        <button
          className="self-stretch px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em]"
          onClick={() => stageComparison(mutateVoice(voice, mutationAmount))}
          type="button"
        >
          Mutate
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
        <button
          className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em]"
          onClick={() => stageComparison(randomizeVoice())}
          type="button"
        >
          Randomize voice
        </button>
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
        <button className="px-3 py-2 text-[9px] uppercase tracking-[0.1em]" onClick={() => store('A')} type="button">Store current in A</button>
        <button className="px-3 py-2 text-[9px] uppercase tracking-[0.1em]" onClick={() => store('B')} type="button">Store current in B</button>
        <span className="ml-auto text-[9px] uppercase tracking-[0.1em] text-slate-500">Undo remains available for every applied variation</span>
      </div>
    </section>
  )
}
