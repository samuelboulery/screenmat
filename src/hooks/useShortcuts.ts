import { useCallback, useEffect, useRef, useState } from 'react'

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
  /** Le panneau des raccourcis, sur `?`. */
  onHelp: () => void
}

export type ShortcutEntry = { keys: string; label: string }

/**
 * La table des raccourcis, source unique du panneau `?`. Les outils n'y sont
 * pas : `TOOL_KEYS` (`ToolRail.tsx`) les porte, et le panneau les lit là.
 * Une ligne ajoutée à un handler sans l'être ici est un raccourci introuvable.
 */
export const SHORTCUTS: { title: string; hint: string; items: ShortcutEntry[] }[] = [
  {
    title: 'Everywhere',
    hint: 'With a modifier key',
    items: [
      { keys: '⌘V', label: 'Paste a screenshot' },
      { keys: '⌘E', label: 'Export' },
      { keys: '⌘C', label: 'Copy the image' },
      { keys: '⌘Z', label: 'Undo' },
      { keys: '⇧⌘Z', label: 'Redo' },
      { keys: '⌘D', label: 'Duplicate layer' },
      { keys: '⌘A', label: 'Select all layers' },
      { keys: '⌘G', label: 'Group' },
      { keys: '⇧⌘G', label: 'Ungroup' },
      { keys: '⌘↑ ⌘↓', label: 'Move in the layer stack' },
    ],
  },
  {
    title: 'On the canvas',
    hint: 'Single keys, when the canvas has focus',
    items: [
      { keys: '⇧R', label: 'New background' },
      { keys: '1 2 3', label: 'Export scale' },
      { keys: '⌫', label: 'Delete layer' },
      { keys: '← ↑ → ↓', label: 'Nudge — ⇧ for ×5' },
      { keys: 'Esc', label: 'Deselect, then back to Select' },
      { keys: '?', label: 'This panel' },
    ],
  },
  {
    title: 'With the mouse',
    hint: 'Gestures on the canvas',
    items: [
      { keys: '⇧ drag', label: 'Snap to 45°, keep proportions' },
      { keys: '⇧ click', label: 'Add to the selection' },
      { keys: '⌥ drag', label: 'Move a whole image' },
      { keys: 'Double-click', label: 'Edit a text · lock a tool' },
    ],
  },
]

/** Direction de chaque flèche du clavier. */
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/** Ce qu'un handler lit d'une touche — vrai de l'événement DOM comme du
 *  synthétique React, sans importer ni l'un ni l'autre. */
export type KeyEvent = {
  key: string
  shiftKey: boolean
  altKey?: boolean
  metaKey: boolean
  ctrlKey: boolean
  preventDefault: () => void
}

/** Vrai quand la frappe appartient à un champ : on ne lui vole pas ses touches. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

/** Les combinaisons à modificateur : elles valent partout dans l'app. */
function handleModified(event: KeyEvent, shortcuts: Shortcuts): void {
  const key = event.key.toLowerCase()

  if (key === 'e') shortcuts.onExport()
  else if (key === 'c') shortcuts.onCopy()
  else if (key === 'z') (event.shiftKey ? shortcuts.onRedo : shortcuts.onUndo)()
  else if (key === 'd') shortcuts.onDuplicate()
  else if (key === 'a') shortcuts.onSelectAll()
  else if (key === 'g') (event.shiftKey ? shortcuts.onUngroup : shortcuts.onGroup)()
  else if (event.key === 'ArrowUp') shortcuts.onLayerMove('up')
  else if (event.key === 'ArrowDown') shortcuts.onLayerMove('down')
  else return

  event.preventDefault()
}

/** Les touches nues : elles n'existent que quand le canvas a le focus. */
export function handleBare(event: KeyEvent, shortcuts: Shortcuts): void {
  const arrow = ARROWS[event.key]

  if (event.key === 'Escape') shortcuts.onEscape()
  else if (arrow) shortcuts.onNudge(arrow[0], arrow[1], event.shiftKey)
  // ⇧R : `r` nu choisit l'outil Box, comme dans tout éditeur.
  else if (event.shiftKey && event.key.toLowerCase() === 'r') shortcuts.onShuffle()
  else if (event.key === '1' || event.key === '2' || event.key === '3')
    shortcuts.onScale(Number(event.key))
  else if (event.key === 'Delete' || event.key === 'Backspace') shortcuts.onDelete()
  else if (event.key === '?') shortcuts.onHelp()
  else return

  event.preventDefault()
}

/**
 * Raccourcis. Deux portées, et la frontière n'est pas cosmétique :
 *
 * - **Global** : les combinaisons à modificateur, posées sur `window`. Elles
 *   n'entrent en conflit avec rien et WCAG 2.1.4 ne les vise pas.
 * - **Au focus** : les touches nues (`⇧R`, `1/2/3`, flèches, `⌫`, `Escape`, `?`),
 *   renvoyées comme handler à poser sur le canvas. Les poser sur `window` avec
 *   `preventDefault()` tuait le défilement aux flèches de tout panneau, et 2.1.4
 *   exige de pouvoir couper, remapper, ou n'activer qu'au focus un raccourci à
 *   touche unique — c'est la troisième porte qu'on prend ici.
 *
 * `⌘V` n'est nulle part : le collage est géré par `useImageInput`, qui écoute
 * l'événement `paste` plutôt que la touche.
 */
export function useShortcuts(shortcuts: Shortcuts, enabled = true): (event: KeyEvent) => void {
  const current = useRef(shortcuts)
  current.current = shortcuts

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      if (!event.metaKey && !event.ctrlKey) return
      // Un `<dialog>` modal rend la page inerte au clic, pas au clavier :
      // ⌘Z derrière le tiroir annulerait sur un document qu'on ne voit pas.
      if (document.querySelector('dialog[open]')) return
      handleModified(event, current.current)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])

  return useCallback(
    (event: KeyEvent) => {
      // Les combinaisons sont déjà passées par le global : les traiter ici les
      // déclencherait deux fois.
      if (!enabled || event.metaKey || event.ctrlKey) return
      handleBare(event, current.current)
    },
    [enabled],
  )
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
