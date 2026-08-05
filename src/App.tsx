import { useState } from 'react'
import { BankBrowser } from './components/BankBrowser'
import { ConnectionPanel } from './components/ConnectionPanel'
import { SequenceEditor } from './components/SequenceEditor'
import { SysexToolbar } from './components/SysexToolbar'
import { VoiceEditor } from './components/VoiceEditor'
import { createInitializedSequence, type Fm1Sequence } from './domain/sequence'
import { createInitializedVoice, type Dx7Voice } from './domain/voice'
import { useMidi } from './hooks/useMidi'

type Workspace = 'voice' | 'sequencer'

export default function App() {
  const midi = useMidi()
  const [workspace, setWorkspace] = useState<Workspace>('voice')
  const [voice, setVoice] = useState<Dx7Voice>(() => createInitializedVoice())
  const [bank, setBank] = useState<readonly Dx7Voice[]>([])
  const [sequence, setSequence] = useState<Fm1Sequence>(() => createInitializedSequence())
  const selectedOutput = midi.state.selectedOutputId
    ? (midi.access?.outputs.get(midi.state.selectedOutputId) ?? null)
    : null

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_88%_22%,rgba(168,85,247,0.10),transparent_26%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1900px] grid-cols-1 gap-5 p-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:p-6">
        <aside className="grid content-start gap-5">
          <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">M-VAVE</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">FM1 Editor</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Voice design, bank librarian, SysEx explorer and sequence workspace.
            </p>
          </header>

          <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-2">
            {(['voice', 'sequencer'] as const).map((item) => (
              <button
                className={`rounded-xl px-3 py-3 text-sm font-bold capitalize transition ${workspace === item ? 'bg-cyan-300 text-slate-950' : 'text-slate-400 hover:bg-white/8 hover:text-white'}`}
                key={item}
                onClick={() => setWorkspace(item)}
                type="button"
              >
                {item}
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

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-400">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Safety boundary</p>
            <p className="mt-2 leading-6">
              File operations and MIDI sequence playback are active. Live parameter writes remain experimental until the FM-1 parameter map is verified against hardware.
            </p>
          </section>
        </aside>

        <main className="grid min-w-0 content-start gap-5">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/65 shadow-2xl shadow-black/40">
            <div className="border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">{workspace} workspace</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">{workspace === 'voice' ? (voice.name || 'UNTITLED') : (sequence.name || 'UNTITLED')}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {workspace === 'voice'
                      ? `Six operators · algorithm ${voice.algorithm} · DX7-compatible voice model`
                      : `${sequence.length} steps · ${sequence.bpm} BPM · MIDI channel ${sequence.midiChannel}`}
                  </p>
                </div>
                {workspace === 'voice' && (
                  <SysexToolbar
                    onImportBank={(voices) => {
                      setBank(voices)
                      const first = voices[0]
                      if (first) setVoice(first)
                    }}
                    onImportVoice={(nextVoice) => {
                      setBank([])
                      setVoice(nextVoice)
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

            <div className="grid gap-5 p-5 xl:p-7">
              {workspace === 'voice' ? (
                <>
                  <BankBrowser onSelect={setVoice} selectedVoice={voice} voices={bank} />
                  <VoiceEditor onChange={setVoice} voice={voice} />
                </>
              ) : (
                <SequenceEditor onChange={setSequence} output={selectedOutput} sequence={sequence} />
              )}
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500">
            <span>Current milestone: voice file editing, bank inspection and local sequence playback.</span>
            <span>Physical FM-1 parameter-write verification remains pending.</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
