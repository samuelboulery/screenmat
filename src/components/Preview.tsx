import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SelectionLayer from './SelectionLayer.tsx'
import TextInput, { useCaretBlink } from './TextInput.tsx'
import { toFractions, unionBounds, type Point } from '../lib/annotate.ts'
import { draftRect } from '../lib/draft.ts'
import { describeScene, marqueeStyle } from '../lib/describe.ts'
import { marqueeCatch, paintDraft, type Drag } from '../lib/gesture.ts'
import { applyHandle, resizeGroup, resizeText, scaleLayer, type Handle } from '../lib/handles.ts'
import { inWindow, layerAt, windowAt, type Target } from '../lib/hit.ts'
import type { Geometry } from '../lib/render.ts'
import { expandSelection, flatten } from '../lib/tree.ts'
import { pointAt, useCanvasScene, type Inset } from '../hooks/useCanvasScene.ts'
import { useAltKey, useFrameThrottle } from '../hooks/usePointerInput.ts'
import {
  DEFAULT_PLACEMENT,
  type Annotation,
  type AnnotationKind,
  type FractionRect,
  type Placement,
  type Scene,
} from '../types.ts'

export type { Inset }

const NO_INSET: Inset = { left: 0, right: 0, top: 0, bottom: 0 }

/** Saisie de texte en cours : le calque édité et la position du curseur. */
export type Editing = { shotId: string; id: string; caret: number }

type PreviewProps = {
  scene: Scene
  inset?: Inset
  /** Outil d'annotation actif. `null` ⇒ preview simple, sans interaction. */
  tool?: AnnotationKind | 'select' | null
  selectedIds?: readonly string[]
  /** Shot auquel appartiennent les calques sélectionnés. */
  selectedShotId?: string | null
  editing?: Editing | null
  onCreate?: (shotId: string, kind: AnnotationKind, rect: FractionRect) => void
  /** `additive` ⇒ ⇧ ou ⌘ : le calque entre ou sort du lot. */
  onSelect?: (shotId: string | null, ids: string[], additive: boolean) => void
  onTranslate?: (shotId: string, ids: readonly string[], dx: number, dy: number) => void
  /** Poignées : un calque change de rect — et de taille, à plusieurs. */
  onPatch?: (shotId: string, id: string, patch: Partial<Annotation>) => void
  /** Retouche la fenêtre d'un shot : ⌥ + glisser la déplace dans le canvas. */
  onPlace?: (shotId: string, patch: Partial<Placement>) => void
  onEdit?: (editing: Editing | null) => void
  onEditText?: (shotId: string, id: string, text: string) => void
  onGeometry?: (geometry: Geometry) => void
  /** Touches nues du canvas (outils, `⇧R`, `1/2/3`, flèches, `⌫`). Présent ⇒ le canvas
   *  entre dans l'ordre de tabulation et devient la surface d'édition clavier ;
   *  absent ⇒ aperçu inerte, comme sur l'écran Styles. */
  onKeys?: (event: React.KeyboardEvent) => void
}

/**
 * Rendu live. La preview n'a pas de code de dessin à elle : elle appelle
 * `renderScene` avec l'échelle qui remplit son conteneur, exactement comme le
 * fera l'export avec 1, 2 ou 3. Le tracé en cours est une annotation glissée
 * dans la scène — on voit la forme finale pendant le geste, pas une
 * approximation. Seul le chrome d'édition (cadres, poignées, rectangle de
 * sélection) est en DOM : rien de tout cela n'apparaît dans l'export.
 */
export default function Preview({
  scene,
  inset = NO_INSET,
  tool = null,
  selectedIds = [],
  selectedShotId = null,
  editing = null,
  onCreate,
  onSelect,
  onTranslate,
  onPatch,
  onPlace,
  onEdit,
  onEditText,
  onGeometry,
  onKeys,
}: PreviewProps) {
  const [drag, setDrag] = useState<Drag | null>(null)
  /** Calque sous le curseur, outil Sélection en main et sans geste en cours. */
  const [hover, setHover] = useState<{ id: string; target: Target } | null>(null)
  /** Dernière position d'un déplacement, en px canvas. */
  const lastPoint = useRef<Point | null>(null)
  const blink = useCaretBlink(editing !== null)
  const interactive = tool !== null
  /** ⌥ enfoncé : le curseur annonce qu'un glisser déplacera la fenêtre. */
  const altPressed = useAltKey(interactive && Boolean(onPlace))

  /** La scène telle qu'elle doit être peinte : brouillon du tracé en cours et
   *  caret de saisie compris. L'export, lui, part de `scene` intacte. */
  const painted = useMemo(() => {
    const withCaret: Scene = editing
      ? { ...scene, editing: { id: editing.id, caret: editing.caret, blink } }
      : scene
    return paintDraft(withCaret, drag)
  }, [scene, drag, editing, blink])

  const { canvasRef, boxRef, geometry, ratio, error } = useCanvasScene(painted, inset, onGeometry)

  // Le canvas est la surface d'édition clavier : lui donner le focus dès qu'il
  // en devient une, sans quoi un outil ou les flèches exigeraient un clic
  // préalable. Et le lui rendre après un choix d'outil au rail ou une saisie :
  // sans quoi `V`, `R` ou `Escape` tomberaient sur un bouton qui les ignore.
  const editable = Boolean(onKeys)
  useEffect(() => {
    if (editable && !editing) canvasRef.current?.focus()
  }, [editable, editing, tool, canvasRef])

  const targetWindow = (point: Point) => windowAt(scene, geometry, point, selectedShotId)
  const pick = (point: Point) => layerAt(scene, geometry, point)

  const selectedShot = scene.shots.find((shot) => shot.id === selectedShotId) ?? scene.shots[0]
  const selectedBox =
    geometry && selectedShot
      ? (geometry.windows.find((box) => scene.shots[box.shot]?.id === selectedShot.id) ??
        geometry.windows[0])
      : null
  // Sélectionner un groupe encadre tout ce qu'il contient : sans quoi on ne
  // verrait rien de ce qu'on s'apprête à déplacer.
  const chosen = useMemo(() => {
    const ids = new Set(expandSelection(selectedShot?.layers ?? [], selectedIds))
    return flatten(selectedShot?.layers ?? []).filter((annotation) => ids.has(annotation.id))
  }, [selectedShot, selectedIds])

  /** Boîte englobante d'une sélection multiple, en fractions de la fenêtre. */
  const groupRect = useMemo(() => {
    if (chosen.length < 2 || !selectedBox) return null
    const area = unionBounds(chosen, selectedBox)
    return area ? toFractions(area, selectedBox) : null
  }, [chosen, selectedBox])

  // Le calque survolé se relit dans la scène : après un undo ou une retouche à
  // l'inspecteur, le contour suit sans attendre le prochain mouvement.
  const hovered =
    hover && tool === 'select'
      ? (flatten(scene.shots.find((shot) => shot.id === hover.target.shotId)?.layers ?? []).find(
          (annotation) => annotation.id === hover.id,
        ) ?? null)
      : null

  const commitEdit = useCallback(() => onEdit?.(null), [onEdit])

  const onPointerDown = (event: React.PointerEvent) => {
    if (!interactive || !geometry) return
    const point = pointAt(event, canvasRef.current, geometry)
    if (!point) return

    event.currentTarget.setPointerCapture(event.pointerId)
    lastPoint.current = point
    setHover(null)
    if (editing) commitEdit()

    // ⌥ + glisser déplace la fenêtre elle-même. Le modificateur n'est pas un
    // luxe : le clic simple trace déjà le rectangle de sélection, et ⇧ comme ⌘
    // servent la sélection additive. ⌥ était le seul encore libre.
    if (event.altKey && onPlace) {
      const target = targetWindow(point)
      const shot = target ? scene.shots.find((item) => item.id === target.shotId) : null
      if (target && shot) {
        setDrag({
          mode: 'shot',
          shotId: shot.id,
          origin: shot.placement ?? DEFAULT_PLACEMENT,
          target,
          from: point,
          to: point,
        })
        return
      }
    }

    // Un clic avec l'outil Texte sur un texte existant le rouvre plutôt que
    // d'en poser un second par-dessus.
    const hit = pick(point)
    if (tool === 'text' && hit && openText(hit)) return

    if (tool === 'select') {
      const additive = event.shiftKey || event.metaKey || event.ctrlKey

      if (!hit) {
        const target = targetWindow(point)
        if (!additive) onSelect?.(null, [], false)
        if (target) setDrag({ mode: 'marquee', target, from: point, to: point, additive })
        return
      }

      onSelect?.(hit.target.shotId, [hit.annotation.id], additive)

      const moving = additive || selectedIds.includes(hit.annotation.id)
      const chosenIds = moving ? [...new Set([...selectedIds, hit.annotation.id])] : [hit.annotation.id]
      lastPoint.current = point
      setDrag({
        mode: 'move',
        ids: expandSelection(selectedShot?.layers ?? [], chosenIds),
        target: hit.target,
        from: point,
        to: point,
      })
      return
    }

    const target = targetWindow(point)
    if (!target) return
    setDrag({ mode: 'draw', kind: tool, target, from: point, to: point, shift: event.shiftKey })
  }

  /** Rouvre la saisie d'un texte. Faux si le calque n'en est pas un. */
  const openText = (hit: { annotation: Annotation; target: Target }): boolean => {
    if (hit.annotation.kind !== 'text') return false
    onSelect?.(hit.target.shotId, [hit.annotation.id], false)
    onEdit?.({ shotId: hit.target.shotId, id: hit.annotation.id, caret: hit.annotation.text.length })
    return true
  }

  /** Double-clic sur un texte, quel que soit l'outil en main. Sur `dblclick`
   *  et non sur `pointerdown` : `detail` y vaut 0 dans Chrome. */
  const onDoubleClick = (event: React.MouseEvent) => {
    if (!interactive || !geometry) return
    const point = pointAt(event, canvasRef.current, geometry)
    const hit = point ? pick(point) : null
    if (hit) openText(hit)
  }

  /** Saisie d'une poignée : le drag part de la sélection courante. */
  const onGrabHandle = (handle: Handle, event: React.PointerEvent) => {
    const only = chosen.length === 1 ? chosen[0] : null
    if (chosen.length === 0 || !selectedShot || !geometry) return
    const point = pointAt(event, canvasRef.current, geometry)
    if (!point) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const target = { shotId: selectedShot.id, box: selectedBox ?? geometry.windows[0] }

    if (!only) {
      if (!groupRect) return
      setDrag({ mode: 'group', origins: chosen, target, rect: groupRect, handle, from: point, to: point })
      return
    }

    setDrag({
      mode: 'resize',
      id: only.id,
      target,
      origin: only.rect,
      kind: only.kind,
      layer: only,
      handle,
      from: point,
      to: point,
    })
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!geometry) return
    const point = pointAt(event, canvasRef.current, geometry)
    if (!drag) {
      trackHover(point)
      return
    }
    if (!point) return

    moves.schedule({ point, shift: event.shiftKey })
  }

  const applyMove = (point: Point, shift: boolean) => {
    if (!drag) return

    // La position courante vit dans une ref, pas seulement dans l'état : deux
    // `pointermove` dans la même frame liraient le même état React, et un geste
    // rapide relâché avant le premier rendu se croirait long de zéro pixel.
    const previous = lastPoint.current ?? drag.from
    lastPoint.current = point

    if (drag.mode === 'draw') {
      // L'aimantation suit l'appui et le relâchement de ⇧ en cours de tracé.
      setDrag({ ...drag, to: point, shift })
      return
    }
    setDrag({ ...drag, to: point })
    if (drag.mode === 'marquee') return

    if (drag.mode === 'shot') {
      // Le placement est absolu depuis le point de départ : la fenêtre suit le
      // curseur au pixel, sans dériver comme le ferait une somme d'écarts.
      // L'unité est la largeur de fenêtre — celle de `layoutOffsets`.
      const width = drag.target.box.width / drag.target.box.scale
      onPlace?.(drag.shotId, {
        dx: drag.origin.dx + (point.x - drag.from.x) / width,
        dy: drag.origin.dy + (point.y - drag.from.y) / width,
      })
      return
    }

    const box = drag.target.box
    const from = inWindow(box, drag.from)
    const to = inWindow(box, point)
    const delta = { x: (to.x - from.x) / box.width, y: (to.y - from.y) / box.width }

    if (drag.mode === 'move') {
      // Le déplacement est relatif : on translate de l'écart depuis la dernière
      // position connue, pas depuis le point de départ.
      const last = inWindow(box, previous)
      onTranslate?.(
        drag.target.shotId,
        drag.ids,
        (to.x - last.x) / box.width,
        (to.y - last.y) / box.width,
      )
      return
    }

    if (drag.mode === 'group') {
      const next = resizeGroup(drag.rect, drag.handle, delta)
      for (const origin of drag.origins) {
        onPatch?.(drag.target.shotId, origin.id, scaleLayer(origin, drag.rect, next))
      }
      return
    }

    onPatch?.(
      drag.target.shotId,
      drag.id,
      drag.kind === 'text'
        ? resizeText(drag.layer, drag.handle, delta, box)
        : { rect: applyHandle(drag.origin, drag.handle, delta, shift, drag.kind) },
    )
  }

  // Tout ce qui bouge d'un `pointermove` à l'autre se lit dans une ref
  // (`lastPoint`) ou se réécrit entièrement (`to`) : une frame par geste suffit.
  const moves = useFrameThrottle<{ point: Point; shift: boolean }>((next) => applyMove(next.point, next.shift))

  /** Survol : ce qu'un clic attraperait se dessine d'un trait fin. Un état
   *  inchangé n'est pas réécrit, sans quoi chaque pixel de souris coûterait un
   *  rendu React. */
  const trackHover = (point: Point | null) => {
    const hit = point && tool === 'select' ? pick(point) : null
    setHover((current) =>
      current?.id === hit?.annotation.id ? current : hit ? { id: hit.annotation.id, target: hit.target } : null,
    )
  }

  const onPointerUp = () => {
    // Le dernier point ne doit pas mourir dans une frame jamais tirée : sans ça,
    // un geste bref relâché avant la première frame se croirait long de zéro.
    moves.flush()

    const end = lastPoint.current
    lastPoint.current = null
    if (!drag) return
    const box = drag.target.box
    const to = end ?? drag.to

    if (drag.mode === 'draw') {
      const rect = draftRect(drag.kind, inWindow(box, drag.from), inWindow(box, to), drag.shift)
      if (rect) onCreate?.(drag.target.shotId, drag.kind, toFractions(rect, box))
    }

    if (drag.mode === 'marquee') {
      const shot = scene.shots.find((item) => item.id === drag.target.shotId)
      const caught = marqueeCatch(shot?.layers ?? [], box, drag.from, to)
      // Le rectangle ajoute, il ne bascule pas : repasser sur un calque déjà
      // pris ne doit pas le retirer du lot.
      if (caught.length > 0) {
        const ids = drag.additive ? [...new Set([...selectedIds, ...caught])] : caught
        onSelect?.(drag.target.shotId, ids, false)
      }
    }

    setDrag(null)
  }

  const marquee = drag?.mode === 'marquee' && geometry ? marqueeStyle(drag.from, drag.to, ratio) : null
  const drawing = drag?.mode === 'draw'

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 grid place-items-center overflow-hidden"
      style={{
        paddingLeft: inset.left,
        paddingRight: inset.right,
        paddingTop: inset.top,
        paddingBottom: inset.bottom,
      }}
    >
      {/* Le geste se suit sur le conteneur, pas sur le canvas : une poignée
          capture le pointeur, et ses `pointermove` ne remonteraient jamais
          jusqu'au canvas, qui n'est pas son ancêtre. */}
      <div
        className="relative"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
      >
        <canvas
          ref={canvasRef}
          // `application` plutôt que `img` quand le canvas prend des touches :
          // c'est ce qui fait passer les outils, les flèches et `⌫` au travers du mode
          // navigation d'un lecteur d'écran plutôt que de les lui laisser.
          role={editable ? 'application' : 'img'}
          aria-label={describeScene(scene)}
          tabIndex={editable ? 0 : undefined}
          onKeyDown={onKeys}
          onPointerDown={onPointerDown}
          onDoubleClick={onDoubleClick}
          className={`block touch-none rounded-sm ${
            !interactive
              ? ''
              : drag?.mode === 'shot'
                ? 'cursor-grabbing'
                : altPressed && onPlace
                  ? 'cursor-grab'
                  : tool === 'select'
                    ? hovered
                      ? 'cursor-move'
                      : 'cursor-default'
                    : 'cursor-crosshair'
          }`}
        />

        {marquee && (
          <div
            className="pointer-events-none absolute rounded-xs border border-dashed border-accent/70 bg-accent/10"
            style={marquee}
          />
        )}

        <SelectionLayer
          multiShot={scene.shots.length > 1}
          box={selectedBox}
          radius={geometry?.radius ?? 0}
          ratio={ratio}
          chosen={chosen}
          groupRect={groupRect}
          hover={hovered && hover && { annotation: hovered, box: hover.target.box }}
          drawing={drawing}
          dragging={drag !== null}
          onGrab={onGrabHandle}
        />

        {/* Le rendu a jeté : le canvas garde la dernière image aboutie, ou
            reste noir. Sans ce mot, l'écran ne dit rien de ce qui s'est passé. */}
        {error && (
          <p
            role="alert"
            className="pointer-events-none absolute inset-x-4 top-4 rounded-md bg-stage/85 px-3 py-2 text-center font-mono text-[11px] text-danger"
          >
            {error}
          </p>
        )}

        {editing && (
          <TextInput
            annotation={flatten(
              scene.shots.find((shot) => shot.id === editing.shotId)?.layers ?? [],
            ).find((annotation) => annotation.id === editing.id)}
            onText={(text) => onEditText?.(editing.shotId, editing.id, text)}
            onCaret={(caret) => onEdit?.({ ...editing, caret })}
            onCommit={commitEdit}
          />
        )}
      </div>
    </div>
  )
}
