import type { PatchRecord } from './model'

const DATABASE_NAME = 'fm1-editor'
const DATABASE_VERSION = 1
const PATCH_STORE = 'patches'

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

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is not available in this browser.'))

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.addEventListener('upgradeneeded', () => {
      const database = request.result
      const store = database.objectStoreNames.contains(PATCH_STORE)
        ? request.transaction?.objectStore(PATCH_STORE)
        : database.createObjectStore(PATCH_STORE, { keyPath: 'id' })
      if (!store) return
      if (!store.indexNames.contains('fingerprint')) store.createIndex('fingerprint', 'fingerprint', { unique: false })
      if (!store.indexNames.contains('updatedAt')) store.createIndex('updatedAt', 'updatedAt', { unique: false })
    })
    request.addEventListener('success', () => {
      const database = request.result
      database.addEventListener('versionchange', () => database.close())
      resolve(database)
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
  const records = await requestResult(transaction.objectStore(PATCH_STORE).getAll() as IDBRequest<PatchRecord[]>)
  await completion
  return records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
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

export async function deletePatchRecord(id: string): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(PATCH_STORE, 'readwrite')
  const completion = transactionComplete(transaction)
  transaction.objectStore(PATCH_STORE).delete(id)
  await completion
}
