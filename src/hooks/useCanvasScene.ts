import { useEffect, useRef, useState } from 'react'
import { BASE_WIDTH, computeGeometry, renderScene, type Geometry } from '../lib/render.ts'
import type { Scene } from '../types.ts'

/** Ce que la scène doit laisser libre autour d'elle, en px CSS. */
export type Inset = { left: number; right: number; top: number; bottom: number }

export type CanvasScene = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  boxRef: React.RefObject<HTMLDivElement | null>
  /** Dernière géométrie rendue. Une ref, pas un état : les gestionnaires de
   *  pointeur ont besoin de la valeur du moment, pas de celle du rendu React. */
  geometryRef: React.RefObject<Geometry | null>
  /** Rapport px CSS / px canvas, `0` tant que rien n'est rendu. */
  ratio: number
}

/** Point du pointeur, en pixels du canvas de rendu. */
export function pointAt(
  event: React.PointerEvent,
  canvas: HTMLCanvasElement | null,
  geometry: Geometry,
): { x: number; y: number } | null {
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0) return null
  const ratio = geometry.width / rect.width
  return { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio }
}

/**
 * Dimensionne le canvas et le peint avec `renderScene` — le seul chemin de
 * rendu, celui-là même que l'export appelle à 1, 2 ou 3.
 */
export function useCanvasScene(
  scene: Scene,
  inset: Inset,
  onGeometry?: (geometry: Geometry) => void,
): CanvasScene {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const geometryRef = useRef<Geometry | null>(null)
  const [cssWidth, setCssWidth] = useState(0)
  const [resized, setResized] = useState(0)

  // Le redimensionnement du conteneur relance un rendu. L'observer vit dans son
  // propre effet, sinon il serait recréé à chaque mouvement de pointeur.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(() => setResized((value) => value + 1))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box) return

    const context = canvas.getContext('2d')
    if (!context) return

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

    const frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [scene, inset, resized, onGeometry])

  const geometry = geometryRef.current
  return {
    canvasRef,
    boxRef,
    geometryRef,
    ratio: geometry && cssWidth > 0 ? cssWidth / geometry.width : 0,
  }
}
