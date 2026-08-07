import { useCallback, useEffect, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import type { PreparedReferenceAudio } from '../audio/referenceAudio'
import { setPreparedReferenceAudio } from '../audio/preparedReferenceStore'
import { NearestPresetPanel } from './NearestPresetPanel'
import { ReferenceAudioInputPanel } from './ReferenceAudioInputPanel'

interface AudioToFmReferencePanelProps {
  onAuditionVoice: (voice: Dx7Voice | Promise<Dx7Voice>) => Promise<void>
  onStopAudition: () => Promise<void>
  onLoadVoice: (voice: Dx7Voice) => void
  onReferenceChange?: (reference: PreparedReferenceAudio | null) => void
}

export function AudioToFmReferencePanel({
  onAuditionVoice,
  onStopAudition,
  onLoadVoice,
  onReferenceChange,
}: AudioToFmReferencePanelProps) {
  const [reference, setReference] = useState<PreparedReferenceAudio | null>(null)

  const handlePrepared = useCallback((nextReference: PreparedReferenceAudio | null) => {
    setReference(nextReference)
    setPreparedReferenceAudio(nextReference)
    onReferenceChange?.(nextReference)
  }, [onReferenceChange])

  useEffect(() => () => {
    setPreparedReferenceAudio(null)
  }, [])

  return (
    <div className="grid gap-4">
      <ReferenceAudioInputPanel onPrepared={handlePrepared} />
      <NearestPresetPanel
        onAuditionVoice={onAuditionVoice}
        onLoadVoice={onLoadVoice}
        onStopAudition={onStopAudition}
        reference={reference}
      />
    </div>
  )
}
