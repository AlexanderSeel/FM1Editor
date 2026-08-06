import { useEffect, useState } from 'react'
import {
  createDx7EditSession,
  DX7_OPERATOR_ENABLE_PARAMETER,
  encodeDx7OperatorEnableMask,
  toggleDx7Operator,
} from '../domain/dx7EditSession'

interface Dx7OperatorSessionPanelProps {
  documentKey: number
}

export function Dx7OperatorSessionPanel({ documentKey }: Dx7OperatorSessionPanelProps) {
  const [session, setSession] = useState(createDx7EditSession)

  useEffect(() => {
    setSession(createDx7EditSession())
  }, [documentKey])

  const mask = encodeDx7OperatorEnableMask(session.operatorEnabled)

  return (
    <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.045] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">DX7 edit session</p>
          <h3 className="mt-1 text-lg font-bold text-white">Operator enable mask</h3>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">
            Parameter {DX7_OPERATOR_ENABLE_PARAMETER} exists only while editing. These switches reset to all-on when another voice is loaded and are not included in single-voice data, packed bank voices, file exports or device transmission.
          </p>
        </div>
        <div className="rounded-xl border border-amber-300/20 bg-black/20 px-3 py-2 text-right font-mono text-xs text-amber-100">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">Six-bit mask</span>
          <strong className="mt-1 block text-base">0x{mask.toString(16).toUpperCase().padStart(2, '0')}</strong>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {session.operatorEnabled.map((enabled, operatorIndex) => (
          <button
            aria-pressed={enabled}
            className={`rounded-xl border px-3 py-3 text-xs font-black uppercase tracking-[0.12em] transition ${enabled
              ? 'border-emerald-300/30 bg-emerald-300/15 text-emerald-200'
              : 'border-white/10 bg-black/20 text-slate-500'}`}
            key={operatorIndex}
            onClick={() => setSession((current) => toggleDx7Operator(current, operatorIndex))}
            type="button"
          >
            OP{operatorIndex + 1}
            <span className="mt-1 block font-mono text-[10px] font-semibold">{enabled ? 'ON' : 'OFF'}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-amber-100/75">
        Session visualization only: changing this mask does not currently alter browser audition or send parameter-change SysEx.
      </p>
    </section>
  )
}
