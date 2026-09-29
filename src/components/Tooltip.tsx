import type { ReactNode } from 'react'

type TooltipProps = {
  label: string
  /** La touche, telle qu'elle s'écrit : `T`, `⌘Z`, `?`. */
  shortcut?: string
  side?: 'top' | 'bottom'
  children: ReactNode
}

const SIDE = {
  bottom: 'top-full mt-2',
  top: 'bottom-full mb-2',
} as const

/**
 * Infobulle : nom et raccourci, au survol après un court délai, au focus
 * clavier tout de suite. Pure CSS — aucun état, aucun portail. Elle est
 * `aria-hidden` : le nom accessible et `aria-keyshortcuts` du contrôle portent
 * déjà la même chose, la lire deux fois serait du bruit.
 *
 * ponytail: pas de portail, donc coupée par un parent en `overflow` — la
 * réserver aux barres (outils, barre haute, barre basse) ; un portail avec
 * anchor positioning le jour où l'inspecteur en veut.
 */
export default function Tooltip({ label, shortcut, side = 'bottom', children }: TooltipProps) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        aria-hidden
        className={`t-ui-small pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-sm border border-hairline bg-panel-solid px-2 py-1 whitespace-nowrap text-ink opacity-0 transition-opacity duration-100 group-hover/tip:opacity-100 group-hover/tip:delay-300 group-has-[:focus-visible]/tip:opacity-100 ${SIDE[side]}`}
      >
        {label}
        {shortcut && <kbd className="t-mono-micro rounded-xs border border-hairline-strong px-1 text-ink-soft">{shortcut}</kbd>}
      </span>
    </span>
  )
}

/** `⇧⌘Z` → `Shift+Meta+Z` : `aria-keyshortcuts` veut des noms de touches, pas
 *  les glyphes qu'on affiche. */
export function ariaKeys(shortcut: string): string {
  return shortcut.replace('⇧', 'Shift+').replace('⌘', 'Meta+').replace('⌥', 'Alt+')
}
