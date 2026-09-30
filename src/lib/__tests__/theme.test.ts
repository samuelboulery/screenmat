import { describe, expect, it } from 'vitest'
import { resolveTheme } from '../theme.ts'

describe('resolveTheme', () => {
  it('garde le choix mémorisé, quel que soit le système', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('suit le système sans choix, ou avec une valeur inconnue', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
    expect(resolveTheme('sepia', true)).toBe('dark')
  })
})
