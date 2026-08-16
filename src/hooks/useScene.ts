import { useMemo } from 'react'
import { computeGeometry } from '../lib/render.ts'
import type { Composition, Scene, Settings, Shot, Style } from '../types.ts'

type SceneInput = {
  shots: readonly Shot[]
  activeShot: Shot | null
  selection: readonly string[]
  settings: Settings
  composition: Composition
  scale: number
  backgroundImage: HTMLImageElement | null
  activeStyle: Style | null
  watermarkImage: HTMLImageElement | null
}

/**
 * Ce qui se déduit du document : quels shots entrent dans la composition, la
 * scène que le moteur dessine, son encombrement, et ce que le fichier pèsera à
 * l'échelle choisie.
 *
 * Rien ici ne décide : c'est `useDocument` qui porte l'état, et
 * `renderScene()` qui dessine. Cette couche ne fait que les relier.
 */
export function useScene(input: SceneInput) {
  const { shots, activeShot, selection, settings, composition } = input
  const { scale, backgroundImage, activeStyle, watermarkImage } = input

  const composed = useMemo(() => {
    if (shots.length === 0) return []
    if (composition.layout === 'single') {
      return activeShot ? [activeShot] : []
    }
    const picked = shots.filter((shot) => selection.includes(shot.id))
    // Une composition multi-shot sans sélection retombe sur le premier shot :
    // un canvas vide serait pris pour un bug, pas pour un choix.
    return picked.length > 0 ? picked : shots.slice(0, 1)
  }, [shots, activeShot, selection, composition.layout])

  const scene = useMemo<Scene | null>(() => {
    if (composed.length === 0) return null
    return {
      shots: composed,
      palette: activeStyle?.palette ?? composed[0].palette,
      settings,
      composition,
      backgroundImage: backgroundImage ?? undefined,
      watermark:
        watermarkImage && activeStyle?.watermark
          ? { image: watermarkImage, mark: activeStyle.watermark }
          : undefined,
    }
  }, [composed, settings, composition, activeStyle, backgroundImage, watermarkImage])

  const geometry = useMemo(() => {
    const first = composed[0]
    if (!first) return null
    return computeGeometry(
      first.image.naturalWidth,
      first.image.naturalHeight,
      settings,
      1,
      composition,
      composed.length,
    )
  }, [composed, settings, composition])

  /** Ce que le fichier fera, à l'échelle choisie. Affiché par le filmstrip. */
  const output = useMemo(
    () =>
      geometry
        ? {
            width: geometry.width * scale,
            height: Math.round(geometry.height * scale),
            format: settings.format,
          }
        : null,
    [geometry, scale, settings.format],
  )

  return { composed, scene, geometry, output }
}
