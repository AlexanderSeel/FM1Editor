import { loadPatchCatalog } from '../catalog/catalogLoader'
import type { PatchCatalogEntry } from '../catalog/patchCatalog'
import { importSysexFile } from '../sysex/importSysex'
import type { PresetIndexCandidate } from './nearestPreset'

export interface BundledCatalogCandidateEntry {
  readonly id: string
  readonly title: string
  readonly filename: string
  readonly source: PatchCatalogEntry['source']
  readonly status: PatchCatalogEntry['status']
  readonly archivePath?: string
}

export interface CatalogPresetCandidateProgress {
  readonly entriesScanned: number
  readonly totalEligibleEntries: number
  readonly voicesFound: number
  readonly currentEntry: string
}

export interface LoadCatalogPresetCandidateOptions {
  readonly maxVoices?: number
  readonly signal?: AbortSignal
  readonly onProgress?: (progress: CatalogPresetCandidateProgress) => void
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Catalog preset loading was cancelled.', 'AbortError')
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

export async function collectBundledCatalogPresetCandidates(
  entries: readonly BundledCatalogCandidateEntry[],
  files: ReadonlyMap<string, Uint8Array>,
  options: LoadCatalogPresetCandidateOptions = {},
): Promise<readonly PresetIndexCandidate[]> {
  const eligible = entries.filter((entry) => entry.status === 'valid' && Boolean(entry.archivePath))
  const candidates: PresetIndexCandidate[] = []
  const maximum = options.maxVoices === undefined ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(options.maxVoices))

  for (let entryIndex = 0; entryIndex < eligible.length; entryIndex += 1) {
    throwIfAborted(options.signal)
    const entry = eligible[entryIndex]
    if (!entry?.archivePath) continue
    const bytes = files.get(entry.archivePath)
    if (!bytes) continue

    const messages = importSysexFile(bytes)
    let voiceOrdinal = 0
    messages.forEach((message, messageIndex) => {
      if (message.kind === 'single-voice') {
        if (candidates.length >= maximum) return
        voiceOrdinal += 1
        candidates.push({
          id: `${entry.id}:m${messageIndex + 1}:v1`,
          voice: message.voice,
          sourceLabel: `${entry.title} · ${entry.filename} · voice ${voiceOrdinal}`,
        })
        return
      }
      if (message.kind !== 'voice-bank') return
      message.voices.forEach((voice, voiceIndex) => {
        if (candidates.length >= maximum) return
        voiceOrdinal += 1
        candidates.push({
          id: `${entry.id}:m${messageIndex + 1}:v${voiceIndex + 1}`,
          voice,
          sourceLabel: `${entry.title} · ${entry.filename} · slot ${voiceIndex + 1}`,
        })
      })
    })

    options.onProgress?.({
      entriesScanned: entryIndex + 1,
      totalEligibleEntries: eligible.length,
      voicesFound: candidates.length,
      currentEntry: entry.filename,
    })
    if (candidates.length >= maximum) break
    if ((entryIndex + 1) % 8 === 0) await nextTask()
  }

  throwIfAborted(options.signal)
  return candidates
}

export async function loadBundledCatalogPresetCandidates(
  options: LoadCatalogPresetCandidateOptions = {},
): Promise<readonly PresetIndexCandidate[]> {
  throwIfAborted(options.signal)
  const catalog = await loadPatchCatalog()
  throwIfAborted(options.signal)
  return collectBundledCatalogPresetCandidates(catalog.entries, catalog.files, options)
}
