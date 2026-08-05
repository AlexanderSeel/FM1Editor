import { useRef, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import { encodeSingleVoiceMessage } from '../sysex/dx7'
import { importSysexFile } from '../sysex/importSysex'

interface SysexToolbarProps {
  voice: Dx7Voice
  onImportVoice: (voice: Dx7Voice) => void
  onImportBank: (voices: readonly Dx7Voice[]) => void
  onNewVoice: () => void
}

function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function SysexToolbar({ voice, onImportVoice, onImportBank, onNewVoice }: SysexToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const importFile = async (file: File) => {
    setError(null)
    setStatus(null)
    try {
      const entries = importSysexFile(new Uint8Array(await file.arrayBuffer()))
      const bank = entries.find((entry) => entry.kind === 'voice-bank')
      const single = entries.find((entry) => entry.kind === 'single-voice')
      if (bank?.kind === 'voice-bank') {
        onImportBank(bank.voices)
        setStatus(`Loaded ${bank.voices.length} voices from ${file.name}.`)
      } else if (single?.kind === 'single-voice') {
        onImportVoice(single.voice)
        setStatus(`Loaded ${single.voice.name || 'unnamed voice'} from ${file.name}.`)
      } else {
        const reason = entries[0]?.kind === 'unsupported' ? entries[0].reason : 'No supported DX7 voice data was found.'
        throw new Error(reason)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The SysEx file could not be imported.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const exportVoice = () => {
    const filename = `${voice.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'fm1-voice'}.syx`
    downloadBytes(encodeSingleVoiceMessage(voice), filename)
    setStatus(`Exported ${filename}.`)
    setError(null)
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          accept=".syx,.sysex,application/octet-stream"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFile(file)
          }}
          ref={inputRef}
          type="file"
        />
        <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10" onClick={() => inputRef.current?.click()} type="button">
          Import .syx
        </button>
        <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10" onClick={exportVoice} type="button">
          Export voice
        </button>
        <button className="rounded-xl bg-violet-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-violet-300" onClick={onNewVoice} type="button">
          New patch
        </button>
      </div>
      {(status || error) && (
        <p className={`text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error ?? status}</p>
      )}
    </div>
  )
}
