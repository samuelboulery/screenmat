import type { HistoryEntry, Style } from '../types.ts'

const DB_NAME = 'shotframe'
const DB_VERSION = 1

const STYLES = 'styles'
/** Métadonnées + vignette : ce que la grille d'historique affiche. */
const HISTORY = 'history'
/** Rendu final + screenshot source : lourd, chargé à la demande seulement. */
const BLOBS = 'history-blobs'

/** Au-delà, on prévient et on propose une purge des plus anciens. */
export const QUOTA_WARNING_BYTES = 500 * 1024 * 1024

/** Ce qu'on liste : tout sauf les deux blobs. */
export type HistoryMeta = Omit<HistoryEntry, 'blob' | 'source'>
export type HistoryBlobs = { blob: Blob; source: Blob }

let connection: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (connection) return connection

  connection = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible : styles et historique désactivés'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STYLES)) db.createObjectStore(STYLES, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(HISTORY)) {
        db.createObjectStore(HISTORY, { keyPath: 'id' }).createIndex('createdAt', 'createdAt')
      }
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS, { keyPath: 'id' })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(
        request.error ??
          new Error('Couldn’t open local storage. Private browsing blocks it on some browsers.'),
      )
  })

  return connection
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode)
        const request = action(transaction.objectStore(store))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error(`Échec sur « ${store} »`))
      }),
  )
}

/* --- Styles ------------------------------------------------------------- */

export function listStyles(): Promise<Style[]> {
  return run<Style[]>(STYLES, 'readonly', (store) => store.getAll())
}

export function putStyle(style: Style): Promise<unknown> {
  return run(STYLES, 'readwrite', (store) => store.put(style))
}

export function deleteStyle(id: string): Promise<unknown> {
  return run(STYLES, 'readwrite', (store) => store.delete(id))
}

/* --- Historique --------------------------------------------------------- */

/** Les `count` entrées les plus récentes, sans les blobs. */
export async function listHistory(count = 40, before?: number): Promise<HistoryMeta[]> {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const index = db.transaction(HISTORY, 'readonly').objectStore(HISTORY).index('createdAt')
    const range = before === undefined ? null : IDBKeyRange.upperBound(before, true)
    const request = index.openCursor(range, 'prev')
    const page: HistoryMeta[] = []

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor || page.length >= count) {
        resolve(page)
        return
      }
      page.push(cursor.value as HistoryMeta)
      cursor.continue()
    }
    request.onerror = () =>
      reject(request.error ?? new Error('Couldn’t read the export history. Reload the page.'))
  })
}

export function getHistoryBlobs(id: string): Promise<HistoryBlobs | undefined> {
  return run<(HistoryBlobs & { id: string }) | undefined>(BLOBS, 'readonly', (store) =>
    store.get(id),
  )
}

export async function putHistory(entry: HistoryEntry): Promise<void> {
  const { blob, source, ...meta } = entry
  await run(HISTORY, 'readwrite', (store) => store.put(meta))
  await run(BLOBS, 'readwrite', (store) => store.put({ id: entry.id, blob, source }))
}

export async function deleteHistory(id: string): Promise<void> {
  await run(HISTORY, 'readwrite', (store) => store.delete(id))
  await run(BLOBS, 'readwrite', (store) => store.delete(id))
}

/** Poids cumulé déclaré des rendus. Suffisant pour l'avertissement de quota. */
export async function historyBytes(): Promise<number> {
  const all = await run<HistoryMeta[]>(HISTORY, 'readonly', (store) => store.getAll())
  return all.reduce((total, entry) => total + entry.bytes, 0)
}

export async function countHistory(): Promise<number> {
  return run<number>(HISTORY, 'readonly', (store) => store.count())
}

/** Supprime les entrées les plus anciennes jusqu'à repasser sous la cible. */
export async function purgeOldest(targetBytes = QUOTA_WARNING_BYTES): Promise<number> {
  const all = await run<HistoryMeta[]>(HISTORY, 'readonly', (store) => store.getAll())
  const sorted = [...all].sort((a, b) => a.createdAt - b.createdAt)

  let total = sorted.reduce((sum, entry) => sum + entry.bytes, 0)
  let removed = 0

  for (const entry of sorted) {
    if (total <= targetBytes) break
    await deleteHistory(entry.id)
    total -= entry.bytes
    removed += 1
  }

  return removed
}
