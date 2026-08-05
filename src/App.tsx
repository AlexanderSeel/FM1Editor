import { ConnectionPanel } from './components/ConnectionPanel'
import { useMidi } from './hooks/useMidi'

const sections = [
  ['Voice', 'Shape a six-operator FM patch'],
  ['Banks', 'Arrange and transfer 32-voice banks'],
  ['Library', 'Search local and imported SysEx'],
  ['Sequencer', 'Build and play 16-step patterns'],
  ['Monitor', 'Inspect raw MIDI traffic'],
] as const

export default function App() {
  const midi = useMidi()

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_88%_22%,rgba(168,85,247,0.10),transparent_26%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1680px] grid-cols-1 gap-5 p-4 lg:grid-cols-[300px_1fr] lg:p-6">
        <aside className="grid content-start gap-5">
          <header className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">M-VAVE</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">FM1 Editor</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Voice design, bank librarian, SysEx explorer and sequence workspace.
            </p>
          </header>

          <ConnectionPanel
            supported={midi.state.support.supported}
            supportReason={midi.state.support.supported ? undefined : midi.state.support.reason}
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
        </aside>

        <main className="grid content-start gap-5">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/65 shadow-2xl shadow-black/40">
            <div className="border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Workspace</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">Initialized Voice</h2>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10" type="button">
                    Import .syx
                  </button>
                  <button className="rounded-xl bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-violet-300" type="button">
                    New patch
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 xl:p-7">
              {sections.map(([title, description], index) => (
                <article
                  className={`group min-h-44 rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/40 ${
                    index === 0
                      ? 'border-cyan-300/25 bg-cyan-300/[0.06] sm:col-span-2 xl:col-span-2'
                      : 'border-white/10 bg-white/[0.025]'
                  }`}
                  key={title}
                >
                  <div className="flex h-full flex-col justify-between gap-8">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">0{index + 1}</p>
                      <h3 className="mt-2 text-xl font-bold text-white">{title}</h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
                    </div>
                    <span className="text-sm font-semibold text-cyan-300 opacity-80 transition group-hover:translate-x-1">Open →</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500">
            <span>Hardware operations remain disabled until MIDI permission and a target output are selected.</span>
            <span>Protocol status: research / unverified on physical FM-1</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
