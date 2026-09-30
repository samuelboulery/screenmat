import { LANG_KEY, type Lang } from '../lib/i18n/index.ts'

/** La langue de cette page : `/fr/` est écrite en français au build. */
export const PAGE_LANG: Lang = document.documentElement.lang === 'fr' ? 'fr' : 'en'

function remember(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch (error) {
    console.warn('[lang] choix non mémorisé, l’éditeur suivra le navigateur', error)
  }
}

/**
 * Lire `/fr/`, c'est vouloir le français : l'éditeur suivra, quel que soit le
 * chemin qui y mène (lien, nouvel onglet, vitrine). `/` est l'adresse par
 * défaut, y être ne dit rien — là, l'éditeur garde le choix mémorisé, sinon le
 * navigateur. Le lien de bascule, lui, est un choix explicite dans les deux sens.
 */
export function wireLang(): void {
  if (PAGE_LANG === 'fr') remember('fr')
  const link = document.querySelector<HTMLAnchorElement>('[data-lang-switch]')
  link?.addEventListener('click', () => remember(link.dataset.langSwitch === 'fr' ? 'fr' : 'en'))
}
