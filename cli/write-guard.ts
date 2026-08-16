/**
 * La garde d'écriture du serveur MCP. Elle vit à part parce qu'elle porte une
 * décision, et que `mcp.ts` ne doit rester qu'une enveloppe.
 *
 * Le CLI et le serveur MCP ne sont pas la même frontière : `--out` écrit là où
 * l'utilisateur le dit — c'est le contrat de n'importe quel outil en ligne de
 * commande. Côté MCP, c'est un modèle distant qui choisit le chemin, et une
 * erreur de sa part écraserait un fichier que personne ne lui a désigné.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

/**
 * Le dossier sous lequel le serveur accepte d'écrire. Par défaut celui du
 * screenshot fourni : « shotframe écrit à côté de la capture qu'on lui a
 * donnée ». `SHOTFRAME_OUT` le déplace, comme `SHOTFRAME_STYLES` le fait pour
 * les styles.
 */
export function writeRoot(input: string): string {
  return resolve(process.env.SHOTFRAME_OUT ?? dirname(resolve(input)))
}

/**
 * Résout le chemin demandé sous `root`, ou jette. Un chemin absolu comme un
 * `../..` sortent tous deux de la racine, et `resolve` les ramène à une forme
 * normalisée avant la comparaison — c'est ce qui permet de la faire par
 * préfixe sans se faire contourner par un `..` au milieu.
 */
export function resolveUnder(root: string, wanted: string): string {
  const target = resolve(root, wanted)
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(
      `\`output\` doit rester sous ${root} — reçu ${target}. Passer un chemin relatif, ou élargir avec SHOTFRAME_OUT.`,
    )
  }
  return target
}

/** Nombre de suffixes tentés avant d'abandonner.
 *  ponytail: plafond fixe et boucle qui retente. Un compteur persisté irait
 *  plus vite au 100ᵉ rendu du même screenshot — cas qui n'arrive pas. */
export const MAX_SUFFIX = 100

/**
 * Écrit sans jamais écraser : `wx` échoue si le fichier existe, on suffixe
 * alors `-2`, `-3`… Renvoie le chemin réellement écrit — re-rendre deux fois le
 * même screenshot reste un geste normal, et le modèle apprend le vrai chemin
 * par la valeur de retour.
 */
export async function writeNew(path: string, data: Uint8Array): Promise<string> {
  const dot = path.lastIndexOf('.')
  const hasExtension = dot > path.lastIndexOf(sep)
  const stem = hasExtension ? path.slice(0, dot) : path
  const extension = hasExtension ? path.slice(dot) : ''

  for (let n = 1; n <= MAX_SUFFIX; n++) {
    const candidate = n === 1 ? path : `${stem}-${n}${extension}`
    try {
      await writeFile(candidate, data, { flag: 'wx' })
      return candidate
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== 'EEXIST') throw cause
    }
  }

  throw new Error(`${MAX_SUFFIX} fichiers existent déjà sous ${path} — en supprimer, ou passer un autre \`output\`.`)
}
