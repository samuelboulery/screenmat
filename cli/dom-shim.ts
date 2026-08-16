/**
 * Fournit à `src/lib/` les quelques globales du navigateur dont le moteur de
 * rendu dépend. À importer AVANT tout autre import de `src/lib/`.
 *
 * Le choix est délibéré : plutôt qu'injecter une fabrique de canvas dans les
 * cinq fichiers qui en créent un, on installe les globales une fois ici. Le
 * chemin de rendu n'est ni porté ni dupliqué — c'est exactement le même code
 * qui tourne en preview, à l'export web et ici. La règle « un seul moteur »
 * tient par construction, pas par vigilance.
 */
import { createCanvas, DOMMatrix, Image, ImageData, Path2D } from '@napi-rs/canvas'

/** Le seul élément que `src/lib/` demande à `document`. Un `<canvas>` de napi
 *  expose `width`, `height` et `getContext('2d')` — tout ce que le moteur
 *  touche. */
function createElement(tag: string): unknown {
  if (tag !== 'canvas') {
    throw new Error(`Élément non disponible côté Node : <${tag}>`)
  }
  // Taille provisoire : chaque appelant écrit width/height juste après.
  return createCanvas(1, 1)
}

/** Un `document` qui jette sur tout ce qu'il ne connaît pas. Si `src/lib/` se
 *  met un jour à toucher `document.fonts` ou `document.body`, on veut un crash
 *  qui nomme la propriété, pas un `undefined` qui produit une image fausse. */
const documentShim = new Proxy(
  { createElement },
  {
    get(target, property) {
      if (property in target) return Reflect.get(target, property)
      throw new Error(`API DOM non disponible côté Node : document.${String(property)}`)
    },
  },
)

type Globals = Record<string, unknown>
const g = globalThis as unknown as Globals

g.document ??= documentShim
g.DOMMatrix ??= DOMMatrix
g.Path2D ??= Path2D
g.Image ??= Image
g.ImageData ??= ImageData

/* Les polices système sont chargées d'office par Skia : la pile `MONO` de
 * `lib/layers.ts` et `lib/frame.ts` résout Menlo ou SF Mono sans rien déclarer.
 *
 * ponytail: on fait confiance à la machine hôte. Un conteneur nu, sans aucune
 * monospace installée, dessinerait l'URL et les labels dans la police par
 * défaut sans le dire. Embarquer un `.ttf` dans `cli/fonts/` et l'enregistrer
 * par `GlobalFonts.register` le jour où le CLI tourne en CI. */

/** Vrai si le build de Skia embarqué sait encoder en WebP. Vérifié une fois :
 *  un `.webp` qui contient du PNG est un fichier qui ment sur son extension —
 *  même garde-fou que `canvasToBlob` côté navigateur. */
export const supportsWebp: boolean = (() => {
  try {
    const probe = createCanvas(2, 2)
    const encoded = probe.encodeSync('webp')
    // En-tête RIFF....WEBP
    return encoded.length > 12 && encoded.toString('ascii', 8, 12) === 'WEBP'
  } catch {
    return false
  }
})()
