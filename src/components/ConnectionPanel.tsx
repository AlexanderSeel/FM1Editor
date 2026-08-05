import type { MidiPortInfo } from '../midi/webMidi'
import type { MidiPermissionState } from '../hooks/useMidi'

interface ConnectionPanelProps {
  supported: boolean
  supportReason?: string
  permission: MidiPermissionState
  sysexEnabled: boolean
  inputs: MidiPortInfo[]
  outputs: MidiPortInfo[]
  selectedInputId: string | null
  selectedOutputId: string | null
  error: string | null
  onConnect: () => void
  onSelectInput: (id: string | null) => void
  onSelectOutput: (id: string | null) => void
}

function PortSelect({
  label,
  ports,
  value,
  onChange,
}: {
  label: string
  ports: MidiPortInfo[]
  value: string | null
  onChange: (id: string | null) => void
}) {
  return (
    <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
      {label}
      <select
        className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm normal-case tracking-normal text-slate-100 outline-none transition focus:border-cyan-400/70"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">No port selected</option>
        {ports.map((port) => (
          <option key={port.id} value={port.id}>
            {port.name} · {port.manufacturer}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ConnectionPanel(props: ConnectionPanelProps) {
  const connected = props.permission === 'granted'

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Device link</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Web MIDI + SysEx</h2>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
            connected && props.sysexEnabled
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
          }`}
        >
          {connected && props.sysexEnabled ? 'Ready' : 'Offline'}
        </span>
      </div>

      {!connected ? (
        <div className="mt-5 grid gap-4">
          <p className="text-sm leading-6 text-slate-400">
            The browser will ask for access to MIDI devices and System Exclusive messages. Nothing is sent until you explicitly choose an operation.
          </p>
          <button
            className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            disabled={!props.supported || props.permission === 'requesting'}
            onClick={props.onConnect}
            type="button"
          >
            {props.permission === 'requesting' ? 'Requesting access…' : 'Connect FM-1'}
          </button>
          {!props.supported && <p className="text-sm text-rose-300">{props.supportReason}</p>}
          {props.error && <p className="text-sm text-rose-300">{props.error}</p>}
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <PortSelect
            label="MIDI input"
            ports={props.inputs}
            value={props.selectedInputId}
            onChange={props.onSelectInput}
          />
          <PortSelect
            label="MIDI output"
            ports={props.outputs}
            value={props.selectedOutputId}
            onChange={props.onSelectOutput}
          />
          {!props.sysexEnabled && (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
              MIDI access was granted without SysEx. Revoke the site permission and reconnect with SysEx enabled.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
