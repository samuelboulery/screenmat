import { useEffect, useState } from 'react'
import { m } from '../lib/i18n/index.ts'
import { loadWallpaper, loadedWallpaper } from '../lib/image.ts'
import { isWallpaper } from '../lib/wallpapers.ts'
import type { BackgroundKind } from '../types.ts'

/**
 * L'image d'un fond d'écran, chargée à la demande ; `null` pour tout autre fond,
 * et tant qu'elle n'est pas arrivée — le moteur peint alors l'aplat. `onError`
 * reçoit l'échec : un fond qui ne vient pas doit se dire, pas rester un aplat
 * muet.
 */
export function useWallpaper(
  kind: BackgroundKind,
  size: 'full' | 'thumb',
  onError: (message: string) => void,
): HTMLImageElement | null {
  // L'image se lit dans le cache de `loadWallpaper`, pas dans un état : un fond
  // déjà vu revient dans la frame même. L'état ne sert qu'à redemander un rendu
  // quand le chargement aboutit.
  const [, setArrived] = useState(0)
  const image = isWallpaper(kind) ? loadedWallpaper(kind, size) : undefined

  useEffect(() => {
    if (!isWallpaper(kind) || image) return
    // Un fond quitté avant d'arriver n'a plus personne à prévenir.
    let stale = false
    loadWallpaper(kind, size).then(
      () => {
        if (!stale) setArrived((count) => count + 1)
      },
      (cause: unknown) => {
        if (!stale) onError(cause instanceof Error ? cause.message : m.messages.image.wallpaperFallback)
      },
    )
    return () => {
      stale = true
    }
  }, [kind, size, onError, image])

  return image ?? null
}
