import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'
import { HTML_FR } from './src/landing/html.fr.ts'
import { translateLanding } from './src/landing/translate.ts'

/**
 * La landing française, `/fr/` : le balisage d'`index.html`, texte remplacé.
 * `fr/index.html` n'est qu'une souche — une entrée pour Vite, qui résout les
 * assets et sert la page en dev comme n'importe quelle autre. Statique, comme
 * l'anglaise : le titre est le LCP, et c'est le texte qu'un moteur lit.
 *
 * À placer avant `docsPrerender`, qui substitue `%SITE_URL%` dans ce que ce
 * plugin rend.
 */
export function landingFr(): Plugin {
  let root = ''
  return {
    name: 'screenmat:landing-fr',
    configResolved(config) {
      root = config.root
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        if (path.resolve(ctx.filename) !== path.join(root, 'fr/index.html')) return html
        return translateLanding(await readFile(path.join(root, 'index.html'), 'utf8'), HTML_FR)
      },
    },
  }
}
