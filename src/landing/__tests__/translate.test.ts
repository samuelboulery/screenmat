import { describe, expect, it } from 'vitest'
import { HTML_FR } from '../html.fr.ts'
import { translateLanding, translateMarked } from '../translate.ts'
import page from '../../../index.html?raw'

describe('translateMarked', () => {
  it('remplace le texte et les attributs marqués, et rien d’autre', () => {
    const html = '<html lang="en"><p class="a" data-i18n="x">Hello <i>you</i></p><b data-i18n-attr="aria-label:y" aria-label="Old">keep</b></html>'
    expect(translateMarked(html, { x: 'Salut & toi', y: 'Un "neuf"' })).toBe(
      '<html lang="en"><p class="a" data-i18n="x">Salut &amp; toi</p><b data-i18n-attr="aria-label:y" aria-label="Un &quot;neuf&quot;">keep</b></html>',
    )
  })

  it('refuse une clé du balisage sans traduction', () => {
    expect(() => translateMarked('<p data-i18n="missing">x</p>', {})).toThrow(/missing/)
  })

  it('refuse une traduction que le balisage ne lit plus', () => {
    expect(() => translateMarked('<p data-i18n="x">x</p>', { x: 'a', stale: 'b' })).toThrow(/stale/)
  })

  it('ne prend pas une propriété héritée pour une traduction', () => {
    expect(() => translateMarked('<p data-i18n="constructor">x</p>', {})).toThrow(/constructor/)
  })
})

describe('translateLanding', () => {
  it('refuse une page dont la bascule ou le canonical ont changé de forme', () => {
    expect(() => translateLanding(page.replace('data-lang-switch="fr"', 'data-lang="fr"'), HTML_FR)).toThrow(/nothing to rewrite/)
    expect(() => translateLanding(page.replace('<html lang="en">', '<html>'), HTML_FR)).toThrow(/nothing to rewrite/)
  })

  it('refuse un dictionnaire sans description structurée', () => {
    const { 'meta.jsonld': _, ...rest } = HTML_FR
    expect(() => translateLanding(page, rest)).toThrow(/meta\.jsonld/)
  })

  it('traduit la vraie landing, sans clé orpheline', () => {
    const fr = translateLanding(page, HTML_FR)
    expect(fr).toContain('<html lang="fr">')
    expect(fr).toContain(`<title data-i18n="meta.title">${HTML_FR['meta.title']}</title>`)
    expect(fr).not.toContain('Open the editor')
    expect(fr).not.toContain('Raw screenshot in')
  })

  it('pointe la page française sur /fr/ et la bascule sur l’anglais', () => {
    const fr = translateLanding(page, HTML_FR)
    expect(fr).toContain('<link rel="canonical" href="%SITE_URL%/fr/" />')
    expect(fr).toContain('<meta property="og:url" content="%SITE_URL%/fr/" />')
    expect(fr).toContain('"url": "%SITE_URL%/fr/"')
    expect(fr).toContain('<a href="/fr/" data-home')
    expect(fr).toMatch(/<a href="\/" lang="en" hreflang="en" data-lang-switch="en"[^>]*aria-label="Switch to English">EN<\/a>/)
    // Les liens `hreflang` du `<head>` sont les mêmes sur les deux pages.
    expect(fr).toContain('<link rel="alternate" hreflang="fr" href="%SITE_URL%/fr/" />')
    expect(fr).toContain('<link rel="alternate" hreflang="en" href="%SITE_URL%/" />')
  })

  it('traduit la description du JSON-LD, qui reste du JSON', () => {
    const fr = translateLanding(page, HTML_FR)
    const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(fr)?.[1] ?? ''
    expect((JSON.parse(json) as { description: string }).description).toBe(HTML_FR['meta.jsonld'])
  })
})
