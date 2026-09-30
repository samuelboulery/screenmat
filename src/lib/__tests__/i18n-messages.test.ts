import { afterEach, describe, expect, it } from 'vitest'
import { describeScene } from '../describe.ts'
import { humanSize } from '../export.ts'
import { setLang } from '../i18n/index.ts'
import { parseStyle } from '../styles.ts'
import type { Scene } from '../../types.ts'

afterEach(() => setLang('en'))

/** `describeScene` ne lit que le nombre de shots, leurs calques et deux réglages. */
const scene = (shots: number, layers: number, frame: string): Scene =>
  ({
    shots: Array.from({ length: shots }, (_, index) => ({
      layers: index === 0 ? Array.from({ length: layers }, () => ({ kind: 'box' })) : [],
    })),
    settings: { frame, background: 'mesh' },
  }) as unknown as Scene

describe('describeScene', () => {
  it('reste en anglais tant que personne ne change la langue', () => {
    expect(describeScene(scene(1, 0, 'none'))).toBe('Export preview — 1 shot, no frame, mesh background')
    expect(describeScene(scene(2, 3, 'browser'))).toBe(
      'Export preview — 2 shots, browser frame, mesh background, 3 layers',
    )
  })

  it('accorde le singulier et le pluriel en français', () => {
    setLang('fr')
    expect(describeScene(scene(1, 1, 'none'))).toBe('Aperçu de l’export — 1 image, sans cadre, fond mesh, 1 calque')
    expect(describeScene(scene(2, 3, 'browser'))).toBe(
      'Aperçu de l’export — 2 images, cadre browser, fond mesh, 3 calques',
    )
  })
})

describe('humanSize', () => {
  it('parle en Ko et Mo, avec la virgule décimale, en français', () => {
    setLang('fr')
    expect(humanSize(2048)).toBe('2 Ko')
    expect(humanSize(3.5 * 1024 * 1024)).toBe('3,5 Mo')
  })
})

describe('parseStyle', () => {
  it('dit son refus dans la langue courante', () => {
    setLang('fr')
    expect(() => parseStyle('pas du json')).toThrow(/Fichier illisible/)
    expect(() => parseStyle('{"kind":"autre-chose"}')).toThrow(/style screenmat/)
    expect(parseStyle(JSON.stringify({ kind: 'screenmat-style', style: {} })).name).toBe('Importé')

    setLang('en')
    expect(() => parseStyle('pas du json')).toThrow(/not JSON/)
    expect(() => parseStyle('{"kind":"autre-chose"}')).toThrow(/screenmat style/)
  })
})
