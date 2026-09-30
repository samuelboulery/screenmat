import '../index.css'
import './landing.css'
import { MAC, keyLabel } from '../lib/keys.ts'
import { THEME_KEY, resolveTheme, type Theme } from '../lib/theme.ts'

/* La landing est du HTML statique : ce module ne fait que le thème, puis charge
   la vitrine — et avec elle le moteur de rendu — une fois la page peinte. Le
   titre est le LCP, pas le canvas. Pas de React ici. */

const SUN =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-2.93 1.41-1.41m11.32-11.32 1.41-1.41M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41"/></svg>'
const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'

function stored(): string | null {
  try {
    return localStorage.getItem(THEME_KEY)
  } catch (error) {
    console.warn('[theme] stockage illisible, le thème suit le système', error)
    return null
  }
}

function apply(theme: Theme, button: HTMLButtonElement) {
  document.documentElement.dataset.theme = theme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121110' : '#f3f2ee')
  button.innerHTML = theme === 'dark' ? SUN : MOON
  button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')
}

function themeToggle() {
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')
  if (!button) return
  const system = matchMedia('(prefers-color-scheme: dark)')
  apply(resolveTheme(stored(), system.matches), button)
  system.addEventListener('change', () => apply(resolveTheme(stored(), system.matches), button))
  button.addEventListener('click', () => {
    const next: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch (error) {
      console.warn('[theme] choix non mémorisé, il vaut pour cette visite', error)
    }
    apply(next, button)
  })
}

themeToggle()

// Le HTML est écrit pour un Mac. Ailleurs, ⌘ n'existe pas : les touches citées
// (`data-keys`) se réécrivent pour le clavier de la plateforme.
if (!MAC) {
  for (const item of document.querySelectorAll<HTMLElement>('[data-keys]')) {
    item.textContent = keyLabel(item.textContent ?? '', false)
  }
}

const hero = document.querySelector<HTMLElement>('[data-hero]')
if (hero) {
  // Après la première peinture : la vitrine n'entre pas dans le LCP.
  requestAnimationFrame(() =>
    void import('./hero.ts')
      .then(({ startHero }) => document.fonts.ready.then(() => startHero(hero)))
      .catch((error: unknown) => console.error('[landing] la vitrine n’a pas pu démarrer', error)),
  )
}
