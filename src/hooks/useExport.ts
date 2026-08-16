import { useCallback, useState } from 'react'
import { nextId } from '../lib/annotate.ts'
import { copyScene, exportFilename, exportScene, humanSize } from '../lib/export.ts'
import { makeThumbnail } from '../lib/image.ts'
import type { HistoryEntry, Scene } from '../types.ts'

/** Durée de l'état « Copied » sur le bouton, avant retour à l'état initial. */
const COPIED_MS = 1400

export type ExportState = {
  /** Nom de fichier et poids du dernier export réussi. */
  status: string | null
  error: string | null
  copied: boolean
  exportScene: (scene: Scene, scale: number) => Promise<void>
  copyScene: (scene: Scene, scale: number) => Promise<void>
  fail: (message: string) => void
}

/**
 * Export et copie. Chaque export réussi laisse une trace dans l'historique :
 * on y stocke aussi le screenshot d'origine, sans quoi « réouvrir » ne
 * rouvrirait qu'une image plate.
 */
export function useExport(
  remember: (entry: HistoryEntry) => Promise<void>,
  styleId: string | null,
): ExportState {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const run = useCallback(
    async (scene: Scene, scale: number) => {
      setError(null)
      try {
        const blob = await exportScene(scene, scale)
        // Le nom affiché doit être celui du fichier réellement écrit.
        const name = exportFilename(scene.settings.url, scale, scene.settings.format)
        setStatus(`${name} — ${humanSize(blob.size)}`)
        await archive(scene, scale, blob, styleId, remember)
      } catch (cause: unknown) {
        setStatus(null)
        setError(cause instanceof Error ? cause.message : 'Export impossible')
      }
    },
    [remember, styleId],
  )

  const copy = useCallback(async (scene: Scene, scale: number) => {
    setError(null)
    try {
      await copyScene(scene, scale)
      setCopied(true)
      window.setTimeout(() => setCopied(false), COPIED_MS)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Copie impossible')
    }
  }, [])

  return { status, error, copied, exportScene: run, copyScene: copy, fail: setError }
}

async function archive(
  scene: Scene,
  scale: number,
  blob: Blob,
  styleId: string | null,
  remember: (entry: HistoryEntry) => Promise<void>,
): Promise<void> {
  const shot = scene.shots[0]
  if (!shot) return

  // L'image est déjà en mémoire derrière une URL objet : la relire ne coûte
  // aucun accès réseau, c'est le blob local qui revient.
  const source = await fetch(shot.image.src).then((response) => response.blob())

  await remember({
    id: nextId('export'),
    createdAt: Date.now(),
    name: shot.name,
    ratio: scene.settings.ratio,
    scale,
    bytes: blob.size,
    settings: scene.settings,
    styleId: styleId ?? undefined,
    thumbnail: makeThumbnail(shot.image),
    blob,
    source,
  })
}
