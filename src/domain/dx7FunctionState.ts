export type Dx7MonoPolyMode = 'poly' | 'mono'
export type Dx7PortamentoMode = 'retain' | 'follow'

export interface Dx7ControllerAssignment {
  pitch: boolean
  amplitude: boolean
  egBias: boolean
}

export interface Dx7ControllerFunction {
  range: number
  assignment: Dx7ControllerAssignment
}

export interface Dx7FunctionState {
  monoPolyMode: Dx7MonoPolyMode
  pitchBendRange: number
  pitchBendStep: number
  portamentoMode: Dx7PortamentoMode
  portamentoGlissando: boolean
  portamentoTime: number
  modulationWheel: Dx7ControllerFunction
  footControl: Dx7ControllerFunction
  breathControl: Dx7ControllerFunction
  aftertouch: Dx7ControllerFunction
}

export type Dx7FunctionParameterId =
  | 64 | 65 | 66 | 67 | 68 | 69
  | 70 | 71 | 72 | 73 | 74 | 75 | 76 | 77

export interface Dx7FunctionParameterValue {
  parameter: Dx7FunctionParameterId
  value: number
}

const EMPTY_ASSIGNMENT: Dx7ControllerAssignment = {
  pitch: false,
  amplitude: false,
  egBias: false,
}

/** Initializes a detached function state at documented minimum values. */
export function createInitializedDx7FunctionState(): Dx7FunctionState {
  return {
    monoPolyMode: 'poly',
    pitchBendRange: 0,
    pitchBendStep: 0,
    portamentoMode: 'retain',
    portamentoGlissando: false,
    portamentoTime: 0,
    modulationWheel: { range: 0, assignment: { ...EMPTY_ASSIGNMENT } },
    footControl: { range: 0, assignment: { ...EMPTY_ASSIGNMENT } },
    breathControl: { range: 0, assignment: { ...EMPTY_ASSIGNMENT } },
    aftertouch: { range: 0, assignment: { ...EMPTY_ASSIGNMENT } },
  }
}

function assertIntegerRange(label: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}; received ${value}.`)
  }
}

function assertMonoPolyMode(value: string): asserts value is Dx7MonoPolyMode {
  if (value !== 'poly' && value !== 'mono') {
    throw new RangeError(`DX7 mono/poly mode must be poly or mono; received ${value}.`)
  }
}

function assertPortamentoMode(value: string): asserts value is Dx7PortamentoMode {
  if (value !== 'retain' && value !== 'follow') {
    throw new RangeError(`DX7 portamento mode must be retain or follow; received ${value}.`)
  }
}

export function encodeDx7ControllerAssignment(assignment: Dx7ControllerAssignment): number {
  return (assignment.pitch ? 0x01 : 0)
    | (assignment.amplitude ? 0x02 : 0)
    | (assignment.egBias ? 0x04 : 0)
}

export function decodeDx7ControllerAssignment(value: number): Dx7ControllerAssignment {
  assertIntegerRange('DX7 controller assignment', value, 0, 7)
  return {
    pitch: (value & 0x01) !== 0,
    amplitude: (value & 0x02) !== 0,
    egBias: (value & 0x04) !== 0,
  }
}

function validateController(label: string, controller: Dx7ControllerFunction): void {
  assertIntegerRange(`${label} range`, controller.range, 0, 99)
  encodeDx7ControllerAssignment(controller.assignment)
}

export function validateDx7FunctionState(state: Dx7FunctionState): void {
  assertMonoPolyMode(state.monoPolyMode)
  assertPortamentoMode(state.portamentoMode)
  assertIntegerRange('DX7 pitch bend range', state.pitchBendRange, 0, 12)
  assertIntegerRange('DX7 pitch bend step', state.pitchBendStep, 0, 12)
  assertIntegerRange('DX7 portamento time', state.portamentoTime, 0, 99)
  validateController('DX7 modulation wheel', state.modulationWheel)
  validateController('DX7 foot control', state.footControl)
  validateController('DX7 breath control', state.breathControl)
  validateController('DX7 aftertouch', state.aftertouch)
}

/**
 * Returns documented function parameter values without constructing or sending
 * SysEx. These values remain separate from the 155-byte voice model.
 */
export function getDx7FunctionParameterValues(state: Dx7FunctionState): readonly Dx7FunctionParameterValue[] {
  validateDx7FunctionState(state)
  return [
    { parameter: 64, value: state.monoPolyMode === 'mono' ? 1 : 0 },
    { parameter: 65, value: state.pitchBendRange },
    { parameter: 66, value: state.pitchBendStep },
    { parameter: 67, value: state.portamentoMode === 'follow' ? 1 : 0 },
    { parameter: 68, value: state.portamentoGlissando ? 1 : 0 },
    { parameter: 69, value: state.portamentoTime },
    { parameter: 70, value: state.modulationWheel.range },
    { parameter: 71, value: encodeDx7ControllerAssignment(state.modulationWheel.assignment) },
    { parameter: 72, value: state.footControl.range },
    { parameter: 73, value: encodeDx7ControllerAssignment(state.footControl.assignment) },
    { parameter: 74, value: state.breathControl.range },
    { parameter: 75, value: encodeDx7ControllerAssignment(state.breathControl.assignment) },
    { parameter: 76, value: state.aftertouch.range },
    { parameter: 77, value: encodeDx7ControllerAssignment(state.aftertouch.assignment) },
  ]
}
