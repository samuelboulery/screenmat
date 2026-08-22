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

describe('render — grille et placement', () => {
  const five = Array.from({ length: 5 }, () => ({ input: shot }))

  it('rend une grille de cinq shots sans échouer ni déborder', async () => {
    const grid = await render({
      shots: five,
      composition: { layout: 'side', columns: 3 },
      settings: { ratio: '16:9' },
      scale: 1,
    })
    expect(grid.width).toBe(BASE_WIDTH)
    expect(grid.width / grid.height).toBeCloseTo(16 / 9, 2)
  })

  it('produit une image différente quand un shot est retouché', async () => {
    const base = await render({ shots: five, composition: { layout: 'side' }, scale: 1 })
    const moved = await render({
      shots: [{ input: shot, placement: { scale: 0.6, dy: 0.2 } }, ...five.slice(1)],
      composition: { layout: 'side' },
      scale: 1,
    })
    expect(base.buffer.equals(moved.buffer)).toBe(false)
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

describe('render — cache du fond', () => {
  /** Chaque réglage qui touche au fond doit invalider le cache. Un champ oublié
   *  dans la clé fige le fond : le curseur bouge, l'image ne suit pas. */
  const variantes = {
    background: { background: 'gradient' },
    blur: { blur: 3 },
    shapes: { shapes: 9 },
    shapeOpacity: { shapeOpacity: 0.3 },
    saturation: { saturation: 0.4 },
    contrast: { contrast: 1.6 },
    grain: { grain: 0.9 },
    seed: { seed: 42 },
  } as const

  const base = { seed: 5 } as const

  it('rejoue le même fichier quand rien ne change', async () => {
    const a = await render({ input: shot, settings: base, scale: 1 })
    const b = await render({ input: shot, settings: base, scale: 1 })
    expect(a.buffer.equals(b.buffer)).toBe(true)
  })

  for (const [nom, patch] of Object.entries(variantes)) {
    it(`invalide le cache quand \`${nom}\` change`, async () => {
      const plain = await render({ input: shot, settings: base, scale: 1 })
      const changed = await render({ input: shot, settings: { ...base, ...patch }, scale: 1 })
      expect(changed.buffer.equals(plain.buffer)).toBe(false)
    })
  }

  it('ne rejoue pas le fond d’un autre screenshot', async () => {
    // La palette entre dans la clé : deux images de couleurs différentes ne
    // doivent pas partager leur fond.
    const other = fixture(400, 300)
    const green = createCanvas(400, 300)
    const ctx = green.getContext('2d')
    ctx.fillStyle = '#16a34a'
    ctx.fillRect(0, 0, 400, 300)

    const a = await render({ input: other, settings: base, scale: 1 })
    const b = await render({ input: green.toBuffer('image/png'), settings: base, scale: 1 })
    expect(a.buffer.equals(b.buffer)).toBe(false)
  })

  it('change de fond avec l’échelle, pas seulement de taille', async () => {
    const one = await render({ input: shot, settings: base, scale: 1 })
    const two = await render({ input: shot, settings: base, scale: 2 })
    expect(two.width).toBe(one.width * 2)
  })
})
