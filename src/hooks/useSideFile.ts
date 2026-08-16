import { useCallback, useRef } from 'react'
import { loadImage, pickImage, toDataUrl } from '../lib/image.ts'
import { parseStyle } from '../lib/styles.ts'
import type { Style, Watermark } from '../types.ts'

/** Les trois fichiers qui ne sont pas des screenshots. */
export type SideTarget = 'background' | 'watermark' | 'style'

const DEFAULT_MARK: Omit<Watermark, 'dataUrl'> = {
  position: 'bottom-right',
  opacity: 0.6,
  size: 0.09,
}

export type SideFile = {
  inputRef: React.RefObject<HTMLInputElement | null>
  open: (target: SideTarget) => void
  onChange: () => void
}

/**
 * Le second `<input type=file>` de l'app : image de fond, watermark, ou style
 * `.json` à importer. Séparé de `useImageInput`, qui ne connaît que les shots
 * et écoute le collage global.
 */
export function useSideFile(options: {
  onBackground: (image: HTMLImageElement) => void
  /** Style courant : requis pour lui attacher un watermark. */
  activeStyle: Style | null
  onStyle: (style: Style) => void | Promise<void>
  onError: (message: string) => void
}): SideFile {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const target = useRef<SideTarget>('background')

  const handler = useRef(options)
  handler.current = options

  const open = useCallback((next: SideTarget) => {
    target.current = next
    inputRef.current?.click()
  }, [])

  const onChange = useCallback(() => {
    const element = inputRef.current
    const file = pickImage(element?.files ?? null) ?? element?.files?.[0] ?? null
    if (element) element.value = ''
    if (!file) return

    void apply(file, target.current, handler.current)
  }, [])

  return { inputRef, open, onChange }
}

async function apply(
  file: File,
  target: SideTarget,
  options: Parameters<typeof useSideFile>[0],
): Promise<void> {
  try {
    if (target === 'background') {
      options.onBackground(await loadImage(file))
      return
    }

    if (target === 'watermark') {
      const style = options.activeStyle
      if (!style) {
        options.onError('Sélectionnez d’abord un style pour y attacher un logo')
        return
      }
      const dataUrl = await toDataUrl(file)
      await options.onStyle({
        ...style,
        watermark: { ...DEFAULT_MARK, ...style.watermark, dataUrl },
      })
      return
    }

    await options.onStyle(parseStyle(await file.text()))
  } catch (cause: unknown) {
    options.onError(cause instanceof Error ? cause.message : 'Fichier illisible')
  }
}
