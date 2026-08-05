import { useId, useState, type ReactNode } from 'react'

interface CollapsibleSectionProps {
  children: ReactNode
  defaultOpen?: boolean
  description?: string
  storageKey: string
  title: string
}

const STORAGE_PREFIX = 'fm1-editor:section:'

function readStoredState(storageKey: string, defaultOpen: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`)
    if (stored === 'open') return true
    if (stored === 'closed') return false
  } catch {
    return defaultOpen
  }
  return defaultOpen
}

function persistState(storageKey: string, open: boolean): void {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, open ? 'open' : 'closed')
  } catch {
    return
  }
}

export function CollapsibleSection({
  children,
  defaultOpen = true,
  description,
  storageKey,
  title,
}: CollapsibleSectionProps) {
  const contentId = useId()
  const [open, setOpen] = useState(() => readStoredState(storageKey, defaultOpen))

  const toggle = () => {
    setOpen((current) => {
      const next = !current
      persistState(storageKey, next)
      return next
    })
  }

  return (
    <div className="fm1-section grid min-w-0 gap-2">
      <button
        aria-controls={contentId}
        aria-expanded={open}
        className="fm1-section-toggle flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition"
        data-active={open}
        onClick={toggle}
        type="button"
      >
        <span className="min-w-0">
          <span className="fm1-section-title block text-[11px] font-black uppercase tracking-[0.15em]">{title}</span>
          {description && <span className="fm1-section-description mt-1 block truncate text-[10px] text-slate-500">{description}</span>}
        </span>
        <span className="fm1-section-state flex shrink-0 items-center gap-2 text-[9px] font-bold uppercase tracking-[0.13em]">
          <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${open ? 'bg-cyan-200 shadow-[0_0_8px_rgba(115,216,255,0.8)]' : 'bg-slate-700'}`} />
          {open ? 'On' : 'Off'}
          <span aria-hidden="true" className={`text-sm transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
        </span>
      </button>
      <div className="fm1-section-content" hidden={!open} id={contentId}>
        {children}
      </div>
    </div>
  )
}
