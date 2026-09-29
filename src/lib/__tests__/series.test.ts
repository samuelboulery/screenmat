import { describe, expect, it } from 'vitest'
import { BACKGROUND_KINDS, SERIES, seriesOf } from '../series.ts'
import { parseSettings, parseStyle } from '../styles.ts'
import { DEFAULT_SETTINGS } from '../../types.ts'

describe('séries de fonds', () => {
  it('range chaque fond, sauf l’image perso, dans exactement une série', () => {
    const ranked = Object.values(SERIES).flat()
    expect(new Set(ranked).size).toBe(ranked.length)
    expect([...ranked, 'image'].sort()).toEqual([...BACKGROUND_KINDS].sort())
  })

  it('retrouve la série d’un fond, et aucune pour l’image', () => {
    expect(seriesOf('mesh')).toBe('screenshot')
    expect(seriesOf('waves')).toBe('macos')
    expect(seriesOf('halftone')).toBe('dither')
    expect(seriesOf('image')).toBeNull()
  })
})

describe('parseSettings — fonds', () => {
  it('accepte les nouveaux fonds et retombe sur le défaut pour un inconnu', () => {
    expect(parseSettings({ background: 'dunes' }).background).toBe('dunes')
    expect(parseSettings({ background: 'plasma' }).background).toBe(DEFAULT_SETTINGS.background)
  })

  it('borne la trame', () => {
    const settings = parseSettings({ ditherCell: 9, ditherAngle: -40 })
    expect(settings.ditherCell).toBe(0.03)
    expect(settings.ditherAngle).toBe(0)
  })

  it('garde une palette valide et ignore une palette malformée', () => {
    expect(parseSettings({ palette: { base: '#112233', accents: ['#445566', 'red'] } }).palette).toEqual({
      base: '#112233',
      accents: ['#445566'],
    })
    expect(parseSettings({ palette: { base: 'blue' } }).palette).toBeUndefined()
  })
})

describe('parseStyle — palette d’un ancien style', () => {
  it('passe dans les réglages, là où le fond la lit désormais', () => {
    const raw = JSON.stringify({
      kind: 'screenmat-style',
      style: { name: 'Old', settings: {}, palette: { base: '#101018', accents: ['#7DE2FF'] } },
    })
    const style = parseStyle(raw)
    expect(style.settings.palette).toEqual({ base: '#101018', accents: ['#7DE2FF'] })
    expect('palette' in style).toBe(false)
  })
})
