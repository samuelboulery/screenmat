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
