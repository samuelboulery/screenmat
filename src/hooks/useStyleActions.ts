import { useCallback, useEffect, useState } from 'react'
import type { Library } from './useLibrary.ts'
import { loadDataUrl } from '../lib/image.ts'
import { createStyle } from '../lib/styles.ts'
import type { Settings, Style } from '../types.ts'

export type StyleActions = {
  activeStyle: Style | null
  /** Filigrane du style actif, décodé. `null` tant qu'il n'y en a pas. */
  watermarkImage: HTMLImageElement | null
  apply: (id: string) => void
  save: () => void
  patch: (style: Style) => void
}

/**
 * Les actions liées aux styles : appliquer, enregistrer, et garder le filigrane
 * décodé en phase avec le style actif.
 */
export function useStyleActions(
  library: Library,
  settings: Settings,
  setSettings: (settings: Settings) => void,
  onSaved: () => void,
): StyleActions {
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null)
  const activeStyle = library.styles.find((style) => style.id === library.activeStyleId) ?? null

  useEffect(() => {
    const mark = activeStyle?.watermark
    if (!mark) {
      setWatermarkImage(null)
      return
    }
    let alive = true
    loadDataUrl(mark.dataUrl)
      .then((image) => alive && setWatermarkImage(image))
      .catch(() => alive && setWatermarkImage(null))
    return () => {
      alive = false
    }
  }, [activeStyle?.watermark])

  const apply = useCallback(
    (id: string) => {
      const style = library.styles.find((item) => item.id === id)
      if (!style) return
      setSettings(style.settings)
      library.setActiveStyleId(id)
    },
    [library, setSettings],
  )

  const save = useCallback(() => {
    const style = createStyle(`Style ${library.styles.length + 1}`, settings)
    void library.saveStyle(style).then(() => library.setActiveStyleId(style.id))
    onSaved()
  }, [library, settings, onSaved])

  const patch = useCallback((next: Style) => void library.saveStyle(next), [library])

  return { activeStyle, watermarkImage, apply, save, patch }
}
