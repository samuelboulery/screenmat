# shotframe, côté machine

La même chose que l'app web, appelée par autre chose qu'un humain : un script de
build, un générateur de docs, une IA dans un projet quelconque.

`render(spec)` est le cœur. Le CLI, le serveur MCP et l'import direct n'en sont
que des enveloppes — aucune ne contient de logique, et aucune ne redessine quoi
que ce soit : c'est `renderScene()`, le moteur de l'app, qui tourne dans Node
grâce aux globales Canvas installées par `dom-shim.ts`.

Node ≥ 24 : le TypeScript s'exécute tel quel, il n'y a pas d'étape de build.

## En ligne de commande

```bash
node cli/main.ts capture.png                      # défauts, déjà bons
node cli/main.ts capture.png --frame macbook --ratio 16:9 --scale 3
node cli/main.ts *.png --out-dir ./visuels --json
node cli/main.ts --spec scene.json                # annotations comprises
node cli/main.ts inspect capture.png --json       # repère des calques
node cli/main.ts styles                           # styles enregistrés
```

`--json` sort `{ output, width, height, bytes, format, settings }` sur stdout.
Les erreurs vont sur stderr, avec un code de sortie non nul.

## Depuis un script

```ts
import { render } from './cli/api.ts'
import { writeFile } from 'node:fs/promises'

const { buffer } = await render({
  input: 'docs/capture.png',       // un chemin, ou des octets déjà en mémoire
  settings: { frame: 'macbook', ratio: '16:9' },
  scale: 2,
})
await writeFile('docs/capture-hero.png', buffer)
```

`inspect(input)` renvoie les dimensions de l'image et `screen`, le rectangle
qu'elle occupe dans sa fenêtre — à lire avant de placer une annotation.

## Depuis une IA (MCP)

```bash
claude mcp add shotframe -- node /chemin/vers/shotframe/cli/mcp.ts
```

Trois outils : `shotframe_render`, `shotframe_inspect`, `shotframe_list_styles`.
Ils renvoient un chemin de fichier, jamais l'image encodée — une PNG en base64
coûterait des milliers de tokens par appel.

## Le format de scène

Un document JSON qui décrit tout : entrées, réglages, composition, calques.
`layers` est optionnel — une scène sans calques, c'est l'usage « embellir, sans
annoter ».

```jsonc
{
  "style": "docs",                       // optionnel, voir plus bas
  "settings": { "frame": "macbook", "ratio": "16:9", "seed": 42 },
  "composition": { "layout": "single" },
  "scale": 2,
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

`kind` : `text` · `badge` · `arrow` · `line` · `box` · `ellipse` · `redaction`.
Chaque calque accepte en plus `color`, `strokeWidth`, `radius`, `arrowHead`,
`fill`, `opacity`, `size`, `labelStyle`, `invert`, `hidden`.

Un document produit par une machine est une donnée externe : `parseScene`
(`src/lib/spec.ts`) valide champ par champ et retombe sur les défauts. Un `kind`
inconnu est écarté sans faire tomber la scène.

### Le repère des calques

Un `rect` est en fractions de la **largeur de la fenêtre** — le cadre dessiné
autour du screenshot — origine à son coin haut-gauche. `y` est divisé par la
largeur lui aussi, jamais par la hauteur : un screenshot 16:9 occupe donc `y` de
0 à 0,5625.

`w` et `h` sont signés : une flèche va de `(x, y)` vers `(x+w, y+h)`, ce qui lui
permet de pointer dans les quatre directions.

Pour convertir un point lu en pixels sur l'image d'origine, passer par
`inspect()` :

```
x = px / imageWidth
y = screen.y + py / imageWidth        // screen.y = hauteur de la barre de titre
```

C'est ce décalage-là que `inspect()` existe pour éviter — sans lui, toutes les
annotations tombent trop haut de la hauteur de la barre de titre.

## Les styles

Un style se règle à l'œil dans l'app web, s'exporte en `.json` et se dépose dans
`~/.shotframe/styles/` (ou `$SHOTFRAME_STYLES`). Il se rappelle ensuite par son
nom de fichier :

```bash
node cli/main.ts capture.png --style docs
```

C'est exactement le format de `exportStyle`/`parseStyle` : aucun réglage n'est
dupliqué entre l'app et le CLI. Les `settings` explicites recouvrent ceux du
style.
