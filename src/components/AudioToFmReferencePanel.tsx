import { useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import type { PreparedReferenceAudio } from '../audio/referenceAudio'
import { NearestPresetPanel } from './NearestPresetPanel'
import { ReferenceAudioInputPanel } from './ReferenceAudioInputPanel'

interface AudioToFmReferencePanelProps {
  onAuditionVoice: (voice: Dx7Voice | Promise<Dx7Voice>) => Promise<void>
  onStopAudition: () => Promise<void>
  onLoadVoice: (voice: Dx7Voice) => void
}

export function AudioToFmReferencePanel({
  onAuditionVoice,
  onStopAudition,
  onLoadVoice,
}: AudioToFmReferencePanelProps) {
  const [reference, setReference] = useState<PreparedReferenceAudio | null>(null)

  return (
    <div className="grid gap-4">
      <ReferenceAudioInputPanel onPrepared={setReference} />
      <NearestPresetPanel
        onAuditionVoice={onAuditionVoice}
        onLoadVoice={onLoadVoice}
        onStopAudition={onStopAudition}
        reference={reference}
      />
    </div>
  )
}
