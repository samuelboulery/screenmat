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

Un seul jeu d'icônes, **Lucide**, importé par le seul `src/components/icons.tsx`
— aucun autre fichier n'importe `lucide-react`. Taille (16 px, 20 px dans le
rail) et épaisseur du trait (1.5) sont posées une fois en CSS sur la classe
`.lucide` : le 2 px par défaut écraserait une DA dont les filets font 1 px.
Icône seule là où l'espace est compté et où le geste est évident (rail, œil et
cadenas d'un calque, undo/redo) ; icône **et** mot sur la navigation et les
actions de fin de course. Un raccourci clavier (`⌘V`, `⌫`) s'écrit, il ne se
dessine pas. Cinq rayons, pas seize : `--radius-xs|sm|md|lg|xl`.

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
    annotate.ts           ← modèle et géométrie des calques, hit-test, bornes
    tree.ts               ← arbre de calques : groupes, aplatissement, déplacement
    draft.ts              ← tracé en cours : rect aimanté, scène augmentée
    layers.ts             ← rendu des calques, floutage cuit
    handles.ts            ← poignées : redimensionnement, aimantation, nudge
    history.ts            ← réducteur d'annulation, pur et sans React
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
    useShots.ts           ← shots, sélection, arbre de calques
    useLayerActions.ts    ← actions clavier sur la sélection de calques
    useCanvasScene.ts     ← dimensionnement et boucle de rendu du canvas
    useHistory.ts         ← pile d'annulation du document
    useStyleActions.ts    ← appliquer, enregistrer un style, filigrane décodé
    useLibrary.ts         ← styles et historique persistés
    useExport.ts          ← export, copie, écriture dans l'historique
    useBatch.ts           ← file d'attente et zip
    useShortcuts.ts       ← raccourcis globaux + point de rupture 1100 px
  components/             ← TopBar · ToolRail · Inspector · LayersPanel ·
                            TextInput · Filmstrip · écrans
```

**Tech stack :** React 19 · TypeScript strict · Vite 8 · Tailwind CSS 4 (config
CSS-first) · Vitest. Deux dépendances runtime seulement : React et
`lucide-react` (icônes, tree-shakées, bundlées — rien n'est chargé en ligne).

## Écrans

Une barre haute unique de 58 px : modes d'édition à gauche (**Compose /
Annotate / Batch**), vues de gestion à droite (**Editor / Styles / History**).

| Écran | Rôle |
|---|---|
| Import | premier écran, dropzone + exports récents |
| Compose | éditeur principal : rail d'outils, inspecteur flottant, filmstrip |
| Annotate | calques et floutage, un jeu par shot, sur la composition en cours |
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
pnpm exec tsc -b        # vérification TypeScript
```

`tsc --noEmit` ne vérifie **rien** ici : `tsconfig.json` est un fichier solution
(`"files": []` + références). Seul `tsc -b` traverse les projets référencés.

`pnpm` exclusivement — pas de `npm`, `yarn` ni `bun`.

## Code Conventions

- **Un seul chemin de rendu.** `renderScene(ctx, scene, scale)` est appelé par
  la preview (`scale = devicePixelRatio`) et par l'export (`scale = 1|2|3`). Ne
  jamais introduire de rendu DOM/CSS parallèle : l'export doit correspondre à la
  preview par construction, pas par vigilance. **Le tracé en cours et le caret de
  saisie en font partie** : le premier est une annotation brouillon glissée dans
  la scène (`withDraft`), le second un champ `scene.editing` que le moteur
  dessine. Seul le chrome d'édition — cadres de sélection, poignées, rectangle de
  sélection, ligne de dépôt du panneau — est en DOM, et n'apparaît nulle part
  dans le fichier exporté.
- **Les calques forment un arbre** (`Shot.layers: LayerNode[]`) : une annotation
  ou un groupe imbricable. Le rendu et le hit-test ne connaissent que la liste
  plate qu'en tire `flatten()` (`lib/tree.ts`) ; un calque masqué en est écarté,
  et n'existe donc pas non plus à l'export. Toute manipulation d'arbre passe par
  `lib/tree.ts`, jamais par un `map`/`filter` local.
- **Le contraste d'une encre sur un aplat se décide par `inkOn()`**
  (`lib/color.ts`), qui compare les rapports WCAG réels. Ne pas reposer un seuil
  de luminance dans un coin : `luminance()` n'est pas corrigée en gamma et se
  trompe sur les tons moyens.
- **Toutes les dimensions sont relatives à la largeur du canvas**, jamais en px
  absolus, sinon l'export 3× ne ressemble plus à la preview. `y` est divisé par
  la largeur, pas par la hauteur.
- **Les calques, eux, sont relatifs à la largeur de LEUR FENÊTRE**, origine à son
  coin haut-gauche, et se dessinent sous `windowTransform` : une annotation
  appartient à son screenshot, elle le suit quand le padding, le ratio ou le
  layout changent, et s'incline avec lui. `windowMatrix` (`lib/frame.ts`) est la
  seule description de cette rotation — la preview l'inverse pour retrouver le
  point sous le curseur.
- **Le rect d'un calque peut avoir un `w`/`h` négatif** : c'est ce qui permet à
  une flèche de pointer dans les quatre quadrants. Passer par `bounds()`
  (`lib/annotate.ts`) pour un rectangle normalisé — c'est la source unique du
  hit-test et du cadre de sélection.
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
  de couleur, de canvas, de zip ou de composants UI : tout est écrit à la main
  ici. `lucide-react` est la seule exception, et elle ne fournit que des icônes.
- Ne pas ajouter d'export SVG (raster embarqué en base64 = plus lourd que le PNG
  sans gain vectoriel). C'est un choix, pas un oubli.
- `canvasToBlob` vérifie le `blob.type` renvoyé : un navigateur sans encodeur
  WebP retombe silencieusement sur du PNG, et il ne faut pas livrer un fichier
  qui ment sur son extension. Ne pas retirer ce garde-fou.
- Un `.json` de style importé est une donnée externe : `parseStyle` valide champ
  par champ et retombe sur les valeurs par défaut. Ne pas court-circuiter.

## Raccourcis

`⌘V` coller · `⌘E` exporter · `⌘C` copier · `R` régénérer le fond ·
`1/2/3` échelle d'export · `⌘Z` annuler · `⇧⌘Z` refaire.

Sur la sélection de calques : `Delete` supprimer · `⌘D` dupliquer · `Escape`
désélectionner · `←↑→↓` déplacer (`⇧` = pas ×5) · `⌘↑`/`⌘↓` ordre dans la pile ·
`⌘A` tout sélectionner · `⌘G` grouper · `⇧⌘G` dégrouper.

`⇧` **pendant un tracé** aimante une flèche ou un trait aux multiples de 45° —
horizontales, verticales et diagonales parfaites — et carre une surface. En
tirant une poignée, il conserve les proportions et aimante de même. Sur le canvas
avec l'outil Select : `⇧`/`⌘`-clic ajoute au lot, glisser sur le vide trace un
rectangle de sélection.

L'outil Texte pose son label d'un clic et ouvre la saisie sur place ; un
double-clic la rouvre, un texte laissé vide supprime le calque.

## Références visuelles

`~/Downloads/screenshot exemples/` — 7 captures qui sont le rendu cible.
`~/Downloads/design_handoff_shotframe_afterglow/` — le handoff de la refonte
(README + canvas de design). La spec mesurée de l'artwork vit dans `lib/frame.ts`
sous forme de constantes relatives.

## Reste à faire

- Rendu du lot dans un Worker + `OffscreenCanvas` (aujourd'hui séquentiel dans
  le thread principal, avec rendu de la main entre chaque item).
- Zip64 si un lot devait dépasser 4 Gio ou 65 535 fichiers.
- La zone floutée est échantillonnée sans la rotation de la fenêtre : à ±16°
  l'écart ne se voit pas, au-delà il faudrait un rendu hors écran.
