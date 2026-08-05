interface HistoryControlsProps {
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
  onUndo: () => void
  onRedo: () => void
}

export function HistoryControls({ canUndo, canRedo, dirty, onUndo, onRedo }: HistoryControlsProps) {
  return (
    <div className="fm1-history flex flex-wrap items-center gap-2 rounded-xl border border-black/70 bg-black/30 p-2">
      <span
        className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/25 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300"
      >
        <span
          aria-hidden="true"
          className={`inline-block h-2 w-2 rounded-full ${dirty ? 'bg-amber-300 shadow-[0_0_8px_rgba(244,201,102,0.75)]' : 'bg-emerald-300 shadow-[0_0_8px_rgba(140,230,118,0.65)]'}`}
        />
        {dirty ? 'Edit buffer' : 'Stored'}
      </span>
      <button
        aria-label="Undo last editor change"
        className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.11em]"
        disabled={!canUndo}
        onClick={onUndo}
        title="Undo (Ctrl/Cmd+Z)"
        type="button"
      >
        Undo
      </button>
      <button
        aria-label="Redo last editor change"
        className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.11em]"
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
