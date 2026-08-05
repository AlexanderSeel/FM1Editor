import { useEffect, useRef, useState } from 'react'
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

export function OperatorRoutingEditor({
  voice,
  selectedOperator,
  onChange,
  onSelect,
}: OperatorRoutingEditorProps) {
  const rememberedLevels = useRef<number[]>(
    voice.operators.map((operator) => operator.outputLevel > 0 ? operator.outputLevel : 99),
  )
  const soloSnapshot = useRef<number[] | null>(null)
  const [soloOperator, setSoloOperator] = useState<number | null>(null)

  useEffect(() => {
    voice.operators.forEach((operator, index) => {
      if (operator.outputLevel > 0) rememberedLevels.current[index] = operator.outputLevel
    })

    if (soloOperator !== null) {
      const soloShapeStillActive = voice.operators.every(
        (operator, index) => index === soloOperator || operator.outputLevel === 0,
      )
      if (!soloShapeStillActive) {
        soloSnapshot.current = null
        setSoloOperator(null)
      }
    }
  }, [soloOperator, voice.operators])

  const commitLevels = (levels: readonly number[]) => {
    const operators = cloneOperators(voice)
    operators.forEach((operator, index) => {
      operator.outputLevel = levels[index] ?? operator.outputLevel
    })
    onChange({ ...voice, operators })
  }

  const toggleEnabled = (operatorIndex: number) => {
    const operator = voice.operators[operatorIndex]
    if (!operator) return

    const levels = voice.operators.map((candidate) => candidate.outputLevel)
    if (operator.outputLevel > 0) {
      rememberedLevels.current[operatorIndex] = operator.outputLevel
      levels[operatorIndex] = 0
    } else {
      levels[operatorIndex] = rememberedLevels.current[operatorIndex] ?? 99
    }
    commitLevels(levels)
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

    const baseLevels = soloSnapshot.current ?? voice.operators.map((operator) => operator.outputLevel)
    soloSnapshot.current = [...baseLevels]
    const targetLevel = baseLevels[operatorIndex] && baseLevels[operatorIndex] > 0
      ? baseLevels[operatorIndex]
      : rememberedLevels.current[operatorIndex] ?? 99
    const soloLevels = baseLevels.map((_, index) => index === operatorIndex ? targetLevel : 0)
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
