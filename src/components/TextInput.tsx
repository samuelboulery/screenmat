import { useEffect, useRef, useState } from 'react'
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
   est le vrai label dessiné par `renderScene`, caret compris. Passer par un
   `input` réel donne l'IME, la dictée et le clavier mobile sans les réécrire. */

type TextInputProps = {
  /** Le calque en cours d'édition. Absent ⇒ il vient d'être supprimé. */
  annotation: Annotation | undefined
  onText: (text: string) => void
  onCaret: (caret: number) => void
  onCommit: () => void
}

export default function TextInput({ annotation, onText, onCaret, onCommit }: TextInputProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = ref.current
    if (!input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [])

  if (!annotation) return null

  const report = (input: HTMLInputElement) => onCaret(input.selectionStart ?? input.value.length)

  return (
    <input
      ref={ref}
      value={annotation.text}
      aria-label="Layer text"
      className="absolute left-0 top-0 size-0 border-0 p-0 opacity-0"
      onChange={(event) => {
        onText(event.target.value)
        report(event.target)
      }}
      onSelect={(event) => report(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault()
          onCommit()
        }
      }}
      onBlur={onCommit}
    />
  )
}
