import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** `STYLES_DIR` est lu à l'import : la variable d'environnement doit être posée
 *  avant, donc les modules se chargent dynamiquement dans `beforeAll`. */
let dir: string
let listStyles: typeof import('../styles-dir.ts').listStyles
let resolveStyle: typeof import('../styles-dir.ts').resolveStyle
let render: typeof import('../api.ts').render

function styleFile(name: string, settings: Record<string, unknown>): string {
  return JSON.stringify({ kind: 'screenmat-style', version: 1, style: { name, settings } })
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'screenmat-styles-'))
  process.env.SCREENMAT_STYLES = dir

  await writeFile(join(dir, 'docs.json'), styleFile('Docs', { frame: 'macbook', ratio: '16:9', seed: 5 }))
  await writeFile(join(dir, 'vide.json'), 'pas du json')

  const styles = await import('../styles-dir.ts')
  listStyles = styles.listStyles
  resolveStyle = styles.resolveStyle
  render = (await import('../api.ts')).render
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('listStyles', () => {
  it('nomme un style par son fichier et ignore ce qui est illisible', async () => {
    const found = await listStyles()
    expect(found.map((entry) => entry.name)).toEqual(['docs'])
    expect(found[0]?.style.settings.frame).toBe('macbook')
  })
})

describe('resolveStyle', () => {
  it('liste les noms disponibles quand le style demandé n’existe pas', async () => {
    await expect(resolveStyle('absent')).rejects.toThrow(/docs/)
  })
})

describe('render — précédence style / réglages', () => {
  it('applique le style, et laisse les réglages explicites le recouvrir', async () => {
    const { createCanvas } = await import('@napi-rs/canvas')
    const shot = createCanvas(40, 30).toBuffer('image/png')

    const result = await render({ input: shot, style: 'docs', settings: { ratio: '1:1' }, scale: 1 })

    // Du style : le cadre. De l'appelant : le ratio. Ni l'un ni l'autre écrasé
    // par les valeurs par défaut que `parseScene` a remplies au passage.
    expect(result.settings.frame).toBe('macbook')
    expect(result.settings.seed).toBe(5)
    expect(result.settings.ratio).toBe('1:1')
    expect(result.width).toBe(result.height)
  })
})
