import { useCallback, useEffect, useState } from 'react'
import * as store from '../lib/store.ts'
import { lastStyleId, normalizeStyle, rememberStyle } from '../lib/styles.ts'
import type { HistoryEntry, Style } from '../types.ts'

export type Library = {
  styles: Style[]
  activeStyleId: string | null
  history: store.HistoryMeta[]
  bytes: number
  /** IndexedDB indisponible (mode privé strict, contexte non sécurisé…). */
  error: string | null
  saveStyle: (style: Style) => Promise<void>
  removeStyle: (id: string) => Promise<void>
  setActiveStyleId: (id: string | null) => void
  addHistory: (entry: HistoryEntry) => Promise<void>
  purge: () => Promise<void>
}

/**
 * Styles et historique, persistés en IndexedDB. Chargés une fois au démarrage :
 * l'historique ne remonte que ses métadonnées et ses vignettes, les blobs sont
 * lus à la demande par `getHistoryBlobs`.
 */
export function useLibrary(): Library {
  const [styles, setStyles] = useState<Style[]>([])
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null)
  const [history, setHistory] = useState<store.HistoryMeta[]>([])
  const [bytes, setBytes] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const [saved, page, total] = await Promise.all([
          store.listStyles(),
          store.listHistory(),
          store.historyBytes(),
        ])
        if (!alive) return
        setStyles(saved.map(normalizeStyle))
        setHistory(page)
        setBytes(total)

        const remembered = lastStyleId()
        if (remembered && saved.some((style) => style.id === remembered)) {
          setActiveStyleId(remembered)
        }
      } catch (cause: unknown) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Stockage local indisponible')
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [])

  const saveStyle = useCallback(async (style: Style) => {
    await store.putStyle(style)
    setStyles((current) => {
      const exists = current.some((item) => item.id === style.id)
      return exists ? current.map((item) => (item.id === style.id ? style : item)) : [...current, style]
    })
  }, [])

  const removeStyle = useCallback(async (id: string) => {
    await store.deleteStyle(id)
    setStyles((current) => current.filter((style) => style.id !== id))
    setActiveStyleId((current) => (current === id ? null : current))
  }, [])

  const addHistory = useCallback(async (entry: HistoryEntry) => {
    await store.putHistory(entry)
    const { blob: _blob, source: _source, ...meta } = entry
    setHistory((current) => [meta, ...current])
    setBytes((current) => current + entry.bytes)
  }, [])

  const purge = useCallback(async () => {
    await store.purgeOldest()
    const [page, total] = await Promise.all([store.listHistory(), store.historyBytes()])
    setHistory(page)
    setBytes(total)
  }, [])

  const pickStyle = useCallback((id: string | null) => {
    setActiveStyleId(id)
    rememberStyle(id)
  }, [])

  return {
    styles,
    activeStyleId,
    history,
    bytes,
    error,
    saveStyle,
    removeStyle,
    setActiveStyleId: pickStyle,
    addHistory,
    purge,
  }
}
