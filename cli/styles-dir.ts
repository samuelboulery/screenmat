/** Le pont avec l'app web : un style se règle à l'œil dans l'interface,
 *  s'exporte en `.json`, et se dépose ici pour que la machine le rappelle par
 *  son nom. Aucun nouveau format — c'est celui de `exportStyle`/`parseStyle`. */
import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { parseStyle } from '../src/lib/styles.ts'
import type { Style } from '../src/types.ts'

export const STYLES_DIR = process.env.SHOTFRAME_STYLES ?? join(homedir(), '.shotframe', 'styles')

export type NamedStyle = { name: string; style: Style }

/** Le nom sous lequel un style se rappelle : son fichier, sans extension. */
function styleName(file: string): string {
  return basename(file).replace(/\.shotframe\.json$/i, '').replace(/\.json$/i, '')
}

/**
 * Un style par fichier, daté de sa dernière modification. Un lot de vingt shots
 * au même style relisait et revalidait vingt fois les mêmes `.json`.
 *
 * La date se relit à chaque appel — le serveur MCP vit longtemps, et un style
 * déposé ou corrigé pendant qu'il tourne doit se voir au prochain appel. Ce qui
 * s'économise, c'est la lecture et la validation, pas le `stat`.
 */
const cache = new Map<string, { mtimeMs: number; style: Style }>()

export async function listStyles(): Promise<NamedStyle[]> {
  let files: string[]
  try {
    files = await readdir(STYLES_DIR)
  } catch {
    // Dossier absent : aucun style enregistré, ce n'est pas une erreur.
    cache.clear()
    return []
  }

  const found: NamedStyle[] = []
  const seen = new Set<string>()

  for (const file of files.filter((f) => f.toLowerCase().endsWith('.json')).sort()) {
    const path = join(STYLES_DIR, file)
    try {
      const { mtimeMs } = await stat(path)
      seen.add(path)

      const known = cache.get(path)
      const style = known?.mtimeMs === mtimeMs ? known.style : parseStyle(await readFile(path, 'utf8'))
      cache.set(path, { mtimeMs, style })
      found.push({ name: styleName(file), style })
    } catch {
      // Un fichier illisible ou étranger au format ne doit pas masquer les autres.
      cache.delete(path)
    }
  }

  for (const path of cache.keys()) if (!seen.has(path)) cache.delete(path)
  return found
}

/**
 * Résout un style par nom (dans `STYLES_DIR`) ou par chemin. Jette avec la
 * liste des noms disponibles : une machine qui s'est trompée de nom doit
 * pouvoir se corriger sans deviner.
 */
export async function resolveStyle(nameOrPath: string): Promise<Style> {
  if (nameOrPath.includes('/') || nameOrPath.endsWith('.json')) {
    return parseStyle(await readFile(nameOrPath, 'utf8'))
  }

  const styles = await listStyles()
  const match = styles.find((entry) => entry.name === nameOrPath)
  if (match) return match.style

  const available = styles.map((entry) => entry.name).join(', ') || 'aucun'
  throw new Error(`Style « ${nameOrPath} » introuvable dans ${STYLES_DIR} — disponibles : ${available}`)
}
