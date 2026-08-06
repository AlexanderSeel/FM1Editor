import type { ReactNode } from 'react'

interface PersistentWorkspaceProps {
  active: boolean
  children: ReactNode
}

/**
 * Keeps long-running workspace state mounted while removing inactive content
 * from layout and the accessibility tree.
 */
export function PersistentWorkspace({ active, children }: PersistentWorkspaceProps) {
  return (
    <div aria-hidden={!active} hidden={!active}>
      {children}
    </div>
  )
}
