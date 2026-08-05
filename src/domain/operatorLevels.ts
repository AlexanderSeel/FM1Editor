export type SixOperatorLevels = readonly [number, number, number, number, number, number]

function assertOperatorIndex(operatorIndex: number): void {
  if (!Number.isInteger(operatorIndex) || operatorIndex < 0 || operatorIndex > 5) {
    throw new Error(`Operator index must be an integer from 0 to 5; received ${operatorIndex}.`)
  }
}

function assertLevel(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    throw new Error(`${label} must be an integer from 0 to 99; received ${value}.`)
  }
}

export function toSixOperatorLevels(values: readonly number[]): SixOperatorLevels {
  if (values.length !== 6) throw new Error(`Exactly six operator levels are required; received ${values.length}.`)
  values.forEach((value, index) => assertLevel(value, `Operator ${index + 1} level`))
  return [...values] as [number, number, number, number, number, number]
}

export function toggleOperatorEnabled(
  levels: SixOperatorLevels,
  operatorIndex: number,
  rememberedLevel: number,
): { levels: SixOperatorLevels; rememberedLevel: number } {
  assertOperatorIndex(operatorIndex)
  assertLevel(rememberedLevel, 'Remembered operator level')

  const currentLevel = levels[operatorIndex]
  const next = [...levels] as [number, number, number, number, number, number]
  if (currentLevel > 0) {
    next[operatorIndex] = 0
    return { levels: next, rememberedLevel: currentLevel }
  }

  next[operatorIndex] = rememberedLevel > 0 ? rememberedLevel : 99
  return { levels: next, rememberedLevel: next[operatorIndex] }
}

export function createSoloOperatorLevels(
  baseLevels: SixOperatorLevels,
  operatorIndex: number,
  rememberedLevel: number,
): SixOperatorLevels {
  assertOperatorIndex(operatorIndex)
  assertLevel(rememberedLevel, 'Remembered operator level')
  const targetLevel = baseLevels[operatorIndex] > 0
    ? baseLevels[operatorIndex]
    : rememberedLevel > 0
      ? rememberedLevel
      : 99

  return baseLevels.map((_, index) => index === operatorIndex ? targetLevel : 0) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
}

export function isSoloLevelShape(levels: SixOperatorLevels, operatorIndex: number): boolean {
  assertOperatorIndex(operatorIndex)
  return levels.every((level, index) => index === operatorIndex || level === 0)
}
