import { useCallback, useEffect, useRef, useState, type DragEvent, type RefObject } from 'react'
import { loadImage, pickImages } from '../lib/image.ts'
import { m } from '../lib/i18n/index.ts'
import { captureTab, isCancel } from '../lib/tab-capture.ts'
import { takeHandoff, type Handoff } from '../lib/store.ts'

/** Lue une seule fois par chargement de page : le double montage de
 *  `StrictMode` lirait sinon deux fois la capture avant qu'elle soit effacée. */
let handoff: Promise<Handoff | undefined> | null = null

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
  /** Ouvre la fenêtre de partage du navigateur et importe l'onglet choisi. */
  captureTab: () => Promise<void>
  /** À monter une fois dans l'arbre : l'input réel derrière `openPicker`. */
  inputRef: RefObject<HTMLInputElement | null>
  onInputChange: () => void
  clearError: () => void
}

/**
 * Import d'images par quatre chemins : clic, glisser-déposer, ⌘V, onglet capturé. Le paste
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
      setError(m.messages.input.noImage)
      return
    }
    try {
      const images = await Promise.all(files.map(loadImage))
      setError(null)
      handler.current(images, files)
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : m.messages.input.openFailed,
      )
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

  // La capture collée sur la landing, déposée en IndexedDB avant d'arriver ici.
  useEffect(() => {
    let alive = true
    handoff ??= takeHandoff()
    handoff
      .then((found) => {
        if (alive && found) void accept([new File([found.blob], found.name, { type: found.blob.type })])
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : m.messages.input.handoffFailed)
      })
    return () => {
      alive = false
    }
  }, [accept])

  // Une capture à la fois : un second clic pendant la première ouvrirait une
  // seconde fenêtre de partage, qu'un navigateur refuse en erreur.
  const capturing = useRef(false)

  const onCaptureTab = useCallback(async () => {
    if (capturing.current) return
    capturing.current = true
    setError(null)
    try {
      await accept([await captureTab()])
    } catch (cause: unknown) {
      // Refermer la fenêtre de partage est un choix, pas une panne : rien à dire.
      if (!isCancel(cause)) setError(m.messages.input.captureFailed)
    } finally {
      capturing.current = false
    }
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
    captureTab: onCaptureTab,
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
