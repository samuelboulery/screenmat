import { useCallback, useState } from 'react'
import { DEFAULT_COMPOSITION, DEFAULT_SETTINGS, type Composition, type Settings } from '../types.ts'
import { supportedDefaults } from '../lib/export.ts'

/** Le défaut est WebP — dix fois plus léger à grain égal. Un navigateur sans
 *  encodeur WebP repart en PNG plutôt que d'échouer à chaque export. */
const defaults = (): Settings => supportedDefaults(DEFAULT_SETTINGS)

/**
 * L'état du document en cours d'édition : ce qui se règle, par opposition à ce
 * qui s'en déduit (`useScene`) et à ce qui est persisté (`useLibrary`).
 *
 * `setSettings` et `setComposition` sortent bruts parce que la pile
 * d'annulation (`useDocumentHistory`) restaure un instantané entier — un
 * `patch` partiel ne saurait pas retirer une clé.
 */
export function useDocument() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [composition, setComposition] = useState<Composition>(DEFAULT_COMPOSITION)
  const [scale, setScale] = useState(2)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

  const patch = useCallback(
    (next: Partial<Settings>) => setSettings((current) => ({ ...current, ...next })),
    [],
  )

  const compose = useCallback(
    (next: Partial<Composition>) => setComposition((current) => ({ ...current, ...next })),
    [],
  )

  /** Repartir de zéro. L'image de fond part avec : elle n'est pas dans
   *  l'instantané d'annulation, c'est ce qui vaut sa confirmation à l'appelant. */
  const reset = useCallback(() => {
    setSettings(defaults())
    setComposition(DEFAULT_COMPOSITION)
    setBackgroundImage(null)
    setScale(2)
  }, [])

  return {
    settings,
    setSettings,
    composition,
    setComposition,
    scale,
    setScale,
    backgroundImage,
    setBackgroundImage,
    patch,
    compose,
    reset,
  }
}
