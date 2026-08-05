import type { PatchRecord } from './model'
import { normalizeStoredPatchRecord } from './storageMigration'

const DATABASE_NAME = 'fm1-editor'
const DATABASE_VERSION = 2
const PATCH_STORE = 'patches'
const METADATA_STORE = 'metadata'

let databasePromise: Promise<IDBDatabase> | null = null

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB request failed.')), { once: true })
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.')), { once: true })
    transaction.addEventListener('error', () => reject(transaction.error ?? new Error('IndexedDB transaction failed.')), { once: true })
  })
}

function ensurePatchIndexes(store: IDBObjectStore): void {
  if (!store.indexNames.contains('fingerprint')) store.createIndex('fingerprint', 'fingerprint', { unique: false })
  if (!store.indexNames.contains('updatedAt')) store.createIndex('updatedAt', 'updatedAt', { unique: false })
  if (!store.indexNames.contains('originKind')) store.createIndex('originKind', 'origin.kind', { unique: false })
}

function migrateStoredRecords(store: IDBObjectStore): void {
  const request = store.openCursor()
  request.addEventListener('success', () => {
    const cursor = request.result
    if (!cursor) return
    const normalized = normalizeStoredPatchRecord(cursor.value)
    if (normalized) cursor.update(normalized)
    else cursor.delete()
    cursor.continue()
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is not available in this browser.'))

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.addEventListener('upgradeneeded', (event) => {
      const database = request.result
      const transaction = request.transaction
      if (!transaction) return

      const patchStore = database.objectStoreNames.contains(PATCH_STORE)
        ? transaction.objectStore(PATCH_STORE)
        : database.createObjectStore(PATCH_STORE, { keyPath: 'id' })
      ensurePatchIndexes(patchStore)
      if ((event as IDBVersionChangeEvent).oldVersion < 2) migrateStoredRecords(patchStore)

      const metadataStore = database.objectStoreNames.contains(METADATA_STORE)
        ? transaction.objectStore(METADATA_STORE)
        : database.createObjectStore(METADATA_STORE, { keyPath: 'key' })
      metadataStore.put({
        key: 'schema',
        version: DATABASE_VERSION,
        migratedAt: new Date().toISOString(),
      })
    })
    request.addEventListener('success', () => {
      const database = request.result
      database.addEventListener('versionchange', () => {
        database.close()
        databasePromise = null
      })
      resolve(database)
    }, { once: true })
    request.addEventListener('blocked', () => {
      databasePromise = null
      reject(new Error('The patch library upgrade is blocked by another open FM1 Editor tab. Close the other tab and retry.'))
    }, { once: true })
    request.addEventListener('error', () => {
      databasePromise = null
      reject(request.error ?? new Error('Could not open the patch library database.'))
    }, { once: true })
  })

  return databasePromise
}

export async function listPatchRecords(): Promise<readonly PatchRecord[]> {
  const database = await openDatabase()
  const transaction = database.transaction(PATCH_STORE, 'readonly')
  const completion = transactionComplete(transaction)
  const stored = await requestResult(transaction.objectStore(PATCH_STORE).getAll() as IDBRequest<unknown[]>)
  await completion
  return stored
    .map((record) => normalizeStoredPatchRecord(record))
    .filter((record): record is PatchRecord => record !== null)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function savePatchRecords(records: readonly PatchRecord[]): Promise<void> {
  if (records.length === 0) return
  const database = await openDatabase()
  const transaction = database.transaction(PATCH_STORE, 'readwrite')
  const completion = transactionComplete(transaction)
  const store = transaction.objectStore(PATCH_STORE)
  records.forEach((record) => store.put(record))
  await completion
}

export async function replacePatchRecords(records: readonly PatchRecord[]): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(PATCH_STORE, 'readwrite')
  const completion = transactionComplete(transaction)
  const store = transaction.objectStore(PATCH_STORE)
  store.clear()
  records.forEach((record) => store.put(record))
  await completion
}

export async function deletePatchRecord(id: string): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(PATCH_STORE, 'readwrite')
  const completion = transactionComplete(transaction)
  transaction.objectStore(PATCH_STORE).delete(id)
  await completion
}
