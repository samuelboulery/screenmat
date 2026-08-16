/** Le pont avec l'app web : un style se règle à l'œil dans l'interface,
 *  s'exporte en `.json`, et se dépose ici pour que la machine le rappelle par
 *  son nom. Aucun nouveau format — c'est celui de `exportStyle`/`parseStyle`. */
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { parseStyle } from '../src/lib/styles.ts'
import type { Style } from '../src/types.ts'

export const STYLES_DIR = process.env.SHOTFRAME_STYLES ?? join(homedir(), '.shotframe', 'styles')

/** Le nom sous lequel un style se rappelle : son fichier, sans extension. */
function styleName(file: string): string {
  return basename(file).replace(/\.shotframe\.json$/i, '').replace(/\.json$/i, '')
}

export async function listStyles(): Promise<{ name: string; style: Style }[]> {
  let files: string[]
  try {
    files = await readdir(STYLES_DIR)
  } catch {
    // Dossier absent : aucun style enregistré, ce n'est pas une erreur.
    return []
  }

  const found: { name: string; style: Style }[] = []
  for (const file of files.filter((f) => f.toLowerCase().endsWith('.json')).sort()) {
    try {
      found.push({ name: styleName(file), style: parseStyle(await readFile(join(STYLES_DIR, file), 'utf8')) })
    } catch {
      // Un fichier illisible ou étranger au format ne doit pas masquer les autres.
    }
  }
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
