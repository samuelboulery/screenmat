/**
 * Le numéro de version du paquet, cuit dans les pages au build par le plugin de
 * `vite.config.ts`, comme `%SITE_URL%` : aucun appel réseau pour le lire.
 * Une valeur, pas un libellé — `/fr/` l'affiche tel quel.
 */
export function withVersion(html: string, version: string): string {
  return html.replaceAll('%VERSION%', version)
}
