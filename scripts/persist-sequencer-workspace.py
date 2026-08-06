from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected one App marker, found {count}: {old[:100]!r}')
    text = text.replace(old, new, 1)


replace_once(
    "import { PatchLibrary } from './components/PatchLibrary'\nimport { SequenceEditor } from './components/SequenceEditor'\n",
    "import { PatchLibrary } from './components/PatchLibrary'\nimport { PersistentWorkspace } from './components/PersistentWorkspace'\nimport { SequenceEditor } from './components/SequenceEditor'\n",
)

replace_once(
    """              ) : (\n                <CollapsibleSection\n                  description={`${sequence.length} steps · ${sequence.bpm} BPM`}\n                  storageKey=\"sequencer-editor\"\n                  title=\"Sequence editor\"\n                >\n                  <SequenceEditor onChange={sequenceHistory.setValue} output={midi.output} sequence={sequence} />\n                </CollapsibleSection>\n              )}\n""",
    """              ) : null}\n              <PersistentWorkspace active={workspace === 'sequencer'}>\n                <CollapsibleSection\n                  description={`${sequence.length} steps · ${sequence.bpm} BPM · playback remains active across workspaces`}\n                  storageKey=\"sequencer-editor\"\n                  title=\"Sequence editor\"\n                >\n                  <SequenceEditor onChange={sequenceHistory.setValue} output={midi.output} sequence={sequence} />\n                </CollapsibleSection>\n              </PersistentWorkspace>\n""",
)

path.write_text(text)
