interface HistoryControlsProps {
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
  onUndo: () => void
  onRedo: () => void
}

export function HistoryControls({ canUndo, canRedo, dirty, onUndo, onRedo }: HistoryControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-2">
      <span
        className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
          dirty ? 'bg-amber-300/15 text-amber-200' : 'bg-emerald-300/10 text-emerald-200'
        }`}
      >
        {dirty ? 'Unsaved changes' : 'No changes'}
      </span>
      <button
        aria-label="Undo last editor change"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        disabled={!canUndo}
        onClick={onUndo}
        title="Undo (Ctrl/Cmd+Z)"
        type="button"
      >
        Undo
      </button>
      <button
        aria-label="Redo last editor change"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        disabled={!canRedo}
        onClick={onRedo}
        title="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)"
        type="button"
      >
        Redo
      </button>
    </div>
  )
}
