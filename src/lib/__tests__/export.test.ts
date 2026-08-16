import { describe, expect, it } from 'vitest'
import { exportFilename, slug } from '../export.ts'

describe('slug', () => {
  it('nettoie une URL pour en faire un nom de fichier', () => {
    expect(slug('https://astonishing-lokum-03e021.netlify.app')).toBe(
      'astonishing-lokum-03e021-netlify-app',
    )
    expect(slug('miette-indol.vercel.app')).toBe('miette-indol-vercel-app')
  })

  it('retombe sur un nom par défaut quand l’URL est vide ou impraticable', () => {
    expect(slug('')).toBe('shotframe')
    expect(slug('   ')).toBe('shotframe')
    expect(slug('///')).toBe('shotframe')
  })

  it('borne la longueur', () => {
    expect(slug('a'.repeat(200)).length).toBe(48)
  })
})

describe('exportFilename', () => {
  it('porte l’échelle et l’extension du format choisi', () => {
    expect(exportFilename('miette-indol.vercel.app', 2, 'png')).toBe(
      'miette-indol-vercel-app-2x.png',
    )
    expect(exportFilename('miette-indol.vercel.app', 3, 'webp')).toBe(
      'miette-indol-vercel-app-3x.webp',
    )
    expect(exportFilename('', 1, 'webp')).toBe('shotframe-1x.webp')
  })
})
