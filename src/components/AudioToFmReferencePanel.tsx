import { useCallback, useEffect, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import type { Fm1FxState } from '../domain/fx'
import type { PreparedReferenceAudio } from '../audio/referenceAudio'
import { setPreparedReferenceAudio } from '../audio/preparedReferenceStore'
import { NearestPresetPanel } from './NearestPresetPanel'
import { ReconstructionAccelerationPanel } from './ReconstructionAccelerationPanel'
import { ReconstructionBenchmarkPanel } from './ReconstructionBenchmarkPanel'
import { ReconstructionBenchmarkSetPanel } from './ReconstructionBenchmarkSetPanel'
import { ReconstructionEvidenceRunPanel } from './ReconstructionEvidenceRunPanel'
import { ReferenceAudioInputPanel } from './ReferenceAudioInputPanel'

interface AudioToFmReferencePanelProps {
  fxState?: Fm1FxState
  onAuditionVoice: (voice: Dx7Voice | Promise<Dx7Voice>) => Promise<void>
  onStopAudition: () => Promise<void>
  onLoadVoice: (voice: Dx7Voice) => void
  onLoadVoiceWithFx?: (voice: Dx7Voice, fxState: Fm1FxState) => void
  onReferenceChange?: (reference: PreparedReferenceAudio | null) => void
}

export function AudioToFmReferencePanel({
  fxState,
  onAuditionVoice,
  onStopAudition,
  onLoadVoice,
  onLoadVoiceWithFx,
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
        {...(fxState === undefined ? {} : { fxState })}
        onAuditionVoice={onAuditionVoice}
        onLoadVoice={onLoadVoice}
        {...(onLoadVoiceWithFx === undefined ? {} : { onLoadVoiceWithFx })}
        onStopAudition={onStopAudition}
        reference={reference}
      />
      <ReconstructionBenchmarkPanel onAuditionVoice={onAuditionVoice} onStopAudition={onStopAudition} reference={reference} />
      <ReconstructionEvidenceRunPanel onAuditionVoice={onAuditionVoice} onStopAudition={onStopAudition} />
      <ReconstructionBenchmarkSetPanel onAuditionVoice={onAuditionVoice} onStopAudition={onStopAudition} />
      <ReconstructionAccelerationPanel onLoadVoice={onLoadVoice} reference={reference} />
    </div>
  )
}
