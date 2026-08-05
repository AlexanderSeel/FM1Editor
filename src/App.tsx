import { useState } from 'react'
import { BankBrowser } from './components/BankBrowser'
import { ConnectionPanel } from './components/ConnectionPanel'
import { EffectsEditor } from './components/EffectsEditor'
import { MidiMonitor } from './components/MidiMonitor'
import { PatchCatalogBrowser } from './components/PatchCatalogBrowser'
import { PatchLibrary } from './components/PatchLibrary'
import { SequenceEditor } from './components/SequenceEditor'
import { SysexToolbar } from './components/SysexToolbar'
import { VoiceAuditionPanel } from './components/VoiceAuditionPanel'
import { VoiceEditor } from './components/VoiceEditor'
import { createInitializedFxState, type Fm1FxState } from './domain/fx'
import { createInitializedSequence, type Fm1Sequence } from './domain/sequence'
import { createInitializedVoice, type Dx7Voice } from './domain/voice'
import { useMidi } from './hooks/useMidi'
import { usePatchLibrary } from './hooks/usePatchLibrary'

type Workspace = 'voice' | 'library' | 'effects' | 'sequencer'

export default function App() {
  const midi = useMidi()
  const patchLibrary = usePatchLibrary()
  const [workspace, setWorkspace] = useState<Workspace>('voice')
  const [voice, setVoice] = useState<Dx7Voice>(() => createInitializedVoice())
  const [voiceSelectionVersion, setVoiceSelectionVersion] = useState(0)
  const [bank, setBank] = useState<readonly Dx7Voice[]>([])
  const [effects, setEffects] = useState<Fm1FxState>(() => createInitializedFxState())
  const [sequence, setSequence] = useState<Fm1Sequence>(() => createInitializedSequence())

  const selectVoiceForAudition = (nextVoice: Dx7Voice) => {
    setVoice(nextVoice)
    setVoiceSelectionVersion((current) => current + 1)
  }

  const workspaceTitle = workspace === 'voice'
    ? (voice.name || 'UNTITLED')
    : workspace === 'library'
      ? 'Patch Library'
      : workspace === 'effects'
        ? 'FM-1 Effects'
        : (sequence.name || 'UNTITLED')

  const workspaceSummary = workspace === 'voice'
    ? `Six operators · algorithm ${voice.algorithm} · FM-1 push and virtual piano audition`
    : workspace === 'library'
      ? `${patchLibrary.records.length} local voices · schema v2 · backup/restore · merged ZIP and website catalog`
      : workspace === 'effects'
        ? `Documented CC 0–23 · FX MIDI channel ${effects.midiChannel}`
        : `${sequence.length} steps · ${sequence.bpm} BPM · MIDI channel ${sequence.midiChannel}`

  const loadCatalogBank = (voices: readonly Dx7Voice[]) => {
    setBank(voices)
    const first = voices[0]
    if (first) selectVoiceForAudition(first)
    setWorkspace('voice')
  }

  const loadCatalogVoice = (nextVoice: Dx7Voice) => {
    setBank([])
    selectVoiceForAudition(nextVoice)
    setWorkspace('voice')
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#070b12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_88%_22%,rgba(168,85,247,0.10),transparent_26%)]" />
      <div className="relative mx-auto grid min-h-[100dvh] max-w-[1900px] grid-cols-1 items-start gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(272px,310px)_minmax(0,1fr)] lg:gap-5 lg:p-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:p-6">
        <aside className="sidebar-scroll grid min-w-0 content-start gap-4 lg:sticky lg:top-5 lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1 xl:top-6 xl:max-h-[calc(100dvh-3rem)]">
          <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">M-VAVE</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">FM1 Editor</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">Voice design, merged SysEx library, documented effects and sequence workspace.</p>
          </header>

          <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-2" aria-label="Workspace navigation">
            {(['voice', 'library', 'effects', 'sequencer'] as const).map((item) => (
              <button
                className={`min-w-0 rounded-xl px-3 py-3 text-xs font-bold capitalize transition ${workspace === item ? 'bg-cyan-300 text-slate-950' : 'text-slate-400 hover:bg-white/8 hover:text-white'}`}
                key={item}
                onClick={() => setWorkspace(item)}
                type="button"
              >
                <span className="block truncate">{item}</span>
              </button>
            ))}
          </nav>

          <ConnectionPanel
            supported={midi.state.support.supported}
            {...(!midi.state.support.supported ? { supportReason: midi.state.support.reason } : {})}
            permission={midi.state.permission}
            sysexEnabled={midi.state.sysexEnabled}
            inputs={midi.state.inputs}
            outputs={midi.state.outputs}
            selectedInputId={midi.state.selectedInputId}
            selectedOutputId={midi.state.selectedOutputId}
            error={midi.state.error}
            onConnect={() => void midi.connect()}
            onSelectInput={midi.setSelectedInputId}
            onSelectOutput={midi.setSelectedOutputId}
          />

          <MidiMonitor entries={midi.monitorEntries} onClear={midi.clearMonitor} />

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-400">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Safety boundary</p>
            <p className="mt-2 leading-6">File operations, documented FX CCs and MIDI note playback are active. Full voice pushes and live parameter writes remain experimental until verified against physical FM-1 hardware.</p>
          </section>
        </aside>

        <main className="grid min-w-0 content-start gap-5">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/65 shadow-2xl shadow-black/40">
            <div className="border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">{workspace} workspace</p>
                  <h2 className="mt-1 truncate text-2xl font-bold text-white">{workspaceTitle}</h2>
                  <p className="mt-1 text-sm text-slate-500">{workspaceSummary}</p>
                </div>
                {workspace === 'voice' && (
                  <SysexToolbar
                    onImportBank={(voices) => {
                      setBank(voices)
                      const first = voices[0]
                      if (first) selectVoiceForAudition(first)
                    }}
                    onImportToLibrary={(voices, filename) => patchLibrary.importVoices(voices, {
                      kind: 'file',
                      label: 'Local SysEx import',
                      importedAt: new Date().toISOString(),
                      filename,
                    })}
                    onImportVoice={(nextVoice) => {
                      setBank([])
                      selectVoiceForAudition(nextVoice)
                    }}
                    onNewVoice={() => {
                      setBank([])
                      setVoice(createInitializedVoice())
                    }}
                    voice={voice}
                  />
                )}
              </div>
            </div>

            <div className="grid gap-5 p-4 sm:p-5 xl:p-7">
              {workspace === 'voice' ? (
                <>
                  <BankBrowser onChange={setBank} onSelect={selectVoiceForAudition} selectedVoice={voice} voices={bank} />
                  <VoiceAuditionPanel
                    output={midi.output}
                    selectionVersion={voiceSelectionVersion}
                    sysexEnabled={midi.state.sysexEnabled}
                    voice={voice}
                  />
                  <VoiceEditor onChange={setVoice} voice={voice} />
                </>
              ) : workspace === 'library' ? (
                <>
                  <PatchCatalogBrowser
                    onImportToLibrary={patchLibrary.importVoices}
                    onLoadBank={loadCatalogBank}
                    onLoadVoice={loadCatalogVoice}
                  />
                  <PatchLibrary
                    currentVoice={voice}
                    error={patchLibrary.error}
                    loading={patchLibrary.loading}
                    onDelete={patchLibrary.remove}
                    onExportBackup={patchLibrary.exportBackup}
                    onLoad={loadCatalogVoice}
                    onRestoreBackup={patchLibrary.restoreBackup}
                    onSaveCurrent={patchLibrary.saveCurrentVoice}
                    onToggleFavorite={patchLibrary.toggleFavorite}
                    onUpdateTags={patchLibrary.updateTags}
                    records={patchLibrary.records}
                  />
                </>
              ) : workspace === 'effects' ? (
                <EffectsEditor onChange={setEffects} output={midi.output} state={effects} />
              ) : (
                <SequenceEditor onChange={setSequence} output={midi.output} sequence={sequence} />
              )}
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500">
            <span>Current milestone: viewport-safe layout, tracked SysEx catalog, schema-v2 library and direct voice audition workflow.</span>
            <span>Physical FM-1 voice-transfer verification remains pending.</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
