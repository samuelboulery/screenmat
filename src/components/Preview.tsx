import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SelectionOverlay, { ShotRing } from './SelectionOverlay.tsx'
import TextInput, { useCaretBlink } from './TextInput.tsx'
import {
  bounds,
  createAnnotation,
  overlaps,
  rectFromPoints,
  toFractions,
  type Point,
} from '../lib/annotate.ts'
import { draftRect, withDraft } from '../lib/draft.ts'
import { applyHandle, type Handle } from '../lib/handles.ts'
import { inWindow, layerAt, windowAt, type Target } from '../lib/hit.ts'
import { pointAt, useCanvasScene, type Inset } from '../hooks/useCanvasScene.ts'
import type { Geometry } from '../lib/render.ts'
import { expandSelection, flatten } from '../lib/tree.ts'
import type { AnnotationKind, FractionRect, Scene } from '../types.ts'

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
  onResize?: (shotId: string, id: string, rect: FractionRect) => void
  onEdit?: (editing: Editing | null) => void
  onEditText?: (shotId: string, id: string, text: string) => void
  onGeometry?: (geometry: Geometry) => void
  /** Touches nues du canvas (`r`, `1/2/3`, flèches, `⌫`). Présent ⇒ le canvas
   *  entre dans l'ordre de tabulation et devient la surface d'édition clavier ;
   *  absent ⇒ aperçu inerte, comme sur l'écran Styles. */
  onKeys?: (event: React.KeyboardEvent) => void
}

type Drag =
  | { mode: 'draw'; kind: AnnotationKind; target: Target; from: Point; to: Point; shift: boolean }
  | { mode: 'marquee'; target: Target; from: Point; to: Point; additive: boolean }
  | { mode: 'move'; ids: string[]; target: Target; from: Point; to: Point }
  | {
      mode: 'resize'
      id: string
      target: Target
      origin: FractionRect
      kind: AnnotationKind
      handle: Handle
      from: Point
      to: Point
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
  onResize,
  onEdit,
  onEditText,
  onGeometry,
  onKeys,
}: PreviewProps) {
  const [drag, setDrag] = useState<Drag | null>(null)
  /** Dernière position d'un déplacement, en px canvas. */
  const lastPoint = useRef<Point | null>(null)
  const blink = useCaretBlink(editing !== null)
  const interactive = tool !== null

  /** La scène telle qu'elle doit être peinte : brouillon du tracé en cours et
   *  caret de saisie compris. L'export, lui, part de `scene` intacte. */
  const painted = useMemo(() => {
    const withCaret: Scene = editing
      ? { ...scene, editing: { id: editing.id, caret: editing.caret, blink } }
      : scene

    if (drag?.mode !== 'draw') return withCaret

    const box = drag.target.box
    const rect = draftRect(drag.kind, inWindow(box, drag.from), inWindow(box, drag.to), drag.shift)
    if (!rect) return withCaret

    return withDraft(withCaret, drag.target.shotId, createAnnotation(drag.kind, toFractions(rect, box)))
  }, [scene, drag, editing, blink, inWindow])

  const { canvasRef, boxRef, geometry, ratio, error } = useCanvasScene(painted, inset, onGeometry)

  // Le canvas est la surface d'édition clavier : lui donner le focus dès qu'il
  // en devient une, sans quoi `r` ou les flèches exigeraient un clic préalable.
  const editable = Boolean(onKeys)
  useEffect(() => {
    if (editable) canvasRef.current?.focus()
  }, [editable, canvasRef])

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

  const commitEdit = useCallback(() => onEdit?.(null), [onEdit])

  const onPointerDown = (event: React.PointerEvent) => {
    if (!interactive || !geometry) return
    const point = pointAt(event, canvasRef.current, geometry)
    if (!point) return

    event.currentTarget.setPointerCapture(event.pointerId)
    lastPoint.current = point
    if (editing) commitEdit()

    if (tool === 'select') {
      const hit = pick(point)
      const additive = event.shiftKey || event.metaKey || event.ctrlKey

      if (!hit) {
        const target = targetWindow(point)
        if (!additive) onSelect?.(null, [], false)
        if (target) setDrag({ mode: 'marquee', target, from: point, to: point, additive })
        return
      }

      onSelect?.(hit.target.shotId, [hit.annotation.id], additive)

      // Double-clic sur un label : on rouvre la saisie plutôt que de le déplacer.
      if (event.detail === 2 && hit.annotation.kind === 'text') {
        onEdit?.({
          shotId: hit.target.shotId,
          id: hit.annotation.id,
          caret: hit.annotation.text.length,
        })
        return
      }

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

  /** Saisie d'une poignée : le drag part de la sélection courante. */
  const onGrabHandle = (handle: Handle, event: React.PointerEvent) => {
    const only = chosen.length === 1 ? chosen[0] : null
    if (!only || !selectedShot || !geometry) return
    const point = pointAt(event, canvasRef.current, geometry)
    if (!point) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    setDrag({
      mode: 'resize',
      id: only.id,
      target: { shotId: selectedShot.id, box: selectedBox ?? geometry.windows[0] },
      origin: only.rect,
      kind: only.kind,
      handle,
      from: point,
      to: point,
    })
  }

  /**
   * Un geste ne se traite qu'une fois par frame. Une souris à 1000 Hz émettait
   * autant de `pointermove`, et chacun coûtait trois passes de rendu React —
   * l'état du glissement, l'état du document, la pile d'annulation — pour un
   * canvas qui, lui, ne se redessine que 60 fois par seconde.
   *
   * La frame en vol garde la fermeture du rendu où elle a été planifiée. C'est
   * sans conséquence : tout ce qui bouge d'un `pointermove` à l'autre se lit
   * dans une ref (`lastPoint`) ou se réécrit entièrement (`to`), et le reste du
   * glissement — origine, cible, poignée — est fixé à sa saisie.
   */
  const pending = useRef<{ point: Point; shift: boolean } | null>(null)
  const frame = useRef<number | null>(null)

  const flushMove = () => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    const next = pending.current
    pending.current = null
    if (next) applyMove(next.point, next.shift)
  }

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag || !geometry) return
    const point = pointAt(event, canvasRef.current, geometry)
    if (!point) return

    pending.current = { point, shift: event.shiftKey }
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        const next = pending.current
        pending.current = null
        if (next) applyMove(next.point, next.shift)
      })
    }
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

    onResize?.(
      drag.target.shotId,
      drag.id,
      applyHandle(drag.origin, drag.handle, delta, shift, drag.kind),
    )
  }

  const onPointerUp = () => {
    // Le dernier point ne doit pas mourir dans une frame jamais tirée : sans ça,
    // un geste bref relâché avant la première frame se croirait long de zéro.
    flushMove()

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
      const area = rectFromPoints(inWindow(box, drag.from), inWindow(box, to))
      const caught = flatten(shot?.layers ?? [], { skipHidden: true, skipLocked: true })
        .filter((annotation) => overlaps(bounds(annotation, box), area))
        .map((annotation) => annotation.id)
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
      <div className="relative">
        <canvas
          ref={canvasRef}
          // `application` plutôt que `img` quand le canvas prend des touches :
          // c'est ce qui fait passer `r`, les flèches et `⌫` au travers du mode
          // navigation d'un lecteur d'écran plutôt que de les lui laisser.
          role={editable ? 'application' : 'img'}
          aria-label={describeScene(scene)}
          tabIndex={editable ? 0 : undefined}
          onKeyDown={onKeys}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`block touch-none rounded-sm ${
            interactive ? (tool === 'select' ? 'cursor-default' : 'cursor-crosshair') : ''
          }`}
        />

        {marquee && (
          <div
            className="pointer-events-none absolute rounded-xs border border-dashed border-accent/70 bg-accent/10"
            style={marquee}
          />
        )}

        {/* En layout `single` il n'y a qu'une fenêtre : un anneau permanent
            autour d'elle serait du bruit, pas un repère. */}
        {scene.shots.length > 1 && selectedBox && geometry && ratio > 0 && (
          <ShotRing box={selectedBox} ratio={ratio} radius={geometry.radius} />
        )}

        {!drawing &&
          selectedBox &&
          ratio > 0 &&
          chosen.map((annotation) => (
            <SelectionOverlay
              key={annotation.id}
              annotation={annotation}
              box={selectedBox}
              ratio={ratio}
              // Redimensionner à plusieurs demanderait une boîte englobante et
              // une mise à l'échelle relative de chaque rect.
              // ponytail: poignées sur la sélection unitaire seulement.
              onGrab={chosen.length === 1 ? onGrabHandle : undefined}
            />
          ))}

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

/**
 * Le nom accessible du visuel. Un `<canvas>` n'a pas de contenu à lire : sans
 * cette phrase, le sujet même du produit n'existe pas pour un lecteur d'écran.
 * Elle dit ce qui a été réglé, pas ce qui a été peint.
 */
function describeScene(scene: Scene): string {
  const layers = scene.shots.reduce((total, shot) => total + flatten(shot.layers).length, 0)
  const parts = [
    scene.shots.length > 1 ? `${scene.shots.length} shots` : '1 shot',
    scene.settings.frame === 'none' ? 'no frame' : `${scene.settings.frame} frame`,
    `${scene.settings.background} background`,
  ]
  if (layers > 0) parts.push(layers > 1 ? `${layers} layers` : '1 layer')
  return `Export preview — ${parts.join(', ')}`
}

/** Le rectangle de sélection en px CSS. Il n'appartient pas au visuel : il est
 *  tracé dans l'espace de l'écran, sans passer par la fenêtre. */
function marqueeStyle(from: Point, to: Point, ratio: number) {
  if (ratio === 0) return null
  const area = rectFromPoints(from, to)
  return { left: area.x * ratio, top: area.y * ratio, width: area.w * ratio, height: area.h * ratio }
}
