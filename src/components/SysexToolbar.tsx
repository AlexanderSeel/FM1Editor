import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { Dx7Voice } from '../domain/voice'
import { downloadBytes } from '../files/download'
import { encodeSingleVoiceMessage } from '../sysex/dx7'
import { analyzeSysexFile, type SysexDiagnostic } from '../sysex/importSysex'

interface SysexToolbarProps {
  voice: Dx7Voice
  onImportVoice: (voice: Dx7Voice) => void
  onImportBank: (voices: readonly Dx7Voice[]) => void
  onImportToLibrary: (voices: readonly Dx7Voice[], filename: string) => Promise<{ added: number; duplicates: number }>
  onNewVoice: () => void
}

interface FileSysexDiagnostic extends SysexDiagnostic {
  filename: string
}

function diagnosticClass(severity: SysexDiagnostic['severity']): string {
  if (severity === 'error') return 'border-rose-300/20 bg-rose-300/10 text-rose-200'
  if (severity === 'warning') return 'border-amber-300/20 bg-amber-300/10 text-amber-200'
  return 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
}

export function SysexToolbar({ voice, onImportVoice, onImportBank, onImportToLibrary, onNewVoice }: SysexToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<readonly FileSysexDiagnostic[]>([])
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (folderInputRef.current) folderInputRef.current.webkitdirectory = true
  }, [])

  const importFiles = async (files: readonly File[]) => {
    setError(null)
    setStatus(null)
    setDiagnostics([])
    let importedFiles = 0
    let added = 0
    let duplicates = 0
    let latestVoice: Dx7Voice | null = null
    let latestBank: readonly Dx7Voice[] | null = null
    const failures: string[] = []
    const nextDiagnostics: FileSysexDiagnostic[] = []

    for (const file of files) {
      try {
        const report = analyzeSysexFile(new Uint8Array(await file.arrayBuffer()))
        nextDiagnostics.push(...report.diagnostics.map((diagnostic) => ({ ...diagnostic, filename: file.name })))
        const voices = report.entries.flatMap((entry) => entry.kind === 'voice-bank'
          ? [...entry.voices]
          : entry.kind === 'single-voice'
            ? [entry.voice]
            : [])
        if (voices.length === 0) {
          const reason = report.diagnostics.find((diagnostic) => diagnostic.severity === 'error')?.message
            ?? report.entries.find((entry) => entry.kind === 'unsupported')?.reason
            ?? 'No supported DX7 voice data was found.'
          throw new Error(reason)
        }
        const bank = report.entries.find((entry) => entry.kind === 'voice-bank')
        const single = report.entries.find((entry) => entry.kind === 'single-voice')
        if (bank?.kind === 'voice-bank') latestBank = bank.voices
        else if (single?.kind === 'single-voice') latestVoice = single.voice
        const summary = await onImportToLibrary(voices, file.name)
        added += summary.added
        duplicates += summary.duplicates
        importedFiles += 1
      } catch (cause) {
        failures.push(`${file.name}: ${cause instanceof Error ? cause.message : 'Import failed.'}`)
      }
    }

    if (latestBank) onImportBank(latestBank)
    else if (latestVoice) onImportVoice(latestVoice)
    if (importedFiles > 0) {
      const diagnosticSummary = nextDiagnostics.length > 0 ? ` ${nextDiagnostics.length} diagnostics are available below.` : ''
      setStatus(`Processed ${importedFiles} file${importedFiles === 1 ? '' : 's'}: ${added} new voices, ${duplicates} duplicates.${diagnosticSummary}`)
    }
    if (failures.length > 0) setError(failures.join(' '))
    setDiagnostics(nextDiagnostics.slice(0, 200))
    if (inputRef.current) inputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  const exportVoice = () => {
    const filename = `${voice.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'fm1-voice'}.syx`
    downloadBytes(encodeSingleVoiceMessage(voice), filename)
    setStatus(`Exported ${filename}.`)
    setError(null)
    setDiagnostics([])
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const files = Array.from(event.dataTransfer.files).filter((file) => /\.syx(?:ex)?$/i.test(file.name))
    if (files.length > 0) void importFiles(files)
    else setError('Drop one or more .syx or .sysex files.')
  }

  return (
    <div
      className={`grid gap-3 rounded-2xl border p-3 transition ${dragging ? 'border-cyan-300/60 bg-cyan-300/10' : 'border-transparent'}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex flex-wrap gap-2">
        <input accept=".syx,.sysex,application/octet-stream" className="hidden" multiple onChange={(event) => void importFiles(Array.from(event.target.files ?? []))} ref={inputRef} type="file" />
        <input className="hidden" multiple onChange={(event) => void importFiles(Array.from(event.target.files ?? []).filter((file) => /\.syx(?:ex)?$/i.test(file.name)))} ref={folderInputRef} type="file" />
        <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10" onClick={() => inputRef.current?.click()} type="button">Import files</button>
        <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10" onClick={() => folderInputRef.current?.click()} type="button">Import folder</button>
        <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10" onClick={exportVoice} type="button">Export voice</button>
        <button className="rounded-xl bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-violet-300" onClick={onNewVoice} type="button">New patch</button>
      </div>
      <p className="text-[11px] text-slate-500">Drop multiple SysEx files here. Complete supported messages are imported even when a mixed file also contains diagnostic data.</p>
      {(status || error) && <p className={`text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>}
      {diagnostics.length > 0 && (
        <details className="rounded-xl border border-white/10 bg-black/20 p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
            Import diagnostics · {diagnostics.length}
          </summary>
          <div className="mt-3 grid max-h-72 gap-2 overflow-auto">
            {diagnostics.map((diagnostic, index) => (
              <article className={`rounded-lg border p-3 text-xs ${diagnosticClass(diagnostic.severity)}`} key={`${diagnostic.filename}-${diagnostic.offset}-${diagnostic.code}-${index}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{diagnostic.filename}</strong>
                  <span className="font-mono text-[10px] uppercase">{diagnostic.severity} · offset {diagnostic.offset}{diagnostic.messageIndex === undefined ? '' : ` · message ${diagnostic.messageIndex + 1}`}</span>
                </div>
                <p className="mt-1 leading-5">{diagnostic.message}</p>
                {(diagnostic.length !== undefined || diagnostic.manufacturer !== undefined || diagnostic.format !== undefined) && (
                  <p className="mt-1 font-mono text-[10px] opacity-70">
                    {diagnostic.length === undefined ? '' : `${diagnostic.length} bytes`}
                    {diagnostic.manufacturer === undefined ? '' : ` · manufacturer 0x${diagnostic.manufacturer.toString(16).padStart(2, '0').toUpperCase()}`}
                    {diagnostic.format === undefined ? '' : ` · format 0x${diagnostic.format.toString(16).padStart(2, '0').toUpperCase()}`}
                  </p>
                )}
              </article>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
