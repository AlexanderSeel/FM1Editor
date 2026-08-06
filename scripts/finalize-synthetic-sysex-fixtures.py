from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected one marker in {path}, found {count}: {old[:100]!r}')
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/sysex/syntheticFixtureCorpus.ts',
    '    outputLevel: (99 - seed) % 100,\n',
    '    outputLevel: 99 - (seed % 100),\n',
)

replace_once(
    'PLAN.md',
    '- [ ] Add legal/public-domain or user-provided SysEx fixtures and broader codec compatibility tests.\n',
    '',
)

replace_once(
    'README.md',
    '- Vitest coverage for codecs, imports, catalog, library migration/backup, bank merging, audition, audio recording, effects, sequencing and MIDI monitoring;\n',
    '- deterministic MIT-licensed synthetic SysEx compatibility fixtures covering valid single/bank messages, legacy reserved values, mixed-file salvage and malformed input;\n- Vitest coverage for codecs, imports, catalog, library migration/backup, bank merging, audition, audio recording, effects, sequencing and MIDI monitoring;\n',
)
