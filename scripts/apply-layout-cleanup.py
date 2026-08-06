from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected one App.tsx marker, found {count}: {old[:100]!r}')
    text = text.replace(old, new, 1)


replace_once(
    """const WORKSPACES = [
  { id: 'voice', hardwareLabel: 'EDIT', label: 'Voice' },
  { id: 'library', hardwareLabel: 'PRESETS', label: 'Library' },
  { id: 'effects', hardwareLabel: 'FX', label: 'Effects' },
  { id: 'sequencer', hardwareLabel: 'SEQ', label: 'Sequencer' },
] as const
""",
    """const WORKSPACES = [
  { id: 'voice', label: 'Voice' },
  { id: 'library', label: 'Library' },
  { id: 'effects', label: 'Effects' },
  { id: 'sequencer', label: 'Sequencer' },
] as const
""",
)

replace_once(
    '<div className="fm1-app min-h-[100dvh] overflow-x-hidden text-slate-100">',
    '<div className="fm1-app min-h-[100dvh] text-slate-100">',
)

replace_once(
    '<aside className="fm1-sidebar sidebar-scroll grid min-w-0 content-start gap-4 p-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain xl:top-5 xl:max-h-[calc(100dvh-2.5rem)]">',
    '<aside className="fm1-sidebar sidebar-scroll grid min-w-0 content-start gap-3 p-3">',
)

replace_once(
    """          <header className="fm1-brandplate p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="fm1-brand-kicker text-[11px]">{targetDefinition.manufacturerLabel}</p>
                <h1 className="fm1-brand-title mt-2">{targetDefinition.shortLabel}</h1>
                <p className="fm1-hardware-label mt-3 text-[10px]">Editor / Control Surface</p>
              </div>
              <div className="fm1-knob-unit" aria-hidden="true">
                <span className="fm1-knob-label">Master</span>
                <div className="fm1-knob" />
              </div>
            </div>
            <div className="fm1-mini-display mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-3 py-2.5 text-[11px]">
              <span>USB MIDI</span>
              <strong>{deviceReady ? 'READY' : 'STANDBY'}</strong>
              <span>SYSEX</span>
              <strong>{midi.state.sysexEnabled ? 'ON' : 'OFF'}</strong>
            </div>
          </header>
""",
    """          <header className="fm1-brandplate">
            <p className="fm1-brand-kicker">{targetDefinition.manufacturerLabel}</p>
            <h1 className="fm1-brand-title">{targetDefinition.shortLabel}</h1>
            <div className="fm1-mini-display grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-3">
              <span>USB MIDI</span>
              <strong>{deviceReady ? 'READY' : 'STANDBY'}</strong>
              <span>SYSEX</span>
              <strong>{midi.state.sysexEnabled ? 'ON' : 'OFF'}</strong>
            </div>
          </header>
""",
)

replace_once(
    """                <span className="block text-[11px] font-black uppercase tracking-[0.11em]">{item.hardwareLabel}</span>
                <span className="mt-1 block truncate text-[9px] uppercase tracking-[0.12em] opacity-65">{item.label}</span>
""",
    """                <span className="block truncate font-black uppercase tracking-[0.11em]">{item.label}</span>
""",
)

replace_once(
    """            <div className="fm1-control-deck">
              <div className="fm1-lcd p-4 sm:p-5">
                <div className="fm1-lcd-topline">
                  <span>{workspaceNumber} {workspace.toUpperCase()}</span>
                  <span>{hasUnsavedChanges ? 'EDIT' : 'MEM'}</span>
                </div>
                <h2 className="fm1-lcd-title">{workspaceTitle}</h2>
                <p className="fm1-lcd-summary">{workspaceSummary}</p>
                <div className="fm1-lcd-footer">
                  <span>{deviceReady ? 'MIDI READY' : 'MIDI STANDBY'}</span>
                  <span>{bank.length === 32 ? 'BANK 32/32' : `BANK ${bank.length}/32`}</span>
                </div>
              </div>

              <div className="fm1-knob-bank" aria-label={`${targetDefinition.shortLabel} parameter knob styling`}>
                {['SELECT', 'ALGORITHM', 'KNOB 3', 'KNOB 4'].map((label) => (
                  <div className="fm1-knob-unit" key={label}>
                    <span className="fm1-knob-label">{label}</span>
                    <div className="fm1-knob" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
""",
    """            <div className="fm1-control-deck">
              <div className="fm1-lcd">
                <div className="fm1-lcd-topline">
                  <span>{workspaceNumber} {workspace.toUpperCase()}</span>
                  <span>{hasUnsavedChanges ? 'EDIT' : 'MEM'}</span>
                </div>
                <h2 className="fm1-lcd-title">{workspaceTitle}</h2>
                <p className="fm1-lcd-summary">{workspaceSummary}</p>
                <div className="fm1-lcd-footer">
                  <span>{deviceReady ? 'MIDI READY' : 'MIDI STANDBY'}</span>
                  <span>{bank.length === 32 ? 'BANK 32/32' : `BANK ${bank.length}/32`}</span>
                </div>
              </div>
            </div>
""",
)

replace_once(
    """            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/70 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="fm1-hardware-label text-[10px]">Current program</p>
                <p className="mt-1 text-sm text-slate-400">Use the hardware-style keys and recessed editor panels below.</p>
              </div>
              <div className="flex min-w-0 flex-wrap items-start justify-end gap-3">
""",
    """            <div className="flex flex-wrap items-center justify-end gap-3 border-b border-black/70 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
""",
)

path.write_text(text, encoding='utf-8')
