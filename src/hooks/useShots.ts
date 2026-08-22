import { useCallback, useMemo, useState } from 'react'
import { createAnnotation, nextId } from '../lib/annotate.ts'
import { DUPLICATE_OFFSET } from '../lib/handles.ts'
import { extractPalette } from '../lib/palette.ts'
import {
  findNode,
  groupNodes,
  isGroup,
  moveNodes,
  nodeIds,
  removeNodes,
  ungroup,
  updateNode,
} from '../lib/tree.ts'
import { DEFAULT_PLACEMENT } from '../types.ts'
import type {
  Annotation,
  AnnotationKind,
  FractionRect,
  LayerGroup,
  LayerNode,
  Placement,
  Shot,
} from '../types.ts'

/** Champs qu'un groupe et un calque partagent : ce que le panneau bascule. */
export type NodePatch = Partial<Pick<LayerGroup, 'name' | 'hidden' | 'locked' | 'collapsed'>>

/** `replace` remplace la sélection, `toggle` ajoute ou retire (⇧/⌘-clic). Une
 *  sélection de plage est résolue par l'appelant, qui seul connaît l'ordre
 *  affiché, et arrive ici en `replace`. */
export type SelectMode = 'replace' | 'toggle'

export type ShotsState = {
  shots: Shot[]
  activeShotId: string
  activeShot: Shot | null
  selection: string[]
  selectedLayerIds: string[]
  /** L'unique calque sélectionné, `null` dès qu'ils sont zéro ou plusieurs. */
  selectedLayerId: string | null
  add: (images: HTMLImageElement[], names: string[]) => void
  replaceAll: (images: HTMLImageElement[], names: string[]) => void
  select: (id: string, additive: boolean) => void
  /** Rend un shot actif sans toucher à la sélection de calque. */
  focusShot: (id: string) => void
  reorder: (from: number, to: number) => void
  /** Retouche la fenêtre d'un shot : taille et décalages dans le canvas. */
  place: (shotId: string, patch: Partial<Placement>) => void
  /** Renvoie l'identifiant du calque créé — l'appelant en a besoin tout de
   *  suite, pour ouvrir la saisie d'un label par exemple. */
  createAnnotation: (shotId: string, kind: AnnotationKind, rect: FractionRect) => string
  patchAnnotation: (shotId: string, id: string, patch: Partial<Annotation>) => void
  patchNode: (shotId: string, id: string, patch: NodePatch) => void
  translateLayers: (shotId: string, ids: readonly string[], dx: number, dy: number) => void
  deleteLayers: (shotId: string, ids: readonly string[]) => void
  duplicateLayers: (shotId: string, ids: readonly string[]) => void
  moveLayer: (shotId: string, id: string, direction: 'up' | 'down') => void
  /** Dépôt du glisser-déposer : `parentId` à `null` pour la racine. */
  moveLayers: (shotId: string, ids: readonly string[], parentId: string | null, index: number) => void
  groupLayers: (shotId: string, ids: readonly string[]) => void
  ungroupLayer: (shotId: string, groupId: string) => void
  selectLayers: (ids: readonly string[], mode?: SelectMode) => void
  /** Réinjecte un état complet — utilisé par l'annulation. */
  restore: (shots: Shot[]) => void
  reset: () => void
}

/**
 * Les shots et leur arbre de calques. L'extraction de palette ne dépend que de
 * l'image : elle est faite une fois à l'import, jamais à chaque mouvement de
 * curseur. Toute la manipulation d'arbre vit dans `lib/tree.ts` — ce hook ne
 * fait que la brancher sur l'état React.
 */
export function useShots(): ShotsState {
  const [shots, setShots] = useState<Shot[]>([])
  const [activeShotId, setActiveShotId] = useState('')
  const [selection, setSelection] = useState<string[]>([])
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([])

  const build = (images: HTMLImageElement[], names: string[]): Shot[] =>
    images.map((image, index) => ({
      id: nextId('shot'),
      name: names[index] ?? `shot-${index + 1}`,
      image,
      palette: extractPalette(image),
      layers: [],
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
    setSelectedLayerIds([])
  }, [])

  const select = useCallback((id: string, additive: boolean) => {
    setActiveShotId(id)
    setSelectedLayerIds([])
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

  const place = useCallback((shotId: string, patch: Partial<Placement>) => {
    setShots((current) =>
      current.map((shot) =>
        shot.id === shotId
          ? { ...shot, placement: { ...(shot.placement ?? DEFAULT_PLACEMENT), ...patch } }
          : shot,
      ),
    )
  }, [])

  const patchLayers = useCallback(
    (shotId: string, patch: (layers: LayerNode[]) => LayerNode[]) => {
      setShots((current) =>
        current.map((shot) => (shot.id === shotId ? { ...shot, layers: patch(shot.layers) } : shot)),
      )
    },
    [],
  )

  const selectLayers = useCallback((ids: readonly string[], mode: SelectMode = 'replace') => {
    setSelectedLayerIds((current) => {
      if (mode === 'replace') return [...ids]
      const next = new Set(current)
      for (const id of ids) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      }
      return [...next]
    })
  }, [])

  const create = useCallback(
    (shotId: string, kind: AnnotationKind, rect: FractionRect) => {
      const annotation = createAnnotation(kind, rect)
      patchLayers(shotId, (layers) => [...layers, annotation])
      setActiveShotId(shotId)
      setSelectedLayerIds([annotation.id])
      return annotation.id
    },
    [patchLayers],
  )

  const patchAnnotation = useCallback(
    (shotId: string, id: string, patch: Partial<Annotation>) => {
      patchLayers(shotId, (layers) =>
        updateNode(layers, id, (node) => (isGroup(node) ? node : { ...node, ...patch })),
      )
    },
    [patchLayers],
  )

  const patchNode = useCallback(
    (shotId: string, id: string, patch: NodePatch) => {
      // `collapsed` n'existe que sur un groupe : l'appliquer à un calque lui
      // collerait un champ que personne ne lit.
      const { collapsed: _collapsed, ...shared } = patch
      patchLayers(shotId, (layers) =>
        updateNode(layers, id, (node) => (isGroup(node) ? { ...node, ...patch } : { ...node, ...shared })),
      )
    },
    [patchLayers],
  )

  const translateLayers = useCallback(
    (shotId: string, ids: readonly string[], dx: number, dy: number) => {
      patchLayers(shotId, (layers) =>
        ids.reduce(
          (current, id) =>
            updateNode(current, id, (node) =>
              isGroup(node)
                ? node
                : { ...node, rect: { ...node.rect, x: node.rect.x + dx, y: node.rect.y + dy } },
            ),
          layers,
        ),
      )
    },
    [patchLayers],
  )

  const deleteLayers = useCallback(
    (shotId: string, ids: readonly string[]) => {
      patchLayers(shotId, (layers) => removeNodes(layers, ids))
      setSelectedLayerIds((current) => current.filter((id) => !ids.includes(id)))
    },
    [patchLayers],
  )

  const duplicateLayers = useCallback(
    (shotId: string, ids: readonly string[]) => {
      // Les identifiants sont tirés avant la mise à jour : un updater React doit
      // rester pur, et on en a besoin tout de suite pour sélectionner les copies.
      const copyIds = ids.map(() => nextId('copy'))
      patchLayers(shotId, (layers) => {
        const copies = ids
          .map((id, index) => {
            const found = findNode(layers, id)
            if (!found || isGroup(found.node)) return null
            return {
              ...found.node,
              id: copyIds[index],
              rect: {
                ...found.node.rect,
                x: found.node.rect.x + DUPLICATE_OFFSET,
                y: found.node.rect.y + DUPLICATE_OFFSET,
              },
            }
          })
          .filter((copy): copy is Annotation => copy !== null)
        return [...layers, ...copies]
      })
      setSelectedLayerIds(copyIds)
    },
    [patchLayers],
  )

  const moveLayer = useCallback(
    (shotId: string, id: string, direction: 'up' | 'down') => {
      patchLayers(shotId, (layers) => {
        const found = findNode(layers, id)
        if (!found) return layers
        const siblings = found.parent ? found.parent.children : layers
        const target = direction === 'up' ? found.index + 1 : found.index - 1
        if (target < 0 || target >= siblings.length) return layers
        // `moveNodes` prend un index dans l'arbre d'origine : monter d'un cran
        // veut donc dire se poser après le frère suivant.
        return moveNodes(layers, [id], found.parent?.id ?? null, direction === 'up' ? target + 1 : target)
      })
    },
    [patchLayers],
  )

  const moveLayers = useCallback(
    (shotId: string, ids: readonly string[], parentId: string | null, index: number) => {
      patchLayers(shotId, (layers) => moveNodes(layers, ids, parentId, index))
    },
    [patchLayers],
  )

  const groupLayers = useCallback(
    (shotId: string, ids: readonly string[]) => {
      if (ids.length === 0) return
      // L'identifiant est tiré ici, pas dans l'updater : celui-ci doit rester
      // pur, et on a besoin du groupe tout de suite pour le sélectionner.
      const groupId = nextId('group')
      patchLayers(shotId, (layers) => groupNodes(layers, ids, 'Group', groupId))
      setSelectedLayerIds([groupId])
    },
    [patchLayers],
  )

  const ungroupLayer = useCallback(
    (shotId: string, groupId: string) => {
      const shot = shots.find((item) => item.id === shotId)
      const found = shot ? findNode(shot.layers, groupId) : null
      if (!found || !isGroup(found.node)) return
      patchLayers(shotId, (layers) => ungroup(layers, groupId))
      setSelectedLayerIds(found.node.children.map((child) => child.id))
    },
    [patchLayers, shots],
  )

  const activeShot = useMemo(
    () => shots.find((shot) => shot.id === activeShotId) ?? shots[0] ?? null,
    [shots, activeShotId],
  )

  const restore = useCallback((next: Shot[]) => {
    setShots(next)
    const alive = new Set(next.flatMap((shot) => nodeIds(shot.layers)))
    setSelectedLayerIds((current) => current.filter((id) => alive.has(id)))
  }, [])

  const reset = useCallback(() => {
    setShots([])
    setActiveShotId('')
    setSelection([])
    setSelectedLayerIds([])
  }, [])

  return {
    shots,
    activeShotId,
    activeShot,
    selection,
    selectedLayerIds,
    selectedLayerId: selectedLayerIds.length === 1 ? selectedLayerIds[0] : null,
    add,
    replaceAll,
    select,
    focusShot,
    reorder,
    place,
    createAnnotation: create,
    patchAnnotation,
    patchNode,
    translateLayers,
    deleteLayers,
    duplicateLayers,
    moveLayer,
    moveLayers,
    groupLayers,
    ungroupLayer,
    selectLayers,
    restore,
    reset,
  }
}
