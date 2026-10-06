import { describe, expect, it } from 'vitest'
import { withVersion } from '../version.ts'
import page from '../../../index.html?raw'

describe('withVersion', () => {
  it('remplace chaque %VERSION% par le numéro donné', () => {
    expect(withVersion('<a>v%VERSION%</a><b>%VERSION%</b>', '1.2.3')).toBe('<a>v1.2.3</a><b>1.2.3</b>')
  })

  it('la landing porte la version dans son pied de page', () => {
    const html = withVersion(page, '9.9.9')
    expect(html).toMatch(/<footer[\s\S]*>v9\.9\.9<\/a>[\s\S]*<\/footer>/)
    expect(html).not.toContain('%VERSION%')
  })
})
