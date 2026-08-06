from pathlib import Path


sequence_path = Path('src/components/SequenceEditor.tsx')
text = sequence_path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'Expected one SequenceEditor marker, found {count}: {old[:100]!r}')
    text = text.replace(old, new, 1)


replace_once(
    "} from '../domain/sequenceOperations'\n",
    "} from '../domain/sequenceOperations'\nimport {\n  buildPianoRollNoteRows,\n  MAX_PIANO_ROLL_START_NOTE,\n  revealPianoRollNote,\n  shiftPianoRollStartNote,\n} from '../domain/pianoRollView'\n",
)

replace_once(
    "  const uiTimers = useRef<number[]>([])\n  const externalPlayer = useRef<ExternalSequencePlayer | null>(null)\n",
    "  const uiTimers = useRef<number[]>([])\n  const externalPlayer = useRef<ExternalSequencePlayer | null>(null)\n  const playbackRun = useRef(0)\n  const loopEnabledRef = useRef(true)\n",
)

replace_once(
    "  const [baseOctave, setBaseOctave] = useState(3)\n",
    "  const [pianoRollStartNote, setPianoRollStartNote] = useState(48)\n  const [cursorNote, setCursorNote] = useState(60)\n  const [loopEnabled, setLoopEnabled] = useState(true)\n",
)

replace_once(
    "  const baseNote = (baseOctave + 1) * 12\n  const noteRows = useMemo(\n    () => Array.from({ length: 24 }, (_, index) => Math.min(127, baseNote + 23 - index)),\n    [baseNote],\n  )\n",
    "  const noteRows = useMemo(\n    () => buildPianoRollNoteRows(pianoRollStartNote),\n    [pianoRollStartNote],\n  )\n  const pianoRollEndNote = pianoRollStartNote + noteRows.length - 1\n\n  const revealCursor = useCallback((note: number) => {\n    const normalized = Math.min(127, Math.max(0, Math.round(note)))\n    setCursorNote(normalized)\n    setPianoRollStartNote((current) => revealPianoRollNote(current, normalized))\n  }, [])\n\n  const toggleLoop = () => {\n    const next = !loopEnabledRef.current\n    loopEnabledRef.current = next\n    setLoopEnabled(next)\n  }\n",
)

replace_once(
    "  useEffect(() => () => {\n    clearUiTimers()\n    externalPlayer.current?.stop()\n  }, [clearUiTimers])\n",
    "  useEffect(() => () => {\n    playbackRun.current += 1\n    clearUiTimers()\n    externalPlayer.current?.stop()\n  }, [clearUiTimers])\n",
)

play_start = text.index('  const play = async () => {')
play_end = text.index('\n  const stop = () => {', play_start)
play_block = '''  const play = async () => {
    setError(null)
    if (!output) {
      setError('Connect Web MIDI and select an output before playback.')
      return
    }
    try {
      validateSequence(sequence)
      await output.open()
      playbackRun.current += 1
      const runId = playbackRun.current
      output.clear?.()
      clearUiTimers()
      setPlayhead(null)
      setDiagnostics(emptyDiagnostics())

      if (clockMode === 'external') {
        setStatus('External clock armed. Playback follows Start/Clock and loops until MIDI Stop.')
        return
      }

      const runCycle = (startDelayMs: number, cycleNumber: number): void => {
        if (playbackRun.current !== runId) return
        const events = scheduleSequence(output, sequence, startDelayMs)
        const timing = describeSequenceTiming(events)
        if (cycleNumber === 1) {
          setDiagnostics({ ...emptyDiagnostics(), ...timing })
        } else {
          setDiagnostics((current) => ({
            ...current,
            eventCount: current.eventCount + timing.eventCount,
            noteOnCount: current.noteOnCount + timing.noteOnCount,
            noteOffCount: current.noteOffCount + timing.noteOffCount,
            clockPulseCount: current.clockPulseCount + timing.clockPulseCount,
            playbackStepCount: current.playbackStepCount + timing.playbackStepCount,
            durationMs: current.durationMs + timing.durationMs,
          }))
        }

        const startTimestamp = events.find((event) => event.kind === 'start')?.timestamp ?? performance.now()
        const duration = sequenceStepDurationMs(sequence.bpm)
        const swingOffset = duration * (sequence.swing / 100) * 0.5
        const playback = buildPlaybackSteps(sequence, Math.floor(startTimestamp))

        playback.forEach((step, timelineIndex) => {
          const expected = startTimestamp + timelineIndex * duration + (timelineIndex % 2 === 1 ? swingOffset : 0)
          uiTimers.current.push(window.setTimeout(() => {
            if (playbackRun.current !== runId) return
            setPlayhead(step.sourceStepIndex)
            setSelectedStep(step.sourceStepIndex)
            setCursorNote(step.step.note)
            setPlayheadPattern(step.patternName)
            recordDrift(expected)
          }, Math.max(0, expected - performance.now())))
        })

        const stopTimestamp = events.find((event) => event.kind === 'stop')?.timestamp ?? startTimestamp
        uiTimers.current.push(window.setTimeout(() => {
          if (playbackRun.current !== runId) return
          recordDrift(stopTimestamp)
          if (loopEnabledRef.current) {
            uiTimers.current = []
            setStatus(`Loop ${cycleNumber + 1} scheduled.`)
            runCycle(0, cycleNumber + 1)
            return
          }
          setPlayhead(null)
          setPlayheadPattern(null)
          setStatus('Arrangement playback completed.')
        }, Math.max(0, stopTimestamp - performance.now())))

        setStatus(loopEnabledRef.current
          ? `Loop ${cycleNumber} scheduled: ${timing.playbackStepCount} steps and ${timing.eventCount} MIDI events.`
          : `Scheduled ${timing.playbackStepCount} steps and ${timing.eventCount} MIDI events.`)
      }

      runCycle(80, 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sequence playback could not be started.')
    }
  }
'''
text = text[:play_start] + play_block + text[play_end:]

replace_once(
    "  const stop = () => {\n    clearUiTimers()\n",
    "  const stop = () => {\n    playbackRun.current += 1\n    clearUiTimers()\n",
)

replace_once(
    "      setSelectedStep(0)\n      setStatus(`Loaded ${loaded.name || file.name}.`)\n",
    "      setSelectedStep(0)\n      revealCursor(loaded.steps[0]?.note ?? 60)\n      setStatus(`Loaded ${loaded.name || file.name}.`)\n",
)

octave_control = '''          <label className="grid gap-2 rounded-xl border border-white/8 bg-black/15 p-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Piano-roll octave
            <select className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm normal-case text-white" onChange={(event) => setBaseOctave(Number(event.target.value))} value={baseOctave}>
              {Array.from({ length: 8 }, (_, octave) => <option key={octave} value={octave}>C{octave}–B{octave + 1}</option>)}
            </select>
          </label>'''
loop_control = '''          <button
            className={`rounded-xl border border-white/8 p-3 text-xs font-bold ${loopEnabled ? 'bg-emerald-300 text-slate-950' : 'bg-black/15 text-slate-400'}`}
            disabled={clockMode === 'external'}
            onClick={toggleLoop}
            type="button"
          >
            {clockMode === 'external' ? 'External loops until Stop' : loopEnabled ? 'Loop enabled' : 'Play once'}
          </button>'''
replace_once(octave_control, loop_control)

replace_once(
    '''          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Piano-roll step sequencer</p><h3 className="mt-1 text-xl font-bold text-white">Current pattern</h3><p className="mt-1 text-xs text-slate-500">Click for one note; Shift-click adds or removes chord notes.</p></div>''',
    '''          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Piano-roll step sequencer</p>
            <h3 className="mt-1 text-xl font-bold text-white">Current pattern</h3>
            <p className="mt-1 text-xs text-slate-500">Click for one note; Shift-click adds or removes chord notes. The edit cursor follows every note change.</p>
            <p className="mt-2 font-mono text-xs font-bold text-violet-200">Cursor · Step {String(selectedStep + 1).padStart(2, '0')} · {formatNote(cursorNote)} · View {formatNote(pianoRollStartNote)}–{formatNote(pianoRollEndNote)}</p>
          </div>''',
)

replace_once(
    '''          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-white/8 px-3 py-2 text-xs font-bold" onClick={() => onChange(rotatePattern(sequence, -1))} type="button">Rotate ←</button>''',
    '''          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-lg border border-violet-300/20 bg-violet-300/5 px-3 py-2 text-xs font-bold text-violet-200 disabled:opacity-35" disabled={pianoRollStartNote <= 0} onClick={() => setPianoRollStartNote((current) => shiftPianoRollStartNote(current, -1))} type="button">Octave ↓</button>
            <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-slate-300">{formatNote(pianoRollStartNote)}–{formatNote(pianoRollEndNote)}</span>
            <button className="rounded-lg border border-violet-300/20 bg-violet-300/5 px-3 py-2 text-xs font-bold text-violet-200 disabled:opacity-35" disabled={pianoRollStartNote >= MAX_PIANO_ROLL_START_NOTE} onClick={() => setPianoRollStartNote((current) => shiftPianoRollStartNote(current, 1))} type="button">Octave ↑</button>
            <button className="rounded-lg bg-white/8 px-3 py-2 text-xs font-bold" onClick={() => onChange(rotatePattern(sequence, -1))} type="button">Rotate ←</button>''',
)

replace_once(
    "onClick={() => setSelectedStep(index)} type=\"button\">{String(index + 1).padStart(2, '0')}</button>",
    "onClick={() => { setSelectedStep(index); revealCursor(sequence.steps[index]?.note ?? cursorNote) }} type=\"button\">{String(index + 1).padStart(2, '0')}</button>",
)

old_cell = '''                  return <button aria-label={`Step ${index + 1} ${formatNote(note)}${active ? ' active' : ''}`} className={`min-h-8 border-b border-r border-white/8 ${outsideLength ? 'bg-black/35' : active ? 'bg-cyan-300' : note % 12 === 0 ? 'bg-white/[0.07] hover:bg-white/[0.14]' : 'bg-white/[0.025] hover:bg-white/[0.1]'} ${playhead === index ? 'border-x-emerald-300/70' : ''}`} disabled={outsideLength} key={`${note}-${index}`} onClick={(event) => { setSelectedStep(index); onChange(updateStep(sequence, index, (current) => updateStepNotes(current, note, event.shiftKey))) }} title={`${formatNote(note)} · Step ${index + 1}`} type="button" />'''
new_cell = '''                  const cursorActive = selectedStep === index && cursorNote === note
                  return <button
                    aria-label={`Step ${index + 1} ${formatNote(note)}${active ? ' active' : ''}${cursorActive ? ' cursor' : ''}`}
                    className={`min-h-8 border-b border-r border-white/8 ${outsideLength ? 'bg-black/35' : active ? 'bg-cyan-300' : note % 12 === 0 ? 'bg-white/[0.07] hover:bg-white/[0.14]' : 'bg-white/[0.025] hover:bg-white/[0.1]'} ${playhead === index ? 'border-x-emerald-300/70' : ''} ${cursorActive ? 'ring-2 ring-inset ring-violet-300' : ''}`}
                    disabled={outsideLength}
                    key={`${note}-${index}`}
                    onClick={(event) => {
                      setSelectedStep(index)
                      revealCursor(note)
                      onChange(updateStep(sequence, index, (current) => updateStepNotes(current, note, event.shiftKey)))
                      setStatus(`Cursor moved to step ${index + 1}, ${formatNote(note)}.`)
                    }}
                    title={`${formatNote(note)} · Step ${index + 1}`}
                    type="button"
                  />'''
replace_once(old_cell, new_cell)

replace_once(
    "<RangeControl label=\"Primary note\" max={127} onChange={(note) => onChange(updateStep(sequence, selectedStep, (step) => updateStepNotes(step, note, false)))} suffix={` · ${formatNote(selected.note)}`} value={selected.note} />",
    "<RangeControl label=\"Primary note\" max={127} onChange={(note) => { revealCursor(note); onChange(updateStep(sequence, selectedStep, (step) => updateStepNotes(step, note, false))) }} suffix={` · ${formatNote(selected.note)}`} value={selected.note} />",
)

sequence_path.write_text(text)

readme_path = Path('README.md')
readme = readme_path.read_text()
old_readme = '- local 16-step sequence editor with note/rest/tie, velocity, gate, tempo, swing, length and MIDI channel;\n- versioned sequence JSON load/save and scheduled Web MIDI playback through the monitored output adapter;'
new_readme = '- local 16-step piano-roll sequencer with mono/poly note entry, note/rest/tie, velocity, gate, tempo, swing, length, MIDI channel, full-range octave viewport movement and a visible edit cursor;\n- versioned sequence JSON load/save, internal loop playback, external-clock continuous playback and scheduled Web MIDI output through the monitored adapter;'
if readme.count(old_readme) != 1:
    raise RuntimeError(f'Expected one README marker, found {readme.count(old_readme)}')
readme_path.write_text(readme.replace(old_readme, new_readme, 1))
