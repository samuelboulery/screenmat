import { useEffect, useRef, useState } from 'react'
import { BASE_WIDTH, computeGeometry, renderScene, type Geometry } from '../lib/render.ts'
import type { Scene } from '../types.ts'

/** Ce que la scène doit laisser libre autour d'elle, en px CSS. */
export type Inset = { left: number; right: number; top: number; bottom: number }

export type CanvasScene = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  boxRef: React.RefObject<HTMLDivElement | null>
  /** Dernière géométrie rendue, en état et non en ref : elle est écrite dans un
   *  `requestAnimationFrame`, donc après le rendu React. Un chrome d'édition qui
   *  lirait une ref resterait sur la géométrie précédente tant que rien d'autre
   *  ne provoquerait de rendu — un cadre de sélection posé sur l'ancien layout.
   *  Les gestionnaires de pointeur, eux, tirent après le commit : ils la voient
   *  à jour. */
  geometry: Geometry | null
  /** Rapport px CSS / px canvas, `0` tant que rien n'est rendu. */
  ratio: number
  /** Message de la dernière exception de rendu, `null` si le dernier rendu a
   *  abouti. Un canvas noir et muet ne dit rien de sa cause. */
  error: string | null
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
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [cssWidth, setCssWidth] = useState(0)
  const [resized, setResized] = useState(0)
  const [error, setError] = useState<string | null>(null)

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

      // Une exception ici tuait la frame en silence et laissait un canvas noir
      // que rien ne distinguait d'un fond sombre. On la garde visible : à
      // l'écran pour l'utilisateur, en console pour le diagnostic.
      try {
        geometryRef.current = renderScene(context, scene, scale)
        setError(null)
      } catch (cause: unknown) {
        console.error('renderScene', cause)
        setError(cause instanceof Error ? cause.message : 'Rendu impossible')
        return
      }

      canvas.style.width = `${width}px`
      canvas.style.height = `${width / aspect}px`
      setCssWidth(width)
      setGeometry(geometryRef.current)
      onGeometry?.(geometryRef.current)
    }

    const frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [scene, inset, resized, onGeometry])

  return {
    canvasRef,
    boxRef,
    geometry,
    ratio: geometry && cssWidth > 0 ? cssWidth / geometry.width : 0,
    error,
  }
}
