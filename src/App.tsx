import { useEffect, useState } from 'react'
import { BankBrowser } from './components/BankBrowser'
import { CollapsibleSection } from './components/CollapsibleSection'
import { ConnectionPanel } from './components/ConnectionPanel'
import { EffectsEditor } from './components/EffectsEditor'
import { HistoryControls } from './components/HistoryControls'
import { MidiMonitor } from './components/MidiMonitor'
import { PatchCatalogBrowser } from './components/PatchCatalogBrowser'
import { PatchLibrary } from './components/PatchLibrary'
import { SequenceEditor } from './components/SequenceEditor'
import { SysexToolbar } from './components/SysexToolbar'
import { VoiceAuditionPanel } from './components/VoiceAuditionPanel'
import { VoiceEditor } from './components/VoiceEditor'
import { createInitializedFxState } from './domain/fx'
import { createInitializedSequence } from './domain/sequence'
import { createInitializedVoice, type Dx7Voice } from './domain/voice'
import { useMidi } from './hooks/useMidi'
import { usePatchLibrary } from './hooks/usePatchLibrary'
import { useUndoableState } from './hooks/useUndoableState'

type Workspace = 'voice' | 'library' | 'effects' | 'sequencer'

function isTextEditingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable)
}

export default function App() {
  const midi = useMidi()
  const patchLibrary = usePatchLibrary()
  const [workspace, setWorkspace] = useState<Workspace>('voice')
  const voiceHistory = useUndoableState(() => createInitializedVoice())
  const effectsHistory = useUndoableState(() => createInitializedFxState())
  const sequenceHistory = useUndoableState(() => createInitializedSequence())
  const [bank, setBank] = useState<readonly Dx7Voice[]>([])
  const [selectedBankSlot, setSelectedBankSlot] = useState<number | null>(null)

  const voice = voiceHistory.value
  const effects = effectsHistory.value
  const sequence = sequenceHistory.value
  const activeHistory = workspace === 'voice'
    ? voiceHistory
    : workspace === 'effects'
      ? effectsHistory
      : workspace === 'sequencer'
        ? sequenceHistory
        : null
  const hasUnsavedChanges = voiceHistory.dirty || effectsHistory.dirty || sequenceHistory.dirty

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeHistory || !(event.ctrlKey || event.metaKey) || event.altKey || isTextEditingTarget(event.target)) return
      const key = event.key.toLowerCase()
      const wantsUndo = key === 'z' && !event.shiftKey
      const wantsRedo = key === 'y' || (key === 'z' && event.shiftKey)
      if (wantsUndo && activeHistory.canUndo) {
        event.preventDefault()
        activeHistory.undo()
      } else if (wantsRedo && activeHistory.canRedo) {
        event.preventDefault()
        activeHistory.redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeHistory])

  const confirmDiscardVoiceChanges = (action: string): boolean => !voiceHistory.dirty || window.confirm(
    `The current voice has unsaved changes. ${action} will discard those changes. Continue?`,
  )

  const loadVoiceDocument = (nextVoice: Dx7Voice, bankSlot: number | null = null) => {
    voiceHistory.reset(nextVoice)
    setSelectedBankSlot(bankSlot)
  }

  const workspaceTitle = workspace === 'voice'
    ? (voice.name || 'UNTITLED')
    : workspace === 'library'
      ? 'Patch Library'
      : workspace === 'effects'
        ? 'FM-1 Effects'
        : (sequence.name || 'UNTITLED')

  const workspaceSummary = workspace === 'voice'
    ? `Six operators · algorithm ${voice.algorithm} · guarded bank merge and virtual piano audition`
    : workspace === 'library'
      ? `${patchLibrary.records.length} local voices · schema v3 · backup/restore · merged ZIP and website catalog`
      : workspace === 'effects'
        ? `Documented CC 0–23 · FX MIDI channel ${effects.midiChannel}`
        : `${sequence.length} steps · ${sequence.bpm} BPM · MIDI channel ${sequence.midiChannel}`

  const loadCatalogBank = (voices: readonly Dx7Voice[]) => {
    if (!confirmDiscardVoiceChanges('Loading another bank')) return
    setBank(voices)
    const first = voices[0]
    if (first) loadVoiceDocument(first, 0)
    else setSelectedBankSlot(null)
    setWorkspace('voice')
  }

  const loadCatalogVoice = (nextVoice: Dx7Voice) => {
    if (!confirmDiscardVoiceChanges('Loading another voice')) return
    setBank([])
    loadVoiceDocument(nextVoice)
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

          <CollapsibleSection
            defaultOpen={false}
            description={`${midi.monitorEntries.length} captured MIDI messages`}
            storageKey="sidebar-midi-monitor"
            title="MIDI monitor"
          >
            <MidiMonitor entries={midi.monitorEntries} onClear={midi.clearMonitor} />
          </CollapsibleSection>

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-400">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Safety boundary</p>
            <p className="mt-2 leading-6">File operations, documented FX CCs and MIDI note playback are active. Immediate single-voice transfer is disabled; device writes use an explicitly confirmed complete 32-voice bank.</p>
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
                <div className="flex min-w-0 flex-wrap items-start justify-end gap-3">
                  {activeHistory && (
                    <HistoryControls
                      canRedo={activeHistory.canRedo}
                      canUndo={activeHistory.canUndo}
                      dirty={activeHistory.dirty}
                      onRedo={activeHistory.redo}
                      onUndo={activeHistory.undo}
                    />
                  )}
                  {workspace === 'voice' && (
                    <SysexToolbar
                      onExportVoice={voiceHistory.markSaved}
                      onImportBank={(voices) => {
                        if (!confirmDiscardVoiceChanges('Importing another bank')) return
                        setBank(voices)
                        const first = voices[0]
                        if (first) loadVoiceDocument(first, 0)
                        else setSelectedBankSlot(null)
                      }}
                      onImportToLibrary={(voices, filename) => patchLibrary.importVoices(voices, {
                        kind: 'file',
                        label: 'Local SysEx import',
                        importedAt: new Date().toISOString(),
                        filename,
                      })}
                      onImportVoice={(nextVoice) => {
                        if (!confirmDiscardVoiceChanges('Importing another voice')) return
                        setBank([])
                        loadVoiceDocument(nextVoice)
                      }}
                      onNewVoice={() => {
                        if (!confirmDiscardVoiceChanges('Creating a new patch')) return
                        setBank([])
                        loadVoiceDocument(createInitializedVoice())
                      }}
                      voice={voice}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-4 sm:p-5 xl:p-7">
              {workspace === 'voice' ? (
                <>
                  {bank.length > 0 && (
                    <CollapsibleSection
                      description={`${bank.length} loaded voice slots`}
                      storageKey="voice-imported-bank"
                      title="Imported bank"
                    >
                      <BankBrowser
                        onChange={setBank}
                        onSelect={(nextVoice, index) => {
                          if (!confirmDiscardVoiceChanges(`Loading bank slot ${index + 1}`)) return
                          loadVoiceDocument(nextVoice, index)
                        }}
                        selectedIndex={selectedBankSlot}
                        voices={bank}
                      />
                    </CollapsibleSection>
                  )}
                  <CollapsibleSection
                    description="Whole-bank transfer, preset recall and virtual piano"
                    storageKey="voice-bank-audition"
                    title="FM-1 bank audition"
                  >
                    <VoiceAuditionPanel
                      baseBank={bank}
                      output={midi.output}
                      selectedBankSlot={selectedBankSlot}
                      sysexEnabled={midi.state.sysexEnabled}
                      voice={voice}
                    />
                  </CollapsibleSection>
                  <CollapsibleSection
                    description={`Algorithm ${voice.algorithm} · six operators · envelopes and LFO`}
                    storageKey="voice-editor"
                    title="Voice editor"
                  >
                    <VoiceEditor onChange={voiceHistory.setValue} voice={voice} />
                  </CollapsibleSection>
                </>
              ) : workspace === 'library' ? (
                <>
                  <CollapsibleSection
                    description="Browse the tracked ZIP and Yamaha Black Boxes overlay"
                    storageKey="library-patch-catalog"
                    title="Patch catalog"
                  >
                    <PatchCatalogBrowser
                      onImportToLibrary={patchLibrary.importVoices}
                      onLoadBank={loadCatalogBank}
                      onLoadVoice={loadCatalogVoice}
                    />
                  </CollapsibleSection>
                  <CollapsibleSection
                    description={`${patchLibrary.records.length} locally stored voices`}
                    storageKey="library-local-patches"
                    title="Local patch library"
                  >
                    <PatchLibrary
                      currentVoice={voice}
                      error={patchLibrary.error}
                      loading={patchLibrary.loading}
                      onDelete={patchLibrary.remove}
                      onExportBackup={patchLibrary.exportBackup}
                      onLoad={loadCatalogVoice}
                      onRestoreBackup={patchLibrary.restoreBackup}
                      onSaveCurrent={async (currentVoice) => {
                        const result = await patchLibrary.saveCurrentVoice(currentVoice)
                        voiceHistory.markSaved()
                        return result
                      }}
                      onToggleFavorite={patchLibrary.toggleFavorite}
                      onUpdateTags={patchLibrary.updateTags}
                      records={patchLibrary.records}
                    />
                  </CollapsibleSection>
                </>
              ) : workspace === 'effects' ? (
                <CollapsibleSection
                  description={`CC 0–23 · MIDI channel ${effects.midiChannel}`}
                  storageKey="effects-controls"
                  title="Effects controls"
                >
                  <EffectsEditor onChange={effectsHistory.setValue} output={midi.output} state={effects} />
                </CollapsibleSection>
              ) : (
                <CollapsibleSection
                  description={`${sequence.length} steps · ${sequence.bpm} BPM`}
                  storageKey="sequencer-editor"
                  title="Sequence editor"
                >
                  <SequenceEditor onChange={sequenceHistory.setValue} output={midi.output} sequence={sequence} />
                </CollapsibleSection>
              )}
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500">
            <span>Current milestone: collapsible workspaces, application history, guarded bank merge transfer and virtual piano.</span>
            <span>Physical FM-1 bank-import verification and device readback remain pending.</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
