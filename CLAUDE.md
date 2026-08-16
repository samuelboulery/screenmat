# shotframe

Outil web perso qui transforme un screenshot brut en visuel prêt à partager :
fenêtre arrondie façon macOS, fond génératif dérivé des couleurs dominantes du
screenshot, annotations, floutage, compositions multi-shot, export haute
résolution.

**Aucun backend, aucune base, aucun compte, aucune requête réseau après le
chargement.** Tout le traitement d'image se fait dans le navigateur via Canvas
2D ; les préférences vivent dans `localStorage`, les styles et l'historique dans
IndexedDB. Partager un style = exporter un fichier `.json`.

**Tech stack :** React 19 · TypeScript strict · Vite 8 · Tailwind CSS 4 (config
CSS-first) · Vitest. Deux dépendances runtime seulement : React et
`lucide-react`. `cli/` en ajoute trois, en `optionalDependencies` et jamais
importées par `src/` : `@napi-rs/canvas`, `@modelcontextprotocol/sdk`, `zod`.

## Trois skills portent le détail — les invoquer avant d'écrire

Ce fichier ne garde que ce qui casse le produit s'il est ignoré. Le reste est
chargé à la demande, et ne rien charger est une façon de se tromper :

- **`shotframe-da`** — direction artistique, recettes de sélection, icônes,
  typographie, écrans, raccourcis. *Toucher à un composant, une couleur, une
  icône ou un raccourci sans l'avoir lu, c'est faire diverger la DA.*
- **`shotframe-moteur`** — carte de `src/lib/`, invariants de `renderScene`,
  repères de coordonnées, arbre de calques, floutage, cache du fond.
  *À lire avant de toucher au canvas, à un calque ou à l'export.*
- **`shotframe-machine`** — CLI, serveur MCP, API Node, format de scène, shim.
  *À lire avant de toucher à `cli/`.*

Trois choses ne se déduisent pas d'un `ls src/lib` : `render.ts` porte l'unique
moteur de rendu, `tree.ts` est le seul chemin de manipulation de l'arbre de
calques, `spec.ts` valide une donnée externe.

## Key Commands

```bash
pnpm dev                # serveur de dev
pnpm build              # tsc -b && vite build
pnpm test               # Vitest (logique pure + rendu headless du CLI)
pnpm typecheck          # tsc -b (app + node + cli)
pnpm cli <image>        # rendu en ligne de commande
pnpm mcp                # serveur MCP sur stdio
```

`tsc --noEmit` ne vérifie **rien** ici : `tsconfig.json` est un fichier solution
(`"files": []` + références). Seul `tsc -b` traverse les projets référencés.

`pnpm` exclusivement — pas de `npm`, `yarn` ni `bun`.

## Code Conventions

- **Un seul chemin de rendu.** `renderScene(ctx, scene, scale)` est appelé par la
  preview, par l'export web, par le CLI et par le serveur MCP. Ne jamais
  introduire de rendu DOM/CSS parallèle : l'export doit correspondre à la preview
  par construction, pas par vigilance.
- **Toutes les dimensions sont relatives à une largeur** — celle du canvas pour
  la scène, celle de leur fenêtre pour les calques. Jamais de pixel absolu dans
  le rendu, sinon l'export 3× diverge de la preview.
- **Un seul jeu d'icônes**, Lucide, importé par le seul
  `src/components/icons.tsx`. Ajouter une icône, c'est l'ajouter là.
- `src/lib/` — logique pure et rendu canvas, sans import React.
  `src/components/` — un composant PascalCase par fichier. `src/hooks/` — hooks
  `use*`. `src/types.ts` — tous les types partagés. `cli/` — la porte machine.
  Tests dans `src/lib/__tests__/` et `cli/__tests__/`.
- TypeScript strict, pas de `any`. Immutabilité : aucune mutation d'état.
- Erreurs gérées explicitement — pas de `catch` silencieux.
- Commentaires en français, code et identifiants en anglais.
- Fonctions < 50 lignes, fichiers < 400 lignes.
- Les raccourcis assumés portent un commentaire `ponytail:` qui nomme leur
  plafond et le chemin de mise à niveau.

## Constraints

- Aucun appel réseau, aucune dépendance à un service distant. L'app doit
  fonctionner hors ligne, polices comprises.
- Ne pas installer de dépendance sans demander — en particulier pas de librairie
  de couleur, de canvas, de zip ou de composants UI : tout est écrit à la main
  ici. `lucide-react` est la seule exception, et elle ne fournit que des icônes.
- Ne pas ajouter d'export SVG (raster embarqué en base64 = plus lourd que le PNG
  sans gain vectoriel). C'est un choix, pas un oubli.
- **WebP est le format par défaut** — 7 à 10× plus léger que le PNG à grain égal,
  pour un résultat visuellement identique. Là où l'encodeur manque, le repli sur
  le PNG est explicite (`supportedDefaults` côté web, `supportsWebp` côté Node)
  et le format réellement produit est celui qui est annoncé.
- `canvasToBlob` vérifie le `blob.type` renvoyé : un navigateur sans encodeur
  WebP retombe silencieusement sur du PNG, et il ne faut pas livrer un fichier
  qui ment sur son extension. Ne pas retirer ce garde-fou.
- Un `.json` de style importé est une donnée externe : `parseStyle` valide champ
  par champ et retombe sur les valeurs par défaut. Ne pas court-circuiter.
- **Le floutage est cuit dans les pixels**, jamais en CSS : sinon la donnée
  masquée resterait lisible dans le fichier exporté.
