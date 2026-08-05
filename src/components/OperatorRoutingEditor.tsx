import { useEffect, useRef, useState } from 'react'
import {
  createSoloOperatorLevels,
  isSoloLevelShape,
  toSixOperatorLevels,
  toggleOperatorEnabled,
  type SixOperatorLevels,
} from '../domain/operatorLevels'
import type { Dx7Operator, Dx7Voice } from '../domain/voice'
import { AlgorithmGraph } from './AlgorithmGraph'

interface OperatorRoutingEditorProps {
  voice: Dx7Voice
  selectedOperator: number
  onChange: (voice: Dx7Voice) => void
  onSelect: (operatorIndex: number) => void
}

function cloneOperators(voice: Dx7Voice): [Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator] {
  return voice.operators.map((operator) => ({
    ...operator,
    envelope: {
      rates: [...operator.envelope.rates] as Dx7Operator['envelope']['rates'],
      levels: [...operator.envelope.levels] as Dx7Operator['envelope']['levels'],
    },
    keyboardScaling: { ...operator.keyboardScaling },
  })) as [Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator, Dx7Operator]
}

function voiceLevels(voice: Dx7Voice): SixOperatorLevels {
  return toSixOperatorLevels(voice.operators.map((operator) => operator.outputLevel))
}

export function OperatorRoutingEditor({
  voice,
  selectedOperator,
  onChange,
  onSelect,
}: OperatorRoutingEditorProps) {
  const rememberedLevels = useRef<number[]>(
    voice.operators.map((operator) => operator.outputLevel > 0 ? operator.outputLevel : 99),
  )
  const soloSnapshot = useRef<SixOperatorLevels | null>(null)
  const [soloOperator, setSoloOperator] = useState<number | null>(null)

  useEffect(() => {
    voice.operators.forEach((operator, index) => {
      if (operator.outputLevel > 0) rememberedLevels.current[index] = operator.outputLevel
    })

    if (soloOperator !== null && !isSoloLevelShape(voiceLevels(voice), soloOperator)) {
      soloSnapshot.current = null
      setSoloOperator(null)
    }
  }, [soloOperator, voice])

  const commitLevels = (levels: SixOperatorLevels) => {
    const operators = cloneOperators(voice)
    operators.forEach((operator, index) => {
      operator.outputLevel = levels[index]
    })
    onChange({ ...voice, operators })
  }

  const toggleEnabled = (operatorIndex: number) => {
    if (!voice.operators[operatorIndex]) return
    const result = toggleOperatorEnabled(
      voiceLevels(voice),
      operatorIndex,
      rememberedLevels.current[operatorIndex] ?? 99,
    )
    rememberedLevels.current[operatorIndex] = result.rememberedLevel
    commitLevels(result.levels)
  }

  const toggleSolo = (operatorIndex: number) => {
    if (!voice.operators[operatorIndex]) return

    if (soloOperator === operatorIndex && soloSnapshot.current) {
      const restore = soloSnapshot.current
      soloSnapshot.current = null
      setSoloOperator(null)
      commitLevels(restore)
      return
    }

    const baseLevels = soloSnapshot.current ?? voiceLevels(voice)
    soloSnapshot.current = baseLevels
    const soloLevels = createSoloOperatorLevels(
      baseLevels,
      operatorIndex,
      rememberedLevels.current[operatorIndex] ?? 99,
    )
    setSoloOperator(operatorIndex)
    onSelect(operatorIndex)
    commitLevels(soloLevels)
  }

  return (
    <AlgorithmGraph
      algorithm={voice.algorithm}
      onSelect={onSelect}
      onSolo={toggleSolo}
      onToggleEnabled={toggleEnabled}
      operators={voice.operators}
      selectedOperator={selectedOperator}
      soloOperator={soloOperator}
    />
  )
}
