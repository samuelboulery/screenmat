/**
 * L'ordre de lecture de la documentation. Le même que celui de
 * `public/docs/llms.txt`, et la seule liste qui existe : le prérendu du build
 * comme le lecteur client la lisent ici.
 */
export const PAGES = ['overview', 'cli', 'mcp', 'api', 'scene', 'coordinates', 'styles', 'recipes'] as const

export type PageSlug = (typeof PAGES)[number]
