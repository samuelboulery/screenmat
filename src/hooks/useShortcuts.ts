import { useEffect, useRef, useState } from 'react'

export type Shortcuts = {
  onExport: () => void
  onCopy: () => void
  /** Nouveau seed : régénère le fond. */
  onShuffle: () => void
  onScale: (scale: number) => void
  onDelete: () => void
  onUndo: () => void
  onRedo: () => void
  onDuplicate: () => void
  onEscape: () => void
  /** Déplacement du calque sélectionné, en pas de grille (`large` = ⇧). */
  onNudge: (dx: number, dy: number, large: boolean) => void
  /** Ordre du calque dans la pile. */
  onLayerMove: (direction: 'up' | 'down') => void
  onSelectAll: () => void
  onGroup: () => void
  onUngroup: () => void
}

/** Direction de chaque flèche du clavier. */
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/** Vrai quand la frappe appartient à un champ : on ne lui vole pas ses touches. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

/**
 * Raccourcis globaux. `⌘V` n'est pas ici : le collage est géré par
 * `useImageInput`, qui écoute l'événement `paste` plutôt que la touche.
 */
export function useShortcuts(shortcuts: Shortcuts, enabled = true): void {
  const current = useRef(shortcuts)
  current.current = shortcuts

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const meta = event.metaKey || event.ctrlKey

      if (meta && event.key === 'e') {
        event.preventDefault()
        current.current.onExport()
        return
      }
      if (meta && event.key === 'c') {
        event.preventDefault()
        current.current.onCopy()
        return
      }
      if (meta && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault()
        if (event.shiftKey) current.current.onRedo()
        else current.current.onUndo()
        return
      }
      if (meta && (event.key === 'd' || event.key === 'D')) {
        event.preventDefault()
        current.current.onDuplicate()
        return
      }
      if (meta && (event.key === 'a' || event.key === 'A')) {
        event.preventDefault()
        current.current.onSelectAll()
        return
      }
      if (meta && (event.key === 'g' || event.key === 'G')) {
        event.preventDefault()
        if (event.shiftKey) current.current.onUngroup()
        else current.current.onGroup()
        return
      }
      if (meta && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        current.current.onLayerMove(event.key === 'ArrowUp' ? 'up' : 'down')
        return
      }
      if (meta) return

      if (event.key === 'Escape') {
        event.preventDefault()
        current.current.onEscape()
      } else if (ARROWS[event.key]) {
        event.preventDefault()
        const [dx, dy] = ARROWS[event.key]
        current.current.onNudge(dx, dy, event.shiftKey)
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        current.current.onShuffle()
      } else if (event.key === '1' || event.key === '2' || event.key === '3') {
        event.preventDefault()
        current.current.onScale(Number(event.key))
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        current.current.onDelete()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

/** Sous 1100 px l'inspecteur se replie et le rail passe à l'horizontale. */
export function useNarrow(breakpoint = 1100): boolean {
  const query = `(max-width: ${breakpoint - 1}px)`
  const [narrow, setNarrow] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setNarrow(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return narrow
}
