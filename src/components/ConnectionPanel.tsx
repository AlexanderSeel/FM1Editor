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
    <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
      {label}
      <select
        className="px-3 py-2.5 text-sm normal-case tracking-normal"
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
  const ready = connected && props.sysexEnabled

  return (
    <section className="fm1-connection-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="fm1-hardware-label text-[10px]">Device link</p>
          <h2 className="mt-1 text-base font-bold text-white">Web MIDI + SysEx</h2>
        </div>
        <span className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300">
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full ${ready ? 'bg-emerald-300 shadow-[0_0_8px_rgba(140,230,118,0.75)]' : 'bg-amber-300 shadow-[0_0_8px_rgba(244,201,102,0.55)]'}`}
          />
          {ready ? 'Ready' : 'Standby'}
        </span>
      </div>

      {!connected ? (
        <div className="mt-4 grid gap-4">
          <p className="text-sm leading-6 text-slate-400">
            The browser will ask for access to MIDI devices and System Exclusive messages. Nothing is sent until you explicitly choose an operation.
          </p>
          <button
            className="px-4 py-3 text-sm font-black uppercase tracking-[0.08em]"
            data-active="true"
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
        <div className="mt-4 grid gap-4">
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
            <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
              MIDI access was granted without SysEx. Revoke the site permission and reconnect with SysEx enabled.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
