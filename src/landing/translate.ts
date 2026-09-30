/* La landing française est la landing anglaise, texte remplacé : un seul
   balisage, `index.html`. Pur et sans DOM — appelé au build par
   `vite-landing-fr.ts`, et par son test.

   ponytail: lecture par expressions régulières, pas par un parseur. Elle tient
   tant qu'un élément marqué ne contient pas un élément du même nom ; au-delà,
   passer à un vrai parseur HTML. */

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const escapeAttr = (text: string) => escapeText(text).replace(/"/g, '&quot;')

/** `<p … data-i18n="clé" …>contenu</p>` : le contenu, jusqu'à la fermeture du même élément. */
const TEXT = /(<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)[\s\S]*?(<\/\2>)/g
/** `<meta … data-i18n-attr="content:clé" content="…">` : l'attribut nommé, dans la même balise. */
const ATTR = /<[a-z0-9]+\b[^>]*\bdata-i18n-attr="([a-z-]+):([^"]+)"[^>]*>/g

/** La bascule de langue, telle qu'`index.html` l'écrit, et ce qu'elle devient sur `/fr/`. */
const SWITCH: readonly (readonly [string, string])[] = [
  ['href="/fr/" lang="fr" hreflang="fr" data-lang-switch="fr"', 'href="/" lang="en" hreflang="en" data-lang-switch="en"'],
  ['aria-label="Passer en français">FR</a>', 'aria-label="Switch to English">EN</a>'],
  // La page se cite elle-même : canonical, carte sociale, données structurées, logo.
  ['<link rel="canonical" href="%SITE_URL%/" />', '<link rel="canonical" href="%SITE_URL%/fr/" />'],
  ['<meta property="og:url" content="%SITE_URL%/" />', '<meta property="og:url" content="%SITE_URL%/fr/" />'],
  ['"url": "%SITE_URL%/"', '"url": "%SITE_URL%/fr/"'],
  ['<a href="/" data-home', '<a href="/fr/" data-home'],
  ['<html lang="en">', '<html lang="fr">'],
]

/** Clé du dictionnaire pour la description des données structurées, qui n'est
 *  pas dans un élément marquable. */
const JSONLD = 'meta.jsonld'

/**
 * Les textes et attributs marqués de `html`, remplacés par ceux de `dict`.
 * Échoue net si le balisage cite une clé que le dictionnaire n'a pas, ou
 * l'inverse : une page à moitié traduite ne se publie pas.
 */
export function translateMarked(html: string, dict: Readonly<Record<string, string>>): string {
  const used = new Set<string>()
  const lookup = (key: string): string => {
    if (!Object.hasOwn(dict, key)) throw new Error(`Landing: no translation for "${key}"`)
    used.add(key)
    return dict[key]!
  }

  const out = html
    .replace(TEXT, (_, open: string, _tag: string, key: string, close: string) => open + escapeText(lookup(key)) + close)
    .replace(ATTR, (tag: string, name: string, key: string) => {
      const attr = new RegExp(`(\\s${name}=")[^"]*(")`)
      if (!attr.test(tag)) throw new Error(`Landing: "${key}" names an attribute the tag does not have (${name})`)
      return tag.replace(attr, (_, before: string, after: string) => before + escapeAttr(lookup(key)) + after)
    })

  const stale = Object.keys(dict).filter((key) => !used.has(key))
  if (stale.length > 0) throw new Error(`Landing: translations nothing reads — ${stale.join(', ')}`)
  return out
}

/** Un remplacement qui ne trouve pas sa cible est une page fausse, pas un détail. */
function swap(html: string, from: string | RegExp, to: string | ((...groups: string[]) => string)): string {
  const out = typeof to === 'string' ? html.replace(from, () => to) : html.replace(from, to)
  if (out === html) throw new Error(`Landing: nothing to rewrite for ${String(from)}`)
  return out
}

/**
 * `index.html` devenu la page `/fr/` : textes traduits, puis ce par quoi la
 * page se cite elle-même (langue, canonical, bascule, données structurées).
 */
export function translateLanding(html: string, dict: Readonly<Record<string, string>>): string {
  const { [JSONLD]: description, ...marked } = dict
  if (description === undefined) throw new Error(`Landing: no translation for "${JSONLD}"`)

  const described = swap(translateMarked(html, marked), /("description": )"[^"]*"/, (_, before) => before + JSON.stringify(description))
  return SWITCH.reduce((page, [from, to]) => swap(page, from, to), described)
}
