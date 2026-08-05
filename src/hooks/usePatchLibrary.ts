import { useCallback, useEffect, useState } from 'react'
import type { Dx7Voice } from '../domain/voice'
import {
  mergePatchBackupRecords,
  parsePatchLibraryBackup,
  serializePatchLibraryBackup,
} from '../library/backup'
import {
  deletePatchRecord,
  listPatchRecords,
  replacePatchRecords,
  savePatchRecords,
} from '../library/indexedDbPatchLibrary'
import {
  mergeImportedVoices,
  updatePatchMetadata,
  type PatchOrigin,
  type PatchRecord,
} from '../library/model'

export interface PatchLibraryImportSummary {
  added: number
  duplicates: number
}

export type PatchLibraryRestoreMode = 'merge' | 'replace'

export interface PatchLibraryRestoreSummary {
  mode: PatchLibraryRestoreMode
  imported: number
  duplicates: number
  total: number
}

export function usePatchLibrary() {
  const [records, setRecords] = useState<readonly PatchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRecords(await listPatchRecords())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The local patch library could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const importVoices = useCallback(async (
    voices: readonly Dx7Voice[],
    origin: Omit<PatchOrigin, 'bankSlot'>,
  ): Promise<PatchLibraryImportSummary> => {
    const current = await listPatchRecords()
    const result = mergeImportedVoices(current, voices, origin)
    await savePatchRecords(result.added)
    setRecords(result.records)
    return { added: result.added.length, duplicates: result.duplicates.length }
  }, [])

  const saveCurrentVoice = useCallback(async (voice: Dx7Voice): Promise<PatchLibraryImportSummary> => {
    const now = new Date().toISOString()
    return importVoices([voice], {
      kind: 'editor',
      label: 'FM1 Editor',
      importedAt: now,
    })
  }, [importVoices])

  const exportBackup = useCallback(async (): Promise<string> => {
    return serializePatchLibraryBackup(await listPatchRecords())
  }, [])

  const restoreBackup = useCallback(async (
    text: string,
    mode: PatchLibraryRestoreMode,
  ): Promise<PatchLibraryRestoreSummary> => {
    const backup = parsePatchLibraryBackup(text)

    if (mode === 'replace') {
      await replacePatchRecords(backup.records)
      setRecords(backup.records)
      return {
        mode,
        imported: backup.records.length,
        duplicates: 0,
        total: backup.records.length,
      }
    }

    const current = await listPatchRecords()
    const result = mergePatchBackupRecords(current, backup.records)
    await savePatchRecords(result.added)
    setRecords(result.records)
    return {
      mode,
      imported: result.added.length,
      duplicates: result.duplicates.length,
      total: result.records.length,
    }
  }, [])

  const toggleFavorite = useCallback(async (id: string) => {
    const record = records.find((candidate) => candidate.id === id)
    if (!record) return
    const updated = updatePatchMetadata(record, { favorite: !record.favorite })
    await savePatchRecords([updated])
    setRecords((current) => current.map((candidate) => candidate.id === id ? updated : candidate))
  }, [records])

  const updateTags = useCallback(async (id: string, tags: readonly string[]) => {
    const record = records.find((candidate) => candidate.id === id)
    if (!record) return
    const updated = updatePatchMetadata(record, { tags })
    await savePatchRecords([updated])
    setRecords((current) => current.map((candidate) => candidate.id === id ? updated : candidate))
  }, [records])

  const remove = useCallback(async (id: string) => {
    await deletePatchRecord(id)
    setRecords((current) => current.filter((record) => record.id !== id))
  }, [])

  return {
    records,
    loading,
    error,
    reload,
    importVoices,
    saveCurrentVoice,
    exportBackup,
    restoreBackup,
    toggleFavorite,
    updateTags,
    remove,
  }
}
