# shotframe

Outil web perso qui transforme un screenshot brut en visuel prêt à partager :
fenêtre arrondie façon macOS, fond génératif dérivé des couleurs dominantes du
screenshot, annotations, floutage, compositions multi-shot, export haute
résolution.

**Aucun backend, aucune base, aucun compte, aucune requête réseau après le
chargement.** Tout le traitement d'image se fait dans le navigateur via Canvas
2D ; les préférences vivent dans `localStorage`, les styles et l'historique dans
IndexedDB. Partager un style = exporter un fichier `.json`.

## Direction artistique — « Afterglow »

Scène noire (`#07070A`), panneaux translucides flottants, un seul accent
cyan→violet (`#7DE2FF` → `#A378FF`) réservé à **deux** usages : l'action
primaire et la sélection courante. `#FF9A9A` est réservé au floutage et au
destructif. Aucune ombre portée dans le chrome — la seule ombre du produit
appartient à l'artwork.

Deux familles : **Space Grotesk** (ce qu'un humain lit) et **JetBrains Mono**
(ce qu'une machine a produit : labels de section, dimensions, seeds, noms de
fichiers). Les deux sont embarquées en woff2 dans `public/fonts/` — l'app doit
rester utilisable hors ligne. Tokens et échelle typographique : `src/index.css`.

## Architecture

```
src/
  App.tsx                 ← routage des vues + état settings/composition
  index.css               ← tokens @theme, polices locales, échelle typo
  types.ts                ← Settings, Shot, Annotation, Style, Composition…
  lib/
    palette.ts            ← couleurs dominantes (porté de img-creator)
    noise.ts              ← tuile de grain, générée une fois
    background.ts         ← presets de fond : mesh · gradient · solid · image
    frame.ts              ← cadres browser/macbook/iphone/none + rotation Y
    annotate.ts           ← géométrie et rendu des calques, floutage cuit
    watermark.ts          ← logo utilisateur, dessiné en dernier
    render.ts             ← renderScene(ctx, scene, scale) — MOTEUR UNIQUE
    export.ts             ← blob, téléchargement, presse-papier, lots
    zip.ts                ← archive « stored », sans dépendance
    store.ts              ← IndexedDB : styles + historique
    styles.ts             ← création, export/import validé, préférences
    image.ts              ← fichier/blob/presse-papier → HTMLImageElement
  hooks/
    useImageInput.ts      ← click + drag&drop + paste (⌘V) sur les shots
    useSideFile.ts        ← fond, watermark, import de style
    useShots.ts           ← shots, sélection, calques
    useLibrary.ts         ← styles et historique persistés
    useExport.ts          ← export, copie, écriture dans l'historique
    useBatch.ts           ← file d'attente et zip
    useShortcuts.ts       ← raccourcis globaux + point de rupture 1100 px
  components/             ← TopBar · ToolRail · Inspector · Filmstrip · écrans
```

**Tech stack :** React 19 · TypeScript strict · Vite 8 · Tailwind CSS 4 (config
CSS-first) · Vitest. Zéro dépendance runtime hors React.

## Écrans

Une barre haute unique de 58 px : modes d'édition à gauche (**Compose /
Annotate / Batch**), vues de gestion à droite (**Editor / Styles / History**).

| Écran | Rôle |
|---|---|
| Import | premier écran, dropzone + exports récents |
| Compose | éditeur principal : rail d'outils, inspecteur flottant, filmstrip |
| Annotate | callouts et floutage, cuits dans les pixels à l'export |
| Layouts | compositions multi-shot (single/stack/side/tilt3d), filmstrip docké |
| Styles | nommer et réutiliser un réglage complet, partage par `.json` |
| Batch | appliquer un style à N shots, sortir un zip |
| History | retrouver un export passé et le réouvrir avec ses réglages |

Sous 1100 px : le rail passe en barre horizontale, l'inspecteur devient une
feuille rétractable. Pas de version mobile — l'outil vit à côté d'un screenshot
pris sur desktop.

## Key Commands

```bash
pnpm dev                # serveur de dev
pnpm build              # tsc -b && vite build
pnpm test               # Vitest (logique pure : palette, géométrie, zip, styles)
pnpm exec tsc --noEmit  # vérification TypeScript
```

`pnpm` exclusivement — pas de `npm`, `yarn` ni `bun`.

## Code Conventions

- **Un seul chemin de rendu.** `renderScene(ctx, scene, scale)` est appelé par
  la preview (`scale = devicePixelRatio`) et par l'export (`scale = 1|2|3`). Ne
  jamais introduire de rendu DOM/CSS parallèle : l'export doit correspondre à la
  preview par construction, pas par vigilance. Seules les poignées de sélection
  sont en DOM — elles ne sont pas dans le visuel exporté.
- **Toutes les dimensions sont relatives à la largeur du canvas**, jamais en px
  absolus, sinon l'export 3× ne ressemble plus à la preview. Les rectangles
  d'annotation aussi : `y` est divisé par la largeur, pas par la hauteur.
- **Le fond est déterministe** : PRNG `mulberry32` seedé par `settings.seed`.
- Le flou du fond se fait par downscale/upscale d'un canvas offscreen, pas par
  `ctx.filter = 'blur()'` (support inégal, et c'est plus lent).
- **Le floutage est cuit dans les pixels sous le clip de la fenêtre**, jamais en
  CSS : sinon la donnée masquée resterait lisible dans le fichier exporté.
- La rotation Y est une approximation affine (compression horizontale +
  cisaillement vertical), pas un vrai mapping projectif : une matrice reste
  homothétique à l'export, un découpage en bandes ne le garantirait pas.
- TypeScript strict, pas de `any`. Immutabilité : aucune mutation d'état.
- Les raccourcis assumés portent un commentaire `ponytail:` qui nomme leur plafond.

## Constraints

- Aucun appel réseau, aucune dépendance à un service distant. L'app doit
  fonctionner hors ligne, polices comprises.
- Ne pas installer de dépendance sans demander — en particulier pas de librairie
  de couleur, de canvas, de zip ou d'UI : tout est écrit à la main ici.
- Ne pas ajouter d'export SVG (raster embarqué en base64 = plus lourd que le PNG
  sans gain vectoriel). C'est un choix, pas un oubli.
- `canvasToBlob` vérifie le `blob.type` renvoyé : un navigateur sans encodeur
  WebP retombe silencieusement sur du PNG, et il ne faut pas livrer un fichier
  qui ment sur son extension. Ne pas retirer ce garde-fou.
- Un `.json` de style importé est une donnée externe : `parseStyle` valide champ
  par champ et retombe sur les valeurs par défaut. Ne pas court-circuiter.

## Raccourcis

`⌘V` coller · `⌘E` exporter · `⌘C` copier · `R` régénérer le fond ·
`1/2/3` échelle d'export · `Delete` supprimer le calque sélectionné.

## Références visuelles

`~/Downloads/screenshot exemples/` — 7 captures qui sont le rendu cible.
`~/Downloads/design_handoff_shotframe_afterglow/` — le handoff de la refonte
(README + canvas de design). La spec mesurée de l'artwork vit dans `lib/frame.ts`
sous forme de constantes relatives.

## Reste à faire

- Rendu du lot dans un Worker + `OffscreenCanvas` (aujourd'hui séquentiel dans
  le thread principal, avec rendu de la main entre chaque item).
- Zip64 si un lot devait dépasser 4 Gio ou 65 535 fichiers.
- Redimensionnement d'un calque par ses poignées (le déplacement fonctionne).
