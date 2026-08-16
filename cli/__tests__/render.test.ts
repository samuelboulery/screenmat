import { describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { BASE_WIDTH, inspect, render } from '../api.ts'

/** Un screenshot minuscule, généré en mémoire : le rendu ne dépend pas d'un
 *  fichier de fixture, et le test reste rapide. */
function fixture(width = 400, height = 300): Buffer {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1d4ed8'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(20, 20, width - 40, 60)
  return canvas.toBuffer('image/png')
}

const shot = fixture()

describe('render — géométrie', () => {
  it('dimensionne le canvas sur BASE_WIDTH × l’échelle', async () => {
    const one = await render({ input: shot, scale: 1 })
    const three = await render({ input: shot, scale: 3 })

    expect(one.width).toBe(BASE_WIDTH)
    expect(three.width).toBe(BASE_WIDTH * 3)
    // L'export 3× est l'homothétique exact du 1× : même rapport, au pixel de
    // l'arrondi près.
    expect(three.height / three.width).toBeCloseTo(one.height / one.width, 3)
  })

  it('respecte le ratio demandé', async () => {
    const wide = await render({ input: shot, settings: { ratio: '16:9' }, scale: 1 })
    expect(wide.width / wide.height).toBeCloseTo(16 / 9, 2)
  })
})

describe('render — déterminisme', () => {
  it('rend deux fois le même octet à graine égale', async () => {
    const a = await render({ input: shot, settings: { seed: 7 }, scale: 1 })
    const b = await render({ input: shot, settings: { seed: 7 }, scale: 1 })
    expect(a.buffer.equals(b.buffer)).toBe(true)
  })

  it('rend autre chose à graine différente', async () => {
    const a = await render({ input: shot, settings: { seed: 7 }, scale: 1 })
    const b = await render({ input: shot, settings: { seed: 8 }, scale: 1 })
    expect(a.buffer.equals(b.buffer)).toBe(false)
  })
})

describe('render — erreurs', () => {
  it('nomme le fichier fautif quand il est introuvable', async () => {
    await expect(render({ input: '/introuvable/nulle-part.png' })).rejects.toThrow(
      /nulle-part\.png/,
    )
  })

  it('refuse `background: "image"` sans image de fond', async () => {
    await expect(
      render({ shots: [{ input: shot }], settings: { background: 'image' } }),
    ).rejects.toThrow(/background/)
  })
})

describe('render — annotations', () => {
  it('change le rendu quand un calque est ajouté', async () => {
    const plain = await render({ shots: [{ input: shot }], settings: { seed: 3 }, scale: 1 })
    const marked = await render({
      shots: [{ input: shot, layers: [{ kind: 'box', rect: { x: 0.2, y: 0.2, w: 0.3, h: 0.2 } }] }],
      settings: { seed: 3 },
      scale: 1,
    })
    expect(marked.buffer.equals(plain.buffer)).toBe(false)
  })

  it('ignore un calque masqué — il n’a rien à faire dans le fichier', async () => {
    const plain = await render({ shots: [{ input: shot }], settings: { seed: 3 }, scale: 1 })
    const hidden = await render({
      shots: [{
        input: shot,
        layers: [{ kind: 'box', hidden: true, rect: { x: 0.2, y: 0.2, w: 0.3, h: 0.2 } }],
      }],
      settings: { seed: 3 },
      scale: 1,
    })
    expect(hidden.buffer.equals(plain.buffer)).toBe(true)
  })
})

describe('inspect', () => {
  it('rend le rapport du screenshot, barre de titre exclue', async () => {
    const result = await inspect(shot)
    expect(result.imageWidth).toBe(400)
    expect(result.imageHeight).toBe(300)
    expect(result.screen.h).toBeCloseTo(300 / 400, 3)
    expect(result.screen.y).toBeCloseTo(result.titleBar, 6)
  })

  it('n’annonce pas de barre de titre quand elle est masquée', async () => {
    const result = await inspect(shot, { titleBar: false })
    expect(result.titleBar).toBe(0)
    expect(result.screen.y).toBe(0)
  })
})
