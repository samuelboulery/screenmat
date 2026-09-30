import { useMemo } from 'react'
import { pickMembers } from '../lib/anchor.ts'
import { computeGeometry } from '../lib/render.ts'
import { DEFAULT_PLACEMENT, type Composition, type Scene, type Settings, type Shot, type Style } from '../types.ts'

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
    return pickMembers(shots, selection)
  }, [shots, activeShot, selection, composition.layout])

  const scene = useMemo<Scene | null>(() => {
    if (composed.length === 0) return null
    return {
      shots: composed,
      palette: composed[0].palette,
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
      composed.map((shot) => shot.placement ?? DEFAULT_PLACEMENT),
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
