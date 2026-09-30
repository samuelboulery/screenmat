import { useCallback, useEffect, useState } from 'react'
import { resolveTheme, THEME_KEY, type Theme } from '../lib/theme.ts'

const DARK_QUERY = '(prefers-color-scheme: dark)'
/** Couleur de la barre du navigateur mobile : la scène du thème. */
const THEME_COLOR: Record<Theme, string> = { light: '#f3f2ee', dark: '#121110' }

function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_KEY)
  } catch (error) {
    console.warn('[theme] stockage illisible, le thème suit le système', error)
    return null
  }
}

/**
 * Thème clair ou sombre. Le script d'`index.html` l'a déjà posé sur `<html>` ;
 * ce hook le lit, le bascule et suit le système tant qu'aucun choix n'est
 * mémorisé.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    resolveTheme(readStored(), matchMedia(DARK_QUERY).matches),
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  }, [theme])

  useEffect(() => {
    const media = matchMedia(DARK_QUERY)
    const follow = () => {
      if (readStored() === null) setTheme(media.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [])

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch (error) {
      console.warn('[theme] choix non mémorisé, il vaut pour cette visite', error)
    }
    setTheme(next)
  }, [theme])

  return { theme, toggle }
}
