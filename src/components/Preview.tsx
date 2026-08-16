import { useCallback, useEffect, useRef, useState } from 'react'
import { hitTest, toFractions, toPixels } from '../lib/annotate.ts'
import { BASE_WIDTH, computeGeometry, renderScene, type Geometry } from '../lib/render.ts'
import type { AnnotationKind, FractionRect, Scene } from '../types.ts'

/** Ce que la scène doit laisser libre autour d'elle, en px CSS. */
export type Inset = { left: number; right: number; top: number; bottom: number }

const NO_INSET: Inset = { left: 0, right: 0, top: 0, bottom: 0 }

type PreviewProps = {
  scene: Scene
  inset?: Inset
  /** Outil d'annotation actif. `null` ⇒ preview simple, sans interaction. */
  tool?: AnnotationKind | 'select' | null
  selectedId?: string | null
  onCreate?: (kind: AnnotationKind, rect: FractionRect) => void
  onSelect?: (id: string | null) => void
  onMove?: (id: string, rect: FractionRect) => void
  onGeometry?: (geometry: Geometry) => void
}

type Drag =
  | { mode: 'draw'; kind: AnnotationKind; from: { x: number; y: number }; to: { x: number; y: number } }
  | { mode: 'move'; id: string; origin: FractionRect; from: { x: number; y: number }; to: { x: number; y: number } }

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
  onCreate,
  onSelect,
  onMove,
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

  /** Point du pointeur, en pixels du canvas de rendu (échelle 1). */
  const pointAt = useCallback(
    (event: React.PointerEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      const geometry = geometryRef.current
      if (!canvas || !geometry || cssWidth === 0) return null

      const rect = canvas.getBoundingClientRect()
      const ratio = geometry.width / rect.width
      return { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio }
    },
    [cssWidth],
  )

  const geometry = geometryRef.current
  const annotations = scene.shots[0]?.annotations ?? []
  const interactive = tool !== null

  const onPointerDown = (event: React.PointerEvent) => {
    if (!interactive || !geometry) return
    const point = pointAt(event)
    if (!point) return

    event.currentTarget.setPointerCapture(event.pointerId)

    if (tool === 'select') {
      const hit = hitTest(annotations, point, geometry)
      onSelect?.(hit?.id ?? null)
      if (hit) setDrag({ mode: 'move', id: hit.id, origin: hit.rect, from: point, to: point })
      return
    }

    setDrag({ mode: 'draw', kind: tool, from: point, to: point })
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag) return
    const point = pointAt(event)
    if (!point) return
    setDrag({ ...drag, to: point })

    if (drag.mode === 'move' && geometry) {
      onMove?.(drag.id, {
        ...drag.origin,
        x: drag.origin.x + (point.x - drag.from.x) / geometry.width,
        y: drag.origin.y + (point.y - drag.from.y) / geometry.width,
      })
    }
  }

  const onPointerUp = () => {
    if (drag?.mode === 'draw' && geometry) {
      const rect = normalize(drag.from, drag.to)
      // Un simple clic ne crée rien : il faut une surface.
      if (rect.w > 4 && rect.h > 4) onCreate?.(drag.kind, toFractions(rect, geometry))
    }
    setDrag(null)
  }

  const selected = annotations.find((annotation) => annotation.id === selectedId) ?? null
  const overlay =
    selected && geometry && cssWidth > 0
      ? scaleRect(toPixels(selected.rect, geometry), cssWidth / geometry.width)
      : null

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
          className={`block rounded-sm ${interactive ? (tool === 'select' ? 'cursor-default' : 'cursor-crosshair') : ''}`}
        />

        {overlay && (
          <div
            className="pointer-events-none absolute rounded-[9px]"
            style={{
              left: overlay.x,
              top: overlay.y,
              width: overlay.w,
              height: overlay.h,
              border: '1.5px solid #7DE2FF',
              background: 'rgba(7,7,10,.12)',
            }}
          >
            {[
              [-4, -4],
              [-4, undefined],
              [undefined, -4],
              [undefined, undefined],
            ].map(([left, top], index) => (
              <span
                key={index}
                className="absolute size-[7px] rounded-[1px] bg-accent"
                style={{
                  left: left ?? undefined,
                  right: left === undefined ? -4 : undefined,
                  top: top ?? undefined,
                  bottom: top === undefined ? -4 : undefined,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function normalize(a: { x: number; y: number }, b: { x: number; y: number }) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  }
}

function scaleRect(rect: { x: number; y: number; w: number; h: number }, factor: number) {
  return { x: rect.x * factor, y: rect.y * factor, w: rect.w * factor, h: rect.h * factor }
}
