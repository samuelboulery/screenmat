import { useCallback, useMemo, useState } from 'react'
import { createAnnotation, nextId } from '../lib/annotate.ts'
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
  reorder: (from: number, to: number) => void
  createAnnotation: (kind: AnnotationKind, rect: FractionRect) => void
  patchAnnotation: (id: string, patch: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  selectAnnotation: (id: string | null) => void
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

  const create = useCallback(
    (kind: AnnotationKind, rect: FractionRect) => {
      const annotation = createAnnotation(kind, rect)
      patchShot(activeShotId, (shot) => ({
        ...shot,
        annotations: [...shot.annotations, annotation],
      }))
      setSelectedAnnotationId(annotation.id)
    },
    [activeShotId, patchShot],
  )

  const patchAnnotation = useCallback(
    (id: string, patch: Partial<Annotation>) => {
      patchShot(activeShotId, (shot) => ({
        ...shot,
        annotations: shot.annotations.map((annotation) =>
          annotation.id === id ? { ...annotation, ...patch } : annotation,
        ),
      }))
    },
    [activeShotId, patchShot],
  )

  const deleteAnnotation = useCallback(
    (id: string) => {
      patchShot(activeShotId, (shot) => ({
        ...shot,
        annotations: shot.annotations.filter((annotation) => annotation.id !== id),
      }))
      setSelectedAnnotationId((current) => (current === id ? null : current))
    },
    [activeShotId, patchShot],
  )

  const activeShot = useMemo(
    () => shots.find((shot) => shot.id === activeShotId) ?? shots[0] ?? null,
    [shots, activeShotId],
  )

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
    reorder,
    createAnnotation: create,
    patchAnnotation,
    deleteAnnotation,
    selectAnnotation: setSelectedAnnotationId,
    reset,
  }
}
