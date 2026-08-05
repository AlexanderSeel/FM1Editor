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
    <div className="grid min-w-0 gap-2">
      <button
        aria-controls={contentId}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left transition hover:border-cyan-300/25 hover:bg-white/[0.055]"
        onClick={toggle}
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-200">{title}</span>
          {description && <span className="mt-1 block truncate text-[11px] text-slate-500">{description}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
          {open ? 'Collapse' : 'Expand'}
          <span aria-hidden="true" className={`text-base transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
        </span>
      </button>
      <div hidden={!open} id={contentId}>
        {children}
      </div>
    </div>
  )
}
