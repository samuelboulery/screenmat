import { useCallback, useEffect, useRef, useState, type DragEvent, type RefObject } from 'react'
import { loadImage, pickImages } from '../lib/image.ts'

type ImageInput = {
  error: string | null
  dragging: boolean
  /** À poser sur la zone qui accepte le drop (souvent toute l'app). */
  dropHandlers: {
    onDragOver: (event: DragEvent) => void
    onDragLeave: (event: DragEvent) => void
    onDrop: (event: DragEvent) => void
  }
  /** Ouvre le sélecteur de fichiers natif. */
  openPicker: () => void
  /** À monter une fois dans l'arbre : l'input réel derrière `openPicker`. */
  inputRef: RefObject<HTMLInputElement | null>
  onInputChange: () => void
  clearError: () => void
}

/**
 * Import d'images par les trois chemins : clic, glisser-déposer, ⌘V. Le paste
 * est écouté sur `window` — c'est le seul endroit où l'événement arrive quand
 * aucun champ n'a le focus, et le handoff exige qu'il marche sans focus
 * préalable sur la dropzone.
 *
 * Le hook ne stocke pas les images : plusieurs shots peuvent coexister, c'est
 * `App` qui en tient la liste.
 */
export function useImageInput(onImages: (images: HTMLImageElement[], files: File[]) => void): ImageInput {
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handler = useRef(onImages)
  handler.current = onImages

  const accept = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      setError('Aucune image trouvée dans ce contenu')
      return
    }
    try {
      const images = await Promise.all(files.map(loadImage))
      setError(null)
      handler.current(images, files)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Import impossible')
    }
  }, [])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target
      // Ne pas voler le collage d'un champ de saisie (l'URL, par exemple).
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return

      const files = pickImages(event.clipboardData?.items ?? null)
      if (files.length === 0) return
      event.preventDefault()
      void accept(files)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [accept])

  const onInputChange = useCallback(() => {
    const input = inputRef.current
    void accept(Array.from(input?.files ?? []))
    // Permet de re-sélectionner le même fichier juste après.
    if (input) input.value = ''
  }, [accept])

  return {
    error,
    dragging,
    inputRef,
    onInputChange,
    clearError: () => setError(null),
    openPicker: () => inputRef.current?.click(),
    dropHandlers: {
      onDragOver: (event) => {
        event.preventDefault()
        setDragging(true)
      },
      onDragLeave: (event) => {
        event.preventDefault()
        setDragging(false)
      },
      onDrop: (event) => {
        event.preventDefault()
        setDragging(false)
        void accept(pickImages(event.dataTransfer?.items ?? null))
      },
    },
  }
}
