from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one marker, found {count}')
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/components/SequenceEditor.tsx',
    "import { useEffect, useMemo, useRef, useState } from 'react'",
    "import { useCallback, useEffect, useMemo, useRef, useState } from 'react'",
)
replace_once(
    'src/components/SequenceEditor.tsx',
    (
        "  const clearUiTimers = () => {\n"
        "    timersRef.current.forEach((timer) => window.clearTimeout(timer))\n"
        "    timersRef.current = []\n"
        "  }\n\n"
        "  const recordDrift = (expectedTimestamp: number) => {\n"
        "    const drift = Math.abs(performance.now() - expectedTimestamp)\n"
        "    setDiagnostics((current) => ({\n"
        "      ...current,\n"
        "      driftSamples: current.driftSamples + 1,\n"
        "      totalDriftMs: current.totalDriftMs + drift,\n"
        "      maximumDriftMs: Math.max(current.maximumDriftMs, drift),\n"
        "    }))\n"
        "  }\n\n"
        "  useEffect(() => () => {\n"
        "    clearUiTimers()\n"
        "    externalPlayerRef.current?.stop()\n"
        "  }, [])"
    ),
    (
        "  const clearUiTimers = useCallback(() => {\n"
        "    timersRef.current.forEach((timer) => window.clearTimeout(timer))\n"
        "    timersRef.current = []\n"
        "  }, [])\n\n"
        "  const recordDrift = useCallback((expectedTimestamp: number) => {\n"
        "    const drift = Math.abs(performance.now() - expectedTimestamp)\n"
        "    setDiagnostics((current) => ({\n"
        "      ...current,\n"
        "      driftSamples: current.driftSamples + 1,\n"
        "      totalDriftMs: current.totalDriftMs + drift,\n"
        "      maximumDriftMs: Math.max(current.maximumDriftMs, drift),\n"
        "    }))\n"
        "  }, [])\n\n"
        "  useEffect(() => () => {\n"
        "    clearUiTimers()\n"
        "    externalPlayerRef.current?.stop()\n"
        "  }, [clearUiTimers])"
    ),
)
replace_once(
    'src/components/SequenceEditor.tsx',
    "  }, [clockMode, output, sequence])",
    "  }, [clockMode, output, recordDrift, sequence])",
)
replace_once(
    'src/components/SequenceEditor.tsx',
    "title={`${formatNote(note)} · Step ${index + 1}${event?.shiftKey ? '' : ''}`}",
    "title={`${formatNote(note)} · Step ${index + 1}`}",
)

operations = Path('src/domain/sequenceOperations.ts')
text = operations.read_text()
replacement = """export function updateStepNotes(step: SequenceStep, note: number, additive: boolean): SequenceStep {
  const normalized = clampNote(note)
  const withoutNotes: Omit<SequenceStep, 'notes'> = {
    enabled: step.enabled,
    note: step.note,
    velocity: step.velocity,
    gate: step.gate,
    tie: step.tie,
  }
  if (!additive) return { ...withoutNotes, enabled: true, note: normalized }
  const current = [...getStepNotes(step)]
  const existingIndex = current.indexOf(normalized)
  if (existingIndex >= 0) current.splice(existingIndex, 1)
  else if (current.length < 6) current.push(normalized)
  current.sort((left, right) => left - right)
  if (current.length === 0) return { ...withoutNotes, enabled: false }
  return {
    ...withoutNotes,
    enabled: true,
    note: current[0] ?? normalized,
    ...(current.length > 1 ? { notes: current } : {}),
  }
}
"""
text, count = re.subn(r'export function updateStepNotes\([\s\S]*?\n}\n?$', replacement, text)
if count != 1:
    raise SystemExit(f'src/domain/sequenceOperations.ts: replaced {count} updateStepNotes functions')
operations.write_text(text)

replace_once(
    'src/components/LiveMidiControls.tsx',
    '<div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>',
    '<div className="flex flex-wrap gap-2">',
)

replace_once(
    'src/components/AlgorithmGraph.tsx',
    "} from '../domain/dx7Algorithms'\n",
    "} from '../domain/dx7Algorithms'\nimport { RangeControl } from './RangeControl'\n",
)
replace_once(
    'src/components/AlgorithmGraph.tsx',
    "  onSelect: (operatorIndex: number) => void\n",
    "  onSelect: (operatorIndex: number) => void\n  onAlgorithmChange: (algorithm: number) => void\n",
)
replace_once(
    'src/components/AlgorithmGraph.tsx',
    "  onSelect,\n  onToggleEnabled,\n",
    "  onSelect,\n  onAlgorithmChange,\n  onToggleEnabled,\n",
)
replace_once(
    'src/components/AlgorithmGraph.tsx',
    (
        '        <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">\n'
        '          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-300" />Carrier</span>\n'
        '          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lime-300" />Modulator</span>\n'
        '          <span className="flex items-center gap-1.5"><span className="h-0 w-7 border-t border-dashed border-amber-300" />Feedback</span>\n'
        '        </div>'
    ),
    (
        '        <div className="grid w-full gap-3 sm:w-auto sm:min-w-[230px] sm:justify-items-end">\n'
        '          <div className="w-full sm:w-[230px]">\n'
        '            <RangeControl\n'
        '              label="Algorithm selection"\n'
        '              max={32}\n'
        '              min={1}\n'
        '              onChange={onAlgorithmChange}\n'
        '              value={algorithm.number}\n'
        '            />\n'
        '          </div>\n'
        '          <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">\n'
        '            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-300" />Carrier</span>\n'
        '            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lime-300" />Modulator</span>\n'
        '            <span className="flex items-center gap-1.5"><span className="h-0 w-7 border-t border-dashed border-amber-300" />Feedback</span>\n'
        '          </div>\n'
        '        </div>'
    ),
)
replace_once(
    'src/components/OperatorRoutingEditor.tsx',
    "        onSelect={onSelect}\n",
    "        onAlgorithmChange={(algorithm) => onChange({ ...voice, algorithm })}\n        onSelect={onSelect}\n",
)
replace_once(
    'src/components/VoiceEditor.tsx',
    '          <RangeControl label="Algorithm" max={32} min={1} onChange={(algorithm) => onChange({ ...voice, algorithm })} value={voice.algorithm} />\n',
    '',
)

replace_once(
    'src/App.tsx',
    "                      baseBank={bank}\n                      output={midi.output}\n",
    "                      baseBank={bank}\n                      fxState={effects}\n                      onFxChange={effectsHistory.setValue}\n                      output={midi.output}\n",
)

replace_once(
    'src/components/TargetVoiceAuditionPanel.tsx',
    "import type { DeviceTarget } from '../domain/deviceTarget'\n",
    "import type { DeviceTarget } from '../domain/deviceTarget'\nimport type { Fm1FxState } from '../domain/fx'\n",
)
replace_once(
    'src/components/TargetVoiceAuditionPanel.tsx',
    "import { VirtualPiano } from './VirtualPiano'\n",
    "import { LiveMidiControls } from './LiveMidiControls'\nimport { VirtualPiano } from './VirtualPiano'\n",
)
replace_once(
    'src/components/TargetVoiceAuditionPanel.tsx',
    "  sysexEnabled: boolean\n",
    "  sysexEnabled: boolean\n  fxState: Fm1FxState\n  onFxChange: (state: Fm1FxState) => void\n",
)
replace_once(
    'src/components/TargetVoiceAuditionPanel.tsx',
    "      <div className=\"mt-4\">\n        <VirtualPiano\n          baseOctave={baseOctave}",
    "      <div className=\"mt-4 grid gap-4\">\n        <LiveMidiControls\n          disabled={busy}\n          midiChannel={midiChannel}\n          output={output}\n          target=\"dx7\"\n        />\n        <VirtualPiano\n          baseOctave={baseOctave}",
)
replace_once(
    'src/components/TargetVoiceAuditionPanel.tsx',
    "    <VoiceAuditionPanel\n      baseBank={props.baseBank}\n      output={props.output}\n",
    "    <VoiceAuditionPanel\n      baseBank={props.baseBank}\n      fxState={props.fxState}\n      onFxChange={props.onFxChange}\n      output={props.output}\n",
)

replace_once(
    'src/components/VoiceAuditionPanel.tsx',
    "import type { Dx7Voice } from '../domain/voice'\n",
    "import type { Fm1FxState } from '../domain/fx'\nimport type { Dx7Voice } from '../domain/voice'\n",
)
replace_once(
    'src/components/VoiceAuditionPanel.tsx',
    "import { VirtualPiano } from './VirtualPiano'\n",
    "import { LiveMidiControls } from './LiveMidiControls'\nimport { VirtualPiano } from './VirtualPiano'\n",
)
replace_once(
    'src/components/VoiceAuditionPanel.tsx',
    "  sysexEnabled: boolean\n",
    "  sysexEnabled: boolean\n  fxState: Fm1FxState\n  onFxChange: (state: Fm1FxState) => void\n",
)
replace_once(
    'src/components/VoiceAuditionPanel.tsx',
    "  selectedBankSlot,\n  output,\n  sysexEnabled,\n",
    "  selectedBankSlot,\n  output,\n  sysexEnabled,\n  fxState,\n  onFxChange,\n",
)
replace_once(
    'src/components/VoiceAuditionPanel.tsx',
    "      <div className=\"mt-4\">\n        <VirtualPiano\n          baseOctave={baseOctave}",
    "      <div className=\"mt-4 grid gap-4\">\n        <LiveMidiControls\n          disabled={busy}\n          fxState={fxState}\n          midiChannel={midiChannel}\n          onFxChange={onFxChange}\n          output={output}\n          target=\"fm1\"\n        />\n        <VirtualPiano\n          baseOctave={baseOctave}",
)

plan = Path('PLAN.md')
text = plan.read_text()
text = text.replace(
    '## 3. FM-1 USB audio capture and recording\n\n',
    '## 3. FM-1 USB audio capture and recording\n\nExecute sections A and B of [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md) and attach sanitized evidence before closing these physical checks.\n\n',
    1,
)
text = text.replace(
    '## 6. FM-1 bank/device workflow\n\n',
    '## 6. FM-1 bank/device workflow\n\nExecute sections C and D of [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md) before enabling completion detection, readback or recovery automation.\n\n',
    1,
)
old_section = (
    '## 7. Sequencer\n\n'
    '- [ ] Add octave-oriented note entry, direction modes, copy/paste, rotation and pattern randomization.\n'
    '- [ ] Add a playhead and timing diagnostics while browser MIDI events are scheduled.\n'
    '- [ ] Add MIDI clock output at 24 PPQN and selectable internal/external clock behavior.\n'
    '- [ ] Add pattern chaining and a small song-arrangement view.\n'
    '- [ ] Add FM-1 internal pattern transfer only after a stable protocol is verified.\n'
    '- [ ] Make it more like a step sequencer with a piano-roll layout.\n'
    '- [ ] Add common presets and patterns for single-note, polyphonic and chord-progression styles based on a starting note.\n'
)
new_section = (
    '## 7. Sequencer\n\n'
    '- [ ] Add FM-1 internal pattern transfer only after a stable protocol is verified.\n'
)
if old_section not in text:
    raise SystemExit('PLAN.md: sequencer section marker not found')
plan.write_text(text.replace(old_section, new_section, 1))

readme = Path('README.md')
text = readme.read_text()
text = text.replace(
    '- documented FM-1 effects workspace for filter, reverb, delay, distortion, chorus and phaser CC 0–23;\n',
    '- documented FM-1 effects workspace for filter, reverb, delay, distortion, chorus and phaser CC 0–23;\n- target-aware Live MIDI controls directly above the virtual piano for Program Change, transport, clock, All Notes Off and the complete FM-1 CC 0–23 effects map;\n',
    1,
)
text = text.replace(
    '- local 16-step sequence editor with note/rest/tie, velocity, gate, tempo, swing, length and MIDI channel;\n',
    '- two-octave piano-roll step sequencer with mono/poly note entry, velocity, gate, tie, tempo, swing, direction modes, copy/paste, rotation and deterministic randomization;\n',
    1,
)
text = text.replace(
    '- versioned sequence JSON load/save and scheduled Web MIDI playback through the monitored output adapter;\n',
    '- backward-compatible sequence JSON load/save, common bass/arpeggio/chord presets, saved pattern chaining, song arrangement, playhead/timing diagnostics and internal/external MIDI clock at 24 PPQN;\n',
    1,
)
text = text.replace(
    'Parameter `155` isolation is validated in [`docs/validation/dx7-edit-session.md`](./docs/validation/dx7-edit-session.md), and detached function data in [`docs/validation/dx7-function-state.md`](./docs/validation/dx7-function-state.md).',
    'Parameter `155` isolation is validated in [`docs/validation/dx7-edit-session.md`](./docs/validation/dx7-edit-session.md), detached function data in [`docs/validation/dx7-function-state.md`](./docs/validation/dx7-function-state.md), and the consolidated live-MIDI/advanced-sequencer workflow in [`docs/validation/ui-live-midi-and-sequencer.md`](./docs/validation/ui-live-midi-and-sequencer.md). Physical FM-1 checks follow [`docs/validation/fm1-hardware-test-protocol.md`](./docs/validation/fm1-hardware-test-protocol.md).',
    1,
)
readme.write_text(text)
