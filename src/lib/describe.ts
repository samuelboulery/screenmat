import { rectFromPoints, type Point } from './annotate.ts'
import { m } from './i18n/index.ts'
import { flatten } from './tree.ts'
import type { Scene } from '../types.ts'

/* Ce que la preview dit d'elle-même hors du canvas : son nom accessible, et
   le rectangle de sélection en px CSS. Sorti de `Preview.tsx` pour le garder
   sous 400 lignes. */

/**
 * Le nom accessible du visuel. Un `<canvas>` n'a pas de contenu à lire : sans
 * cette phrase, le sujet même du produit n'existe pas pour un lecteur d'écran.
 * Elle dit ce qui a été réglé, pas ce qui a été peint.
 */
export function describeScene(scene: Scene): string {
  const layers = scene.shots.reduce((total, shot) => total + flatten(shot.layers).length, 0)
  const text = m.messages.describe
  const parts = [
    text.shots(scene.shots.length),
    scene.settings.frame === 'none' ? text.noFrame : text.frame(scene.settings.frame),
    text.background(scene.settings.background),
    ...(layers > 0 ? [text.layers(layers)] : []),
  ]
  return text.preview(parts.join(', '))
}

/** Le rectangle de sélection en px CSS. Il n'appartient pas au visuel : il est
 *  tracé dans l'espace de l'écran, sans passer par la fenêtre. */
export function marqueeStyle(from: Point, to: Point, ratio: number) {
  if (ratio === 0) return null
  const area = rectFromPoints(from, to)
  return { left: area.x * ratio, top: area.y * ratio, width: area.w * ratio, height: area.h * ratio }
}
