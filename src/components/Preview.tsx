import { useCallback, useEffect, useRef, useState } from 'react'
import SelectionOverlay from './SelectionOverlay.tsx'
import { hitTest, isPoint, isSegment, toFractions } from '../lib/annotate.ts'
import { applyMatrix, invertMatrix, windowMatrix } from '../lib/frame.ts'
import { applyHandle, type Handle } from '../lib/handles.ts'
import { BASE_WIDTH, computeGeometry, renderScene, type Geometry, type WindowBox } from '../lib/render.ts'
import type { Annotation, AnnotationKind, FractionRect, Scene } from '../types.ts'

/** Ce que la scène doit laisser libre autour d'elle, en px CSS. */
export type Inset = { left: number; right: number; top: number; bottom: number }

const NO_INSET: Inset = { left: 0, right: 0, top: 0, bottom: 0 }

/** Longueur minimale d'un tracé pour qu'il crée un calque, en px canvas. */
const MIN_DRAW = 4

type Target = { shotId: string; boxIndex: number }

type PreviewProps = {
  scene: Scene
  inset?: Inset
  /** Outil d'annotation actif. `null` ⇒ preview simple, sans interaction. */
  tool?: AnnotationKind | 'select' | null
  selectedId?: string | null
  /** Shot auquel appartient le calque sélectionné. */
  selectedShotId?: string | null
  onCreate?: (shotId: string, kind: AnnotationKind, rect: FractionRect) => void
  onSelect?: (shotId: string | null, id: string | null) => void
  onUpdate?: (shotId: string, id: string, rect: FractionRect) => void
  onGeometry?: (geometry: Geometry) => void
}

type Point = { x: number; y: number }

type Drag =
  | { mode: 'draw'; kind: AnnotationKind; target: Target; from: Point; to: Point }
  | {
      mode: 'move' | 'resize'
      id: string
      target: Target
      origin: FractionRect
      kind: AnnotationKind
      handle: Handle | null
      from: Point
      to: Point
    }

/**
 * Rendu live. La preview n'a pas de code de dessin à elle : elle appelle
 * `renderScene` avec l'échelle qui remplit son conteneur, exactement comme le
 * fera l'export avec 1, 2 ou 3. Seules les poignées de sélection sont en DOM —
 * elles ne sont pas dans le visuel exporté.
 */
export default function Preview({
  scene,
  inset = NO_INSET,
  tool = null,
  selectedId = null,
  selectedShotId = null,
  onCreate,
  onSelect,
  onUpdate,
  onGeometry,
}: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const geometryRef = useRef<Geometry | null>(null)
  const [cssWidth, setCssWidth] = useState(0)
  const [drag, setDrag] = useState<Drag | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box) return

    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0

    const draw = () => {
      const first = scene.shots[0]
      if (!first) return

      const geometry = computeGeometry(
        first.image.naturalWidth,
        first.image.naturalHeight,
        scene.settings,
        1,
        scene.composition,
        scene.shots.length,
      )
      const aspect = geometry.width / geometry.height

      // La scène tient dans la boîte disponible, sans jamais dépasser 1×.
      const available = Math.max(1, box.clientWidth - inset.left - inset.right)
      const availableHeight = Math.max(1, box.clientHeight - inset.top - inset.bottom)
      const fitted = Math.min(available, availableHeight * aspect)
      const width = Math.max(1, Math.min(fitted, BASE_WIDTH))
      const scale = (width * window.devicePixelRatio) / BASE_WIDTH

      geometryRef.current = renderScene(context, scene, scale)
      canvas.style.width = `${width}px`
      canvas.style.height = `${width / aspect}px`
      setCssWidth(width)
      onGeometry?.(geometryRef.current)
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }

    schedule()
    const observer = new ResizeObserver(schedule)
    observer.observe(box)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [scene, inset, onGeometry])

  /** Point du pointeur, en pixels du canvas de rendu. */
  const pointAt = useCallback((event: React.PointerEvent): Point | null => {
    const canvas = canvasRef.current
    const geometry = geometryRef.current
    if (!canvas || !geometry) return null

    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0) return null
    const ratio = geometry.width / rect.width
    return { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio }
  }, [])

  const geometry = geometryRef.current
  const interactive = tool !== null
  const ratio = geometry && cssWidth > 0 ? cssWidth / geometry.width : 0

  /** Le point ramené dans l'espace non tourné d'une fenêtre. */
  const inWindow = (box: WindowBox, point: Point): Point =>
    applyMatrix(invertMatrix(windowMatrix(box)), point)

  const shotAt = (index: number) => scene.shots[geometry?.windows[index]?.shot ?? 0] ?? null

  /** Fenêtre visée par un tracé : celle qui contient le point, la plus en avant
   *  d'abord ; à défaut celle du shot sélectionné. */
  const targetWindow = (point: Point): Target | null => {
    if (!geometry) return null

    for (let index = geometry.windows.length - 1; index >= 0; index -= 1) {
      const box = geometry.windows[index]
      const local = inWindow(box, point)
      const inside =
        local.x >= box.x &&
        local.x <= box.x + box.width &&
        local.y >= box.y &&
        local.y <= box.y + box.height
      if (inside) {
        const shot = shotAt(index)
        if (shot) return { shotId: shot.id, boxIndex: index }
      }
    }

    const fallback = geometry.windows.findIndex(
      (box) => scene.shots[box.shot]?.id === (selectedShotId ?? scene.shots[0]?.id),
    )
    const index = fallback >= 0 ? fallback : 0
    const shot = shotAt(index)
    return shot ? { shotId: shot.id, boxIndex: index } : null
  }

  /** Le calque sous le pointeur, toutes fenêtres confondues. */
  const pick = (point: Point): { annotation: Annotation; target: Target } | null => {
    if (!geometry) return null

    for (let index = geometry.windows.length - 1; index >= 0; index -= 1) {
      const box = geometry.windows[index]
      const shot = shotAt(index)
      if (!shot) continue
      const hit = hitTest(shot.annotations, inWindow(box, point), box)
      if (hit) return { annotation: hit, target: { shotId: shot.id, boxIndex: index } }
    }
    return null
  }

  const selectedShot = scene.shots.find((shot) => shot.id === selectedShotId) ?? scene.shots[0]
  const selected = selectedShot?.annotations.find((item) => item.id === selectedId) ?? null
  const selectedBox =
    selected && geometry
      ? (geometry.windows.find((box) => scene.shots[box.shot]?.id === selectedShot?.id) ??
        geometry.windows[0])
      : null

  const onPointerDown = (event: React.PointerEvent) => {
    if (!interactive || !geometry) return
    const point = pointAt(event)
    if (!point) return

    event.currentTarget.setPointerCapture(event.pointerId)

    if (tool === 'select') {
      const hit = pick(point)
      onSelect?.(hit?.target.shotId ?? null, hit?.annotation.id ?? null)
      if (hit) {
        setDrag({
          mode: 'move',
          id: hit.annotation.id,
          target: hit.target,
          origin: hit.annotation.rect,
          kind: hit.annotation.kind,
          handle: null,
          from: point,
          to: point,
        })
      }
      return
    }

    const target = targetWindow(point)
    if (!target) return
    setDrag({ mode: 'draw', kind: tool, target, from: point, to: point })
  }

  /** Saisie d'une poignée : le drag part de la sélection courante. */
  const onGrabHandle = (handle: Handle, event: React.PointerEvent) => {
    if (!selected || !selectedShot || !geometry) return
    const point = pointAt(event)
    if (!point) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    const boxIndex = geometry.windows.findIndex(
      (box) => scene.shots[box.shot]?.id === selectedShot.id,
    )
    setDrag({
      mode: 'resize',
      id: selected.id,
      target: { shotId: selectedShot.id, boxIndex: Math.max(0, boxIndex) },
      origin: selected.rect,
      kind: selected.kind,
      handle,
      from: point,
      to: point,
    })
  }

  /** Déplacement du pointeur depuis le début du drag, en fractions de fenêtre. */
  const dragDelta = (current: Drag, point: Point): Point => {
    const box = geometry?.windows[current.target.boxIndex]
    if (!box) return { x: 0, y: 0 }
    const from = inWindow(box, current.from)
    const to = inWindow(box, point)
    return { x: (to.x - from.x) / box.width, y: (to.y - from.y) / box.width }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag) return
    const point = pointAt(event)
    if (!point) return
    setDrag({ ...drag, to: point })

    if (drag.mode === 'draw') return

    const delta = dragDelta(drag, point)
    const rect =
      drag.mode === 'move'
        ? { ...drag.origin, x: drag.origin.x + delta.x, y: drag.origin.y + delta.y }
        : applyHandle(drag.origin, drag.handle ?? 'se', delta, event.shiftKey, drag.kind)

    onUpdate?.(drag.target.shotId, drag.id, rect)
  }

  const onPointerUp = () => {
    if (drag?.mode === 'draw' && geometry) {
      const box = geometry.windows[drag.target.boxIndex]
      if (box) {
        const rect = drawnRect(drag, box, inWindow)
        if (rect) onCreate?.(drag.target.shotId, drag.kind, toFractions(rect, box))
      }
    }
    setDrag(null)
  }

  const preview = drag?.mode === 'draw' && geometry ? drawPreview(drag, geometry, ratio, inWindow) : null

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
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`block touch-none rounded-sm ${
            interactive ? (tool === 'select' ? 'cursor-default' : 'cursor-crosshair') : ''
          }`}
        />

        {preview && (
          <div
            className="pointer-events-none absolute rounded-[3px] border border-dashed border-accent/70"
            style={preview}
          />
        )}

        {selected && selectedBox && ratio > 0 && !preview && (
          <SelectionOverlay
            annotation={selected}
            box={selectedBox}
            ratio={ratio}
            onGrab={onGrabHandle}
          />
        )}
      </div>
    </div>
  )
}

/** Rectangle tracé, en px canvas et dans l'espace non tourné de la fenêtre.
 *  `null` si le geste est trop court pour valoir un calque. */
function drawnRect(
  drag: Extract<Drag, { mode: 'draw' }>,
  box: WindowBox,
  inWindow: (box: WindowBox, point: Point) => Point,
) {
  const from = inWindow(box, drag.from)
  const to = inWindow(box, drag.to)
  const w = to.x - from.x
  const h = to.y - from.y

  // Un badge se pose d'un clic : sa taille vient du réglage de police.
  if (isPoint(drag.kind)) return { x: from.x, y: from.y, w: 0, h: 0 }
  // Une flèche horizontale a une hauteur nulle : c'est la longueur qui compte.
  if (Math.hypot(w, h) < MIN_DRAW) return null
  if (isSegment(drag.kind)) return { x: from.x, y: from.y, w, h }

  return { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), w: Math.abs(w), h: Math.abs(h) }
}

/** Aperçu pointillé du tracé en cours, en px CSS. */
function drawPreview(
  drag: Extract<Drag, { mode: 'draw' }>,
  geometry: Geometry,
  ratio: number,
  inWindow: (box: WindowBox, point: Point) => Point,
) {
  const box = geometry.windows[drag.target.boxIndex]
  if (!box || ratio === 0 || isPoint(drag.kind)) return null

  const rect = drawnRect(drag, box, inWindow)
  if (!rect) return null

  const start = applyMatrix(windowMatrix(box), { x: rect.x, y: rect.y })
  const end = applyMatrix(windowMatrix(box), { x: rect.x + rect.w, y: rect.y + rect.h })

  return {
    left: Math.min(start.x, end.x) * ratio,
    top: Math.min(start.y, end.y) * ratio,
    width: Math.abs(end.x - start.x) * ratio,
    height: Math.abs(end.y - start.y) * ratio,
  }
}
