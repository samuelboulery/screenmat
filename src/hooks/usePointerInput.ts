import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * `⌥` enfoncé, lu sur `window` : sans clic préalable, le canvas ne verrait rien
 * du modificateur, et le curseur mentirait sur ce que le prochain geste fait.
 */
export function useAltKey(enabled: boolean): boolean {
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const sync = (event: KeyboardEvent) => setPressed(event.altKey)
    const clear = () => setPressed(false)
    window.addEventListener('keydown', sync)
    window.addEventListener('keyup', sync)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', sync)
      window.removeEventListener('keyup', sync)
      window.removeEventListener('blur', clear)
    }
  }, [enabled])

  return enabled && pressed
}

/**
 * Espace maintenu — la « main » de Figma : le prochain glisser déplace le
 * screenshot dans son écran. Lu sur `window`, comme `⌥`, mais armé seulement
 * quand `active()` le dit (pointeur sur la preview) et que le clavier est au
 * canvas ou nulle part : sur un bouton, une bascule ou un champ, Espace presse,
 * coche ou écrit, et doit continuer de le faire (WCAG 2.1.1).
 */
export function useSpaceKey(enabled: boolean, active: () => boolean): boolean {
  const [pressed, setPressed] = useState(false)
  const armed = useRef(active)
  armed.current = active

  useEffect(() => {
    if (!enabled) return
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.metaKey || event.ctrlKey || event.altKey || !armed.current()) return
      if (event.target !== document.body && !(event.target instanceof HTMLCanvasElement)) return
      // Sans ça : la page défile, ou le bouton resté focalisé se déclenche.
      event.preventDefault()
      setPressed(true)
    }
    const up = (event: KeyboardEvent) => {
      if (event.code === 'Space') setPressed(false)
    }
    const clear = () => setPressed(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      // Désarmé touche enfoncée, le relâchement ne serait plus entendu.
      setPressed(false)
    }
  }, [enabled])

  return enabled && pressed
}

/**
 * Un geste ne se traite qu'une fois par frame. Une souris à 1000 Hz émettait
 * autant de `pointermove`, et chacun coûtait trois passes de rendu React —
 * l'état du glissement, l'état du document, la pile d'annulation — pour un
 * canvas qui, lui, ne se redessine que 60 fois par seconde.
 *
 * `schedule` garde la dernière valeur et la livre à la prochaine frame ;
 * `flush` la livre tout de suite — au relâchement, un geste bref ne doit pas
 * mourir dans une frame jamais tirée. `apply` est relu à chaque rendu : la
 * frame en vol appelle toujours la version courante.
 */
export function useFrameThrottle<T>(apply: (value: T) => void) {
  const latest = useRef(apply)
  latest.current = apply
  const pending = useRef<T | null>(null)
  const frame = useRef<number | null>(null)

  const flush = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    const next = pending.current
    pending.current = null
    if (next !== null) latest.current(next)
  }, [])

  const schedule = useCallback(
    (value: T) => {
      pending.current = value
      if (frame.current === null) frame.current = requestAnimationFrame(flush)
    },
    [flush],
  )

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  return { schedule, flush }
}
