import { useCallback, useRef, useState } from 'react'
import { runBatch, triggerDownload, type BatchJob } from '../lib/export.ts'
import type { QueueItem } from '../types.ts'

export type Batch = {
  queue: QueueItem[]
  running: boolean
  rendered: number
  total: number
  error: string | null
  start: (jobs: readonly BatchJob[], shotIds: readonly string[]) => Promise<void>
  cancel: () => void
}

const ZIP_NAME = 'shotframe-batch.zip'

/** Un item de file par shot ; les ratios multiplient les fichiers, pas les items. */
export function useBatch(): Batch {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [running, setRunning] = useState(false)
  const [rendered, setRendered] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)

  const start = useCallback(async (jobs: readonly BatchJob[], shotIds: readonly string[]) => {
    if (jobs.length === 0) return

    cancelled.current = false
    setRunning(true)
    setError(null)
    setRendered(0)
    setTotal(jobs.length)
    setQueue(shotIds.map((shotId) => ({ shotId, status: 'queued', progress: 0 })))

    try {
      const zip = await runBatch(jobs, {
        shouldCancel: () => cancelled.current,
        onProgress: ({ shotId, index, total: count }) => {
          setQueue((current) =>
            current.map((item) =>
              item.shotId === shotId
                ? { ...item, status: 'rendering', progress: index / count }
                : item,
            ),
          )
        },
        onItem: (shotId) => {
          setRendered((current) => current + 1)
          setQueue((current) =>
            current.map((item) =>
              item.shotId === shotId ? { ...item, status: 'done', progress: 1 } : item,
            ),
          )
        },
      })

      // Ce qui restait en file au moment de l'annulation est marqué « skipped ».
      setQueue((current) =>
        current.map((item) =>
          item.status === 'done' ? item : { ...item, status: 'skipped', progress: 0 },
        ),
      )

      if (!cancelled.current) triggerDownload(zip, ZIP_NAME)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Export du lot impossible')
      setQueue((current) => current.map((item) => ({ ...item, status: 'error' })))
    } finally {
      setRunning(false)
    }
  }, [])

  const cancel = useCallback(() => {
    cancelled.current = true
  }, [])

  return { queue, running, rendered, total, error, start, cancel }
}
