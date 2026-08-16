import { useCallback, useMemo, useState } from 'react'
import { createAnnotation, nextId } from '../lib/annotate.ts'
import { DUPLICATE_OFFSET } from '../lib/handles.ts'
import { extractPalette } from '../lib/palette.ts'
import type { Annotation, AnnotationKind, FractionRect, Shot } from '../types.ts'

export type ShotsState = {
  shots: Shot[]
  activeShotId: string
  activeShot: Shot | null
  selection: string[]
  selectedAnnotationId: string | null
  add: (images: HTMLImageElement[], names: string[]) => void
  replaceAll: (images: HTMLImageElement[], names: string[]) => void
  select: (id: string, additive: boolean) => void
  /** Rend un shot actif sans toucher à la sélection de calque. */
  focusShot: (id: string) => void
  reorder: (from: number, to: number) => void
  createAnnotation: (shotId: string, kind: AnnotationKind, rect: FractionRect) => void
  patchAnnotation: (shotId: string, id: string, patch: Partial<Annotation>) => void
  deleteAnnotation: (shotId: string, id: string) => void
  duplicateAnnotation: (shotId: string, id: string) => void
  moveAnnotation: (shotId: string, id: string, direction: 'up' | 'down') => void
  selectAnnotation: (id: string | null) => void
  /** Réinjecte un état complet — utilisé par l'annulation. */
  restore: (shots: Shot[]) => void
  reset: () => void
}

/**
 * Les shots et leurs calques. L'extraction de palette ne dépend que de l'image :
 * elle est faite une fois à l'import, jamais à chaque mouvement de curseur.
 */
export function useShots(): ShotsState {
  const [shots, setShots] = useState<Shot[]>([])
  const [activeShotId, setActiveShotId] = useState('')
  const [selection, setSelection] = useState<string[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)

  const build = (images: HTMLImageElement[], names: string[]): Shot[] =>
    images.map((image, index) => ({
      id: nextId('shot'),
      name: names[index] ?? `shot-${index + 1}`,
      image,
      palette: extractPalette(image),
      annotations: [],
    }))

  const add = useCallback((images: HTMLImageElement[], names: string[]) => {
    const fresh = build(images, names)
    if (fresh.length === 0) return
    setShots((current) => [...current, ...fresh])
    setActiveShotId((current) => current || fresh[0].id)
    setSelection((current) => [...current, ...fresh.map((shot) => shot.id)])
  }, [])

  const replaceAll = useCallback((images: HTMLImageElement[], names: string[]) => {
    const fresh = build(images, names)
    setShots(fresh)
    setActiveShotId(fresh[0]?.id ?? '')
    setSelection(fresh.map((shot) => shot.id))
    setSelectedAnnotationId(null)
  }, [])

  const select = useCallback((id: string, additive: boolean) => {
    setActiveShotId(id)
    setSelectedAnnotationId(null)
    setSelection((current) => {
      if (!additive) return [id]
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    })
  }, [])

  const focusShot = useCallback((id: string) => setActiveShotId(id), [])

  const reorder = useCallback((from: number, to: number) => {
    setShots((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return current
      }
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const patchShot = useCallback((id: string, patch: (shot: Shot) => Shot) => {
    setShots((current) => current.map((shot) => (shot.id === id ? patch(shot) : shot)))
  }, [])

  const patchLayers = useCallback(
    (shotId: string, patch: (annotations: Annotation[]) => Annotation[]) => {
      patchShot(shotId, (shot) => ({ ...shot, annotations: patch(shot.annotations) }))
    },
    [patchShot],
  )

  const create = useCallback(
    (shotId: string, kind: AnnotationKind, rect: FractionRect) => {
      const annotation = createAnnotation(kind, rect)
      patchLayers(shotId, (annotations) => [...annotations, annotation])
      setActiveShotId(shotId)
      setSelectedAnnotationId(annotation.id)
    },
    [patchLayers],
  )

  const patchAnnotation = useCallback(
    (shotId: string, id: string, patch: Partial<Annotation>) => {
      patchLayers(shotId, (annotations) =>
        annotations.map((annotation) =>
          annotation.id === id ? { ...annotation, ...patch } : annotation,
        ),
      )
    },
    [patchLayers],
  )

  const deleteAnnotation = useCallback(
    (shotId: string, id: string) => {
      patchLayers(shotId, (annotations) =>
        annotations.filter((annotation) => annotation.id !== id),
      )
      setSelectedAnnotationId((current) => (current === id ? null : current))
    },
    [patchLayers],
  )

  const duplicateAnnotation = useCallback(
    (shotId: string, id: string) => {
      // L'identifiant est tiré avant la mise à jour : un updater React doit
      // rester pur, et on en a besoin tout de suite pour sélectionner la copie.
      const copyId = nextId('copy')
      patchLayers(shotId, (annotations) => {
        const source = annotations.find((annotation) => annotation.id === id)
        if (!source) return annotations
        const copy: Annotation = {
          ...source,
          id: copyId,
          rect: {
            ...source.rect,
            x: source.rect.x + DUPLICATE_OFFSET,
            y: source.rect.y + DUPLICATE_OFFSET,
          },
        }
        return [...annotations, copy]
      })
      setSelectedAnnotationId(copyId)
    },
    [patchLayers],
  )

  const moveAnnotation = useCallback(
    (shotId: string, id: string, direction: 'up' | 'down') => {
      patchLayers(shotId, (annotations) => {
        const index = annotations.findIndex((annotation) => annotation.id === id)
        const target = direction === 'up' ? index + 1 : index - 1
        if (index < 0 || target < 0 || target >= annotations.length) return annotations
        const next = [...annotations]
        next[index] = annotations[target]
        next[target] = annotations[index]
        return next
      })
    },
    [patchLayers],
  )

  const activeShot = useMemo(
    () => shots.find((shot) => shot.id === activeShotId) ?? shots[0] ?? null,
    [shots, activeShotId],
  )

  const restore = useCallback((next: Shot[]) => {
    setShots(next)
    setSelectedAnnotationId((current) =>
      next.some((shot) => shot.annotations.some((annotation) => annotation.id === current))
        ? current
        : null,
    )
  }, [])

  const reset = useCallback(() => {
    setShots([])
    setActiveShotId('')
    setSelection([])
    setSelectedAnnotationId(null)
  }, [])

  return {
    shots,
    activeShotId,
    activeShot,
    selection,
    selectedAnnotationId,
    add,
    replaceAll,
    select,
    focusShot,
    reorder,
    createAnnotation: create,
    patchAnnotation,
    deleteAnnotation,
    duplicateAnnotation,
    moveAnnotation,
    selectAnnotation: setSelectedAnnotationId,
    restore,
    reset,
  }
}
