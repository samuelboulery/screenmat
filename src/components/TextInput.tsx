import { useEffect, useRef, useState } from 'react'
import { m } from '../lib/i18n/index.ts'
import type { Annotation } from '../types.ts'

/** Clignotement du caret, figé sous `prefers-reduced-motion`. */
export function useCaretBlink(active: boolean): boolean {
  const [on, setOn] = useState(true)

  useEffect(() => {
    if (!active) return
    setOn(true)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setOn((value) => !value), 530)
    return () => window.clearInterval(timer)
  }, [active])

  return active && on
}

/* Capture clavier de la saisie de texte. Le champ est invisible : ce qu'on voit
   est le vrai texte dessiné par `renderScene`, caret compris. Passer par un
   `textarea` réel donne l'IME, la dictée, le clavier mobile et Entrée pour une
   nouvelle ligne, sans les réécrire. `⌘Entrée` ou `Escape` valident. */

type TextInputProps = {
  /** Le calque en cours d'édition. Absent ⇒ il vient d'être supprimé. */
  annotation: Annotation | undefined
  onText: (text: string) => void
  onCaret: (caret: number) => void
  onCommit: () => void
}

export default function TextInput({ annotation, onText, onCaret, onCommit }: TextInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const input = ref.current
    if (!input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [])

  if (!annotation) return null

  const report = (input: HTMLTextAreaElement) => onCaret(input.selectionStart ?? input.value.length)

  return (
    <textarea
      ref={ref}
      value={annotation.text}
      aria-label={m.inspector.text.layerText}
      // Pas de 0 × 0 : un `textarea` sans surface laisse son caret en tête, et
      // chaque frappe s'écrivait à l'envers. Une vraie boîte, invisible et
      // hors d'atteinte du pointeur.
      className="pointer-events-none absolute left-0 top-0 h-8 w-40 resize-none border-0 p-0 opacity-0"
      onChange={(event) => {
        onText(event.target.value)
        report(event.target)
      }}
      onSelect={(event) => report(event.currentTarget)}
      onKeyUp={(event) => report(event.currentTarget)}
      onKeyDown={(event) => {
        const submit = event.key === 'Enter' && (event.metaKey || event.ctrlKey)
        if (submit || event.key === 'Escape') {
          event.preventDefault()
          onCommit()
        }
      }}
      onBlur={onCommit}
    />
  )
}
