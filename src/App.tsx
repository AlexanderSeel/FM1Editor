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

const WORKSPACES = [
  { id: 'voice', hardwareLabel: 'EDIT', label: 'Voice' },
  { id: 'library', hardwareLabel: 'PRESETS', label: 'Library' },
  { id: 'effects', hardwareLabel: 'FX', label: 'Effects' },
  { id: 'sequencer', hardwareLabel: 'SEQ', label: 'Sequencer' },
] as const

type Workspace = (typeof WORKSPACES)[number]['id']

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
  const [voiceDocumentVersion, setVoiceDocumentVersion] = useState(0)

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
  const deviceReady = midi.state.permission === 'granted' && midi.state.sysexEnabled
  const workspaceNumber = String(WORKSPACES.findIndex((item) => item.id === workspace) + 1).padStart(3, '0')

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
    setVoiceDocumentVersion((current) => current + 1)
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
    <div className="fm1-app min-h-[100dvh] overflow-x-hidden text-slate-100">
      <div className="fm1-room-glow" />
      <div className="fm1-chassis relative mx-auto grid min-h-[100dvh] max-w-[1900px] grid-cols-1 items-start gap-3 p-2 sm:m-3 sm:min-h-[calc(100dvh-1.5rem)] sm:p-3 lg:grid-cols-[minmax(280px,318px)_minmax(0,1fr)] lg:gap-4 lg:p-4 xl:grid-cols-[330px_minmax(0,1fr)] xl:p-5">
        <aside className="fm1-sidebar sidebar-scroll grid min-w-0 content-start gap-4 p-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain xl:top-5 xl:max-h-[calc(100dvh-2.5rem)]">
          <header className="fm1-brandplate p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="fm1-brand-kicker text-[11px]">M-VAVE</p>
                <h1 className="fm1-brand-title mt-2">FM-1</h1>
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

          <nav className="fm1-function-grid grid grid-cols-2 gap-2 p-2" aria-label="Workspace navigation">
            {WORKSPACES.map((item) => (
              <button
                className="min-w-0 px-3 py-3 text-left transition"
                data-active={workspace === item.id}
                key={item.id}
                onClick={() => setWorkspace(item.id)}
                type="button"
              >
                <span className="block text-[11px] font-black uppercase tracking-[0.11em]">{item.hardwareLabel}</span>
                <span className="mt-1 block truncate text-[9px] uppercase tracking-[0.12em] opacity-65">{item.label}</span>
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

          <section className="p-4 text-sm text-slate-400">
            <p className="fm1-hardware-label text-[10px] text-amber-200">Safety boundary</p>
            <p className="mt-2 leading-6">File operations, documented FX CCs and MIDI note playback are active. Immediate single-voice transfer is disabled; device writes use an explicitly confirmed complete 32-voice bank.</p>
          </section>
        </aside>

        <main className="grid min-w-0 content-start gap-4">
          <section className="fm1-main-panel overflow-hidden rounded-[22px]">
            <div className="fm1-control-deck">
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

              <div className="fm1-knob-bank" aria-label="FM-1 parameter knob styling">
                {['SELECT', 'ALGORITHM', 'KNOB 3', 'KNOB 4'].map((label) => (
                  <div className="fm1-knob-unit" key={label}>
                    <span className="fm1-knob-label">{label}</span>
                    <div className="fm1-knob" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/70 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="fm1-hardware-label text-[10px]">Current program</p>
                <p className="mt-1 text-sm text-slate-400">Use the hardware-style keys and recessed editor panels below.</p>
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

            <div className="grid gap-5 p-4 sm:p-5 xl:p-6">
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
                    <VoiceEditor documentKey={voiceDocumentVersion} onChange={voiceHistory.setValue} voice={voice} />
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

          <footer className="flex flex-wrap items-center justify-between gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <span>FM-1 editor · guarded bank merge · virtual piano</span>
            <span>Physical bank import and device readback remain pending</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
