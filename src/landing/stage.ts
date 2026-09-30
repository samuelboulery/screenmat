import { BASE_WIDTH, renderScene } from '../lib/render.ts'
import type { Scene } from '../types.ts'
import type { Box } from './marks.ts'

/* Le canvas de la vitrine. Trois couches, de bas en haut : le rendu final de
   `renderScene` (le seul moteur), la capture brute qui glisse jusqu'à sa place
   dans ce rendu, et la trame qui se « développe » en capture nette. Aucune
   boucle permanente : un rAF ne tourne que pendant une interpolation. */

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3)
export const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

type Tween = { start: number; ms: number; apply: (k: number) => void; ease: (k: number) => number; done: () => void }

export type Stage = {
  /** 0 : trame · 1 : capture nette. */
  develop: number
  /** 0 : capture brute · 1 : rendu final. */
  frame: number
  /** 0 : rendu précédent · 1 : rendu courant (un calque qui arrive). */
  fade: number
  shot: HTMLImageElement | null
  dithered: HTMLCanvasElement | null
  width: number
  height: number
  tween: (ms: number, apply: (k: number) => void, ease?: (k: number) => number) => Promise<void>
  /** Rend la scène et renvoie la place de la capture dans ce rendu. */
  render: (scene: Scene) => Box
  resize: () => void
  cancel: () => void
  draw: () => void
  raw: () => Box
}

export function createStage(canvas: HTMLCanvasElement, ink: () => string): Stage {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  const tweens = new Set<Tween>()
  let dpr = 1
  let current = document.createElement('canvas')
  let previous = document.createElement('canvas')
  let target: Box = { x: 0, y: 0, w: 0, h: 0 }
  let frameId = 0

  const stage: Stage = {
    develop: 0,
    frame: 0,
    fade: 1,
    shot: null,
    dithered: null,
    width: 0,
    height: 0,
    tween: (ms, apply, ease = easeOut) =>
      new Promise<void>((done) => {
        if (reduced() || ms <= 0) {
          apply(1)
          stage.draw()
          done()
          return
        }
        tweens.add({ start: performance.now(), ms, apply, ease, done })
        if (!frameId) frameId = requestAnimationFrame(step)
      }),
    render: (scene) => {
      ;[previous, current] = [current, previous]
      const output = current.getContext('2d')
      if (!output) throw new Error('Canvas 2D is unavailable')
      const geometry = renderScene(output, scene, (stage.width * dpr) / BASE_WIDTH)
      const box = geometry.window
      target = { x: box.x / dpr, y: box.y / dpr, w: box.width / dpr, h: box.height / dpr }
      return target
    },
    resize: () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(2, devicePixelRatio || 1)
      stage.width = rect.width
      stage.height = rect.height
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
    },
    cancel: () => {
      for (const tween of tweens) tween.done()
      tweens.clear()
    },
    draw: () => draw(),
    raw: () => fit(stage, 0.84),
  }

  function step(now: number) {
    for (const tween of tweens) {
      const k = Math.min(1, (now - tween.start) / tween.ms)
      tween.apply(tween.ease(k))
      if (k >= 1) {
        tweens.delete(tween)
        tween.done()
      }
    }
    draw()
    frameId = tweens.size ? requestAnimationFrame(step) : 0
  }

  function draw() {
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx!.clearRect(0, 0, stage.width, stage.height)
    if (stage.frame > 0) {
      ctx!.globalAlpha = stage.frame * (1 - stage.fade)
      ctx!.drawImage(previous, 0, 0, stage.width, stage.height)
      ctx!.globalAlpha = stage.frame * stage.fade
      ctx!.drawImage(current, 0, 0, stage.width, stage.height)
      ctx!.globalAlpha = 1
    }
    if (stage.frame < 1) drawRaw(lerp(fit(stage, 0.84), target, stage.frame))
  }

  function drawRaw(box: Box) {
    if (!stage.shot || !stage.dithered) return
    ctx!.save()
    if (stage.develop < 1) {
      ctx!.imageSmoothingEnabled = false
      ctx!.drawImage(stage.dithered, box.x, box.y, box.w, box.h)
      ctx!.imageSmoothingEnabled = true
    }
    ctx!.beginPath()
    ctx!.rect(box.x, box.y, box.w, box.h * stage.develop)
    ctx!.clip()
    ctx!.drawImage(stage.shot, box.x, box.y, box.w, box.h)
    ctx!.restore()
    if (stage.develop > 0 && stage.develop < 1) {
      // Le front de développement : un filet d'encre qui descend.
      ctx!.fillStyle = ink()
      ctx!.fillRect(box.x - 12, box.y + box.h * stage.develop - 1, box.w + 24, 2)
    }
  }

  return stage
}

/** La capture posée au centre, à `share` de la scène, ratio conservé. */
function fit(stage: Stage, share: number): Box {
  const shot = stage.shot
  if (!shot) return { x: 0, y: 0, w: 0, h: 0 }
  const aspect = shot.naturalWidth / shot.naturalHeight
  let w = stage.width * share
  let h = w / aspect
  if (h > stage.height * share) {
    h = stage.height * share
    w = h * aspect
  }
  return { x: (stage.width - w) / 2, y: (stage.height - h) / 2, w, h }
}

const mix = (a: number, b: number, k: number) => a + (b - a) * k
const lerp = (a: Box, b: Box, k: number): Box => ({ x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), w: mix(a.w, b.w, k), h: mix(a.h, b.h, k) })
