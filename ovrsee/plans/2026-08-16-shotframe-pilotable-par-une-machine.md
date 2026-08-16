---
{
  "status": "open",
  "title": "shotframe — pilotable par une machine",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — pilotable par une machine

## Context

shotframe embellit un screenshot, mais uniquement à la main, dans un navigateur.
Deux besoins, un même socle :

- **Une IA** dans un projet quelconque doit pouvoir dire « rends ces screenshots
  présentables, floute le token, mets une flèche sur le bouton » sans qu'un
  humain ouvre l'app et clique.
- **Un outil de dev** (script de build, générateur de docs, test) doit pouvoir
  appeler shotframe comme une fonction, avec des réglages et sans annotations.

Ce qui rend la chose faisable sans réécrire le moteur : `src/lib/` est déjà pur
— aucun import React, un seul moteur `renderScene(ctx, scene, scale)`, et la
seule API navigateur dont il dépend est Canvas 2D. Il manque un contexte 2D
côté Node, un format de scène sérialisable, et trois façades minces.

```
                    ┌──────────────────────────────┐
                    │  render(spec) → Buffer       │  ← LE cœur
                    │  cli/api.ts                  │
                    └──────────────────────────────┘
                       ▲          ▲            ▲
                  CLI  │   MCP    │   import   │  (outil de dev)
```

Tout le reste est enveloppe. Aucune des trois façades ne contient de logique.

Contraintes conservées : aucun appel réseau, un seul chemin de rendu, le bundle
web n'embarque rien de nouveau (la dépendance native vit en
`optionalDependencies` et n'est jamais importée par `src/`).

---

## 1. Cœur headless

### Approche : polyfill `document`, le moteur n'est pas touché

`src/lib/` appelle `document.createElement('canvas')` à 4 endroits du chemin de
rendu (`noise.ts:15`, `background.ts:133`, `layers.ts:69`, `palette.ts:139`) et
`new DOMMatrix()` une fois (`noise.ts:54`). Plutôt qu'un seam d'injection dans 5
fichiers, le CLI installe ces globales avant tout import.

Bénéfice : **le chemin de rendu n'est pas dupliqué ni porté, c'est le même
code.** La règle « un seul moteur » tient par construction.

`cli/dom-shim.ts` (~40 lignes) :

```ts
import { createCanvas, Image, DOMMatrix, GlobalFonts } from '@napi-rs/canvas'

// Un document minimal : createElement('canvas') et rien d'autre. Toute autre
// propriété jette — mieux vaut un crash lisible qu'une divergence silencieuse
// si src/lib/ se met un jour à toucher une autre API DOM.
globalThis.document = new Proxy({ createElement: (tag) => { … } }, {
  get(target, prop) {
    if (prop in target) return target[prop]
    throw new Error(`API DOM non disponible côté Node : document.${String(prop)}`)
  },
})
globalThis.DOMMatrix = DOMMatrix
GlobalFonts.loadSystemFonts()   // Menlo/SF Mono pour la stack MONO
```

**Dépendance** : `@napi-rs/canvas` (Skia précompilé, pas de node-gyp), déclarée
en `optionalDependencies` — `pnpm install` pour builder le site n'en a pas
besoin.

### Étape 1 — spike de 20 lignes, avant tout le reste

Trois incertitudes se lèvent empiriquement plus vite qu'en lisant la doc :

| À vérifier | Repli si ça casse |
|---|---|
| `ctx.createPattern().setTransform(DOMMatrix)` (grain, `noise.ts:51-54`) | dessiner la tuile en boucle plutôt qu'en pattern |
| `canvas.encode('webp')` | PNG seul côté Node, `format: 'webp'` refusé proprement |
| Une monospace résolue par la stack `MONO` (`layers.ts:10`, `frame.ts:31`) | embarquer un `.ttf` dans `cli/fonts/`, l'enregistrer nommément |

Le spike : shim + `renderScene()` sur une capture de
`~/Downloads/screenshot exemples/`, comparée au rendu web. Tant qu'il ne passe
pas, le reste du plan n'a pas de sol.

---

## 2. Le format de scène — le cœur du sujet

C'est **le** point qui permet à une machine d'atteindre tout le produit, pas
seulement les presets. Un document JSON décrit une scène entière : entrées,
réglages, composition, et les calques de chaque shot.

`src/lib/spec.ts` — nouveau fichier de **logique pure**, donc dans `lib/` et non
dans `cli/` : il est testé par Vitest avec le reste, et l'app web pourra
l'exporter et le réimporter plus tard (un « projet » partageable, là où
aujourd'hui seul le style l'est).

```jsonc
{
  "kind": "shotframe-scene",
  "version": 1,
  "style": "docs",                    // optionnel : ~/.shotframe/styles/docs.json
  "settings": { "frame": "macbook", "ratio": "16:9", "seed": 42 },
  "composition": { "layout": "single" },
  "shots": [
    {
      "input": "./capture.png",
      "layers": [
        { "kind": "redaction", "redaction": "blur",
          "rect": { "x": 0.10, "y": 0.22, "w": 0.30, "h": 0.03 } },
        { "kind": "arrow", "color": "#7DE2FF",
          "rect": { "x": 0.62, "y": 0.28, "w": -0.18, "h": 0.06 } },
        { "kind": "box", "fill": 0.15,
          "rect": { "x": 0.40, "y": 0.50, "w": 0.22, "h": 0.10 } },
        { "kind": "text", "text": "Ici", "labelStyle": "pill",
          "rect": { "x": 0.44, "y": 0.46, "w": 0, "h": 0 } }
      ]
    }
  ],
  "watermark": { "path": "./logo.png", "position": "bottom-right", "opacity": 0.6 }
}
```

Points de conception :

- **`layers` est optionnel.** Une scène sans calques, c'est exactement l'usage
  « outil de dev, sans annotations ». Un seul format couvre les deux besoins ;
  il n'y a pas d'API réduite à maintenir à côté.
- **Coordonnées en `FractionRect`, telles quelles** — fractions de la largeur de
  la **fenêtre**, origine à son coin haut-gauche, `y` divisé par la largeur lui
  aussi. C'est la représentation interne, sans conversion ni troisième système
  de coordonnées. Contrepartie assumée : c'est contre-intuitif, donc ça doit
  être écrit noir sur blanc là où la machine le lit (voir `inspect` et les
  descriptions MCP ci-dessous).
- **`w`/`h` peuvent être négatifs** — c'est ce qui fait pointer une flèche dans
  les quatre quadrants. Le parser ne les « corrige » pas.
- **Tous les champs d'annotation sont exposés** : `color`, `strokeWidth`,
  `radius`, `arrowHead`, `fill`, `opacity`, `size`, `labelStyle`, `invert`,
  `redaction`. Chacun est optionnel et retombe sur `ANNOTATION_DEFAULTS`.

### Validation

`parseScene(json)` suit **exactement** l'idiome de `parseStyle` (`lib/styles.ts`)
— champ par champ, `clamp` / `oneOf`, repli sur les défauts, jamais de confiance
en l'entrée. Un JSON venu d'un modèle est une donnée externe au même titre qu'un
`.json` importé à la main.

Les bornes existent déjà et sont réutilisées telles quelles : `ANNOTATION_LIMITS`
et `ANNOTATION_DEFAULTS` (`lib/annotate.ts`), les clamps de `parseSettings`.

**Une modification dans `src/`** : `parseSettings` est aujourd'hui privé dans
`lib/styles.ts` — l'exporter pour que `spec.ts` le réutilise. Rien d'autre ne
change dans `src/`, et surtout pas le chemin de rendu. Si le spike de l'étape 1
impose de toucher `src/lib/` ailleurs, c'est le signal qu'il faut s'arrêter et
rediscuter, pas contourner.

**Hors périmètre v1** : les groupes de calques (`LayerGroup`). Une machine n'a
aucune raison de grouper ; `tree.ts` le supportera le jour où un spec exporté
depuis l'app en contiendra.

---

## 3. L'API — ce que tout le reste appelle

`cli/api.ts` :

```ts
export async function render(spec: SceneSpec | SimpleSpec): Promise<RenderResult>
// RenderResult = { buffer: Buffer, width, height, format, settings }

export async function inspect(input: string | Buffer): Promise<InspectResult>
// { imageWidth, imageHeight, window: FractionRect, titleBar: number }
```

Forme courte, pour le cas « outil de dev, sans annotations » :

```ts
import { render } from './shotframe/cli/api.ts'

const { buffer } = await render({
  input: 'docs/capture.png',
  settings: { frame: 'macbook', ratio: '16:9' },
  scale: 2,
})
await writeFile('docs/capture-hero.png', buffer)
```

C'est la même fonction : la forme courte est du sucre qui construit une scène à
un shot sans calques. Une seule implémentation, un seul validateur.

Enchaînement interne — chaque étape appelle du code déjà écrit :

1. `loadImage()` (napi) pour chaque `input`
2. `extractPalette(image)` (`lib/palette.ts`) — inchangé
3. `parseScene()` (`lib/spec.ts`) → `Settings` + `LayerNode[]` validés
4. `Scene` assemblée → un cast unique et commenté à la frontière : l'`Image`
   napi n'est pas un `HTMLImageElement` au sens TS, mais l'est structurellement
   pour Canvas 2D
5. `computeGeometry()` pour dimensionner, puis `renderScene(ctx, scene, scale)`
6. `canvas.encode(format)` → `Buffer`

`lib/export.ts` n'est **pas** utilisé (Blob, `<a download>`, presse-papier =
navigateur) : l'API encode directement. Pas de second chemin de rendu pour
autant — `renderScene()` reste seul à dessiner un pixel.

**`inspect()`** est le petit outil qui rend les annotations réellement plaçables :
il renvoie où le screenshot atterrit dans la fenêtre, barre de titre comprise.
Sans lui, un modèle qui a lu l'image en pixels place ses flèches décalées de la
hauteur de la barre de titre — silencieusement, et à chaque fois.

**Exécution** : Node 24 (`v24.19.0` ici) déshabille TypeScript nativement, et
`src/lib/` importe déjà avec l'extension `.ts` explicite. **Aucune étape de
build** : `node cli/main.ts` suffit, et un import direct du `.ts` fonctionne.

---

## 4. CLI

```
shotframe <input…> [options]        rendu direct
shotframe --spec scene.json         scène complète, annotations comprises
shotframe inspect <input>           dimensions + fenêtre en fractions
shotframe styles                    styles disponibles

  -o, --out <path> · --out-dir <dir> · --style <nom|path> · --scale 1|2|3
  --format png|webp · --frame · --background · --ratio · --padding · --radius
  --seed · --url · --shadow · --grain · --json
```

Deux points qui comptent pour un appelant non humain :

- **`shotframe capture.png` sans autre argument doit déjà donner un bon
  résultat.** C'est le cas d'usage principal : l'IA n'a ni goût ni contexte
  visuel. Les défauts + le fond dérivé de la palette du screenshot suffisent.
- **`--json`** émet `{ output, width, height, bytes, settings }` sur stdout : un
  objet à lire, pas une phrase à parser. Erreurs sur stderr, code non nul.

Parsing des arguments : `parseArgs` de `node:util`, dans la stdlib.

**Le pont avec l'app web** : `~/.shotframe/styles/*.json` est exactement le
format que l'app exporte déjà (`exportStyle` / `parseStyle`). On règle un style
à l'œil dans l'interface, on l'exporte dans ce dossier, la machine le rappelle
par son nom (`--style docs`). Aucun nouveau format, aucun réglage dupliqué.

---

## 5. Serveur MCP

`cli/mcp.ts`, stdio, dépendance `@modelcontextprotocol/sdk`. Zéro logique : il
appelle `render()` et `inspect()`.

| Outil | Entrée | Sortie |
|---|---|---|
| `shotframe_render` | une scène en ligne (même forme que le `.json`), + `output` | `{ output, width, height }` |
| `shotframe_inspect` | `input` | dimensions + fenêtre en fractions |
| `shotframe_list_styles` | — | noms + résumé des réglages |

Décisions à tenir :

- **La description des outils EST la documentation du modèle.** Il ne lira pas
  le README. Le système de coordonnées (fractions de la largeur de la fenêtre,
  origine en haut à gauche, `y` divisé par la largeur, `w`/`h` signés) s'écrit
  dans la description du schéma, avec un exemple de flèche. C'est là que se joue
  la qualité des annotations produites, pas dans le moteur.
- **On renvoie un chemin, pas l'image.** Une PNG en base64 coûte des milliers de
  tokens par appel, pour une image que le modèle n'a pas besoin de revoir.
- **Schémas Zod stricts**, adossés aux mêmes bornes que `parseScene` — un chemin
  et des nombres arrivent d'un modèle, donc du dehors.
- Installation : `claude mcp add shotframe -- node <repo>/cli/mcp.ts`, documentée
  dans le README. Pas d'installeur.

**Hors périmètre** : pas de batch MCP (le modèle appelle N fois), pas d'écriture
de style depuis l'IA (un style se règle à l'œil, dans l'app).

---

## Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/lib/spec.ts` | **nouveau** — `SceneSpec`, `parseScene()`, logique pure |
| `src/lib/__tests__/spec.test.ts` | **nouveau** — validation, bornes, entrées hostiles |
| `src/lib/styles.ts` | exporter `parseSettings` (seule modification de `src/`) |
| `cli/dom-shim.ts` | nouveau — globales Canvas |
| `cli/api.ts` | nouveau — `render()`, `inspect()` |
| `cli/main.ts` | nouveau — CLI |
| `cli/styles-dir.ts` | nouveau — `~/.shotframe/styles/` |
| `cli/mcp.ts` | nouveau — serveur MCP |
| `cli/__tests__/render.test.ts` | nouveau — rendu headless |
| `package.json` | `bin`, `exports`, `optionalDependencies`, script `cli` |
| `CLAUDE.md` · `.claude/rules/` | section « Pilotage par une machine », `cli/` dans l'arbre |
| README | installation MCP, format de scène |

Le chemin de rendu (`render.ts`, `frame.ts`, `layers.ts`, `background.ts`,
`watermark.ts`) n'est **pas** modifié.

---

## Vérification

1. **Le spike passe** — `renderScene()` produit un PNG non vide dans Node.
2. **Fidélité web/CLI** : même capture, même `seed`, mêmes réglages, exportée
   depuis l'app en 2× et depuis le CLI en 2× → les deux fichiers se superposent.
   À l'œil sur les 7 captures de `~/Downloads/screenshot exemples/`. C'est le
   test qui compte : si le CLI diverge, la promesse « un seul moteur » est morte.
3. **`spec.test.ts`** (Vitest, logique pure) : un JSON vide donne les défauts ;
   des valeurs hors bornes sont ramenées dans `ANNOTATION_LIMITS` ; un `w`
   négatif **survit** ; un `kind` inconnu est écarté sans faire tomber la scène ;
   un JSON invalide jette un message lisible.
4. **`render.test.ts`** : une PNG 2×2 générée en mémoire → `width === BASE_WIDTH
   * scale`, hauteur conforme au ratio, et deux rendus au même seed **octet pour
   octet identiques** (le déterminisme du fond casse le plus silencieusement).
5. **Placement d'une annotation** : rendre une scène avec un `box` couvrant
   `inspect().window` et vérifier à l'œil qu'il épouse le screenshot, barre de
   titre exclue. C'est le test qui valide qu'`inspect` dit la vérité.
6. **Contrat CLI** : `shotframe fixture.png --json` → JSON parsable, code 0 ;
   entrée absente → stderr + code 1 ; `--format webp` sans encodeur → erreur
   claire, jamais un `.webp` contenant du PNG (même garde-fou que `canvasToBlob`).
7. **Bout en bout MCP** : `claude mcp add`, puis dans un projet tiers « floute la
   clé d'API sur ce screenshot et mets une flèche sur le bouton Deploy » → un
   fichier correct sort, sans que l'app web soit ouverte.
8. `pnpm test` et `pnpm exec tsc -b` verts (`cli/` a son `tsconfig.cli.json`
   référencé par la solution).

---

## Ordre d'exécution

1. Spike headless — bloquant, tout le reste en dépend
2. `src/lib/spec.ts` + ses tests (pure logique, indépendant du spike)
3. `cli/api.ts` (`render` + `inspect`) + `render.test.ts`
4. `cli/main.ts`, puis vérification de fidélité sur les captures de référence
5. `cli/mcp.ts`, avec le soin porté aux descriptions de schéma
6. Documentation : CLAUDE.md, règles, README
