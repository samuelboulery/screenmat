import { useCallback, useSyncExternalStore } from 'react'
import { getLang, LANG_KEY, resolveLang, setLang, subscribe, type Lang } from '../lib/i18n/index.ts'

/** La langue choisie, ou `null` : le navigateur décide alors. */
function readStored(): string | null {
  try {
    return localStorage.getItem(LANG_KEY)
  } catch (error) {
    console.warn('[lang] stockage illisible, la langue suit le navigateur', error)
    return null
  }
}

/** À appeler une fois, avant le premier rendu : le choix mémorisé, sinon le
 *  navigateur. */
export function initLang(): void {
  setLang(resolveLang(readStored(), navigator.languages))
  // Sans changement de langue, `setLang` ne pose rien : l'attribut suit quand même.
  document.documentElement.lang = getLang()
}

/**
 * La langue de l'interface. `App` s'y abonne : aucun composant n'est mémoïsé,
 * son rendu redescend donc partout, et chacun relit `m`.
 */
export function useLang(): { lang: Lang; toggle: () => void } {
  const lang = useSyncExternalStore(subscribe, getLang)

  const toggle = useCallback(() => {
    const next: Lang = getLang() === 'fr' ? 'en' : 'fr'
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch (error) {
      console.warn('[lang] choix non mémorisé, il vaut pour cette visite', error)
    }
    setLang(next)
  }, [])

  return { lang, toggle }
}
