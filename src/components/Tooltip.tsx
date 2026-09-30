import { useEffect, type ReactNode } from 'react'
import Keys from './Keys.tsx'

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
 * `aria-hidden` : le nom accessible du contrôle porte déjà le nom, la lire deux
 * fois serait du bruit. Une touche nue ne va pas dans `aria-keyshortcuts` :
 * elle ne vaut qu'au focus du canvas, le panneau `?` la donne.
 *
 * `Escape` les éteint toutes jusqu'au prochain survol (WCAG 1.4.13) : un
 * attribut sur `<html>`, posé par un seul écouteur partagé.
 *
 * ponytail: pas de portail, donc coupée par un parent en `overflow` — la
 * réserver aux barres (outils, barre haute, barre basse) ; un portail avec
 * anchor positioning le jour où l'inspecteur en veut.
 */
export default function Tooltip({ label, shortcut, side = 'bottom', children }: TooltipProps) {
  useEffect(listenForEscape, [])
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        aria-hidden
        className={`t-ui-small pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-sm border border-hairline bg-panel-solid px-2 py-1 whitespace-nowrap text-ink opacity-0 transition-opacity duration-100 group-hover/tip:opacity-100 group-hover/tip:delay-300 group-has-[:focus-visible]/tip:opacity-100 [html[data-tips-off]_&]:opacity-0! ${SIDE[side]}`}
      >
        {label}
        {shortcut && <Keys shortcut={shortcut} className="text-ink-soft" />}
      </span>
    </span>
  )
}

/** `⇧⌘Z` → `Shift+Meta+Z` : `aria-keyshortcuts` veut des noms de touches, pas
 *  les glyphes qu'on affiche. */
export function ariaKeys(shortcut: string): string {
  const keys = shortcut.replace(/⇧/g, 'Shift+').replace(/⌥/g, 'Alt+')
  // `⌘` vaut aussi `Ctrl` : `useShortcuts` accepte l'un ou l'autre.
  return keys.includes('⌘') ? `${keys.replace(/⌘/g, 'Meta+')} ${keys.replace(/⌘/g, 'Control+')}` : keys
}

let listening = false

function listenForEscape(): void {
  if (listening) return
  listening = true
  const root = document.documentElement
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') root.dataset.tipsOff = ''
  })
  document.addEventListener('pointerover', () => delete root.dataset.tipsOff)
}
