---
name: screenmat-moteur
description: Le moteur de rendu Canvas 2D de screenmat — carte de `src/lib/`, invariants de `renderScene`, repères de coordonnées, arbre de calques, floutage cuit, fond déterministe, cache du fond, contraste des encres, rotation Y. À invoquer AVANT de toucher au canvas, à un calque, à une annotation, au floutage, au fond, à la palette, à la géométrie, à l'export ou à la preview. Les règles qu'il porte sont ce qui garantit qu'un export 3× est l'homothétique exact de ce qu'on voit à l'écran.
---

# screenmat — le moteur de rendu

`renderScene(ctx, scene, scale)` est **le seul chemin de rendu**. La preview
l'appelle avec `scale = devicePixelRatio`, l'export avec 1, 2 ou 3, le CLI et le
serveur MCP avec le même. Ne jamais introduire de rendu DOM/CSS parallèle :
l'export doit correspondre à la preview par construction, pas par vigilance.

## Carte de `src/lib/`

```
render.ts       renderScene(ctx, scene, scale) — LE MOTEUR, et computeGeometry
frame.ts        dessin des cadres browser/macbook/iphone/none, rotation Y
screen.ts       où le screenshot atterrit : windowAspect, screenRect, sourceRect, pan
anchor.ts       calques recalés quand le screenshot bouge dans sa fenêtre
background.ts   dispatch des fonds, backgroundColors, + cache
series.ts       SERIES : capture · macOS · Windows · trame — source unique des types de fond
wallpapers.ts   catalogue des vrais fonds macOS et Windows (images de public/wallpapers/)
dithered.ts     fonds tramés : DITHERS, source unique — bayer · halftone · scanlines
dither-patterns.ts  huit motifs dessinés : atkinson · stipple · crosshatch · contours ·
                ridgelines · riso · glyphs · truchet (encre claire, fond sombre)
dither.ts       ditherPixels, Bayer 4×4 — partagé avec la landing
noise.ts        tuile de grain, générée une fois, blittée à l'échelle
palette.ts      couleurs dominantes + harmonisation d'un lot
layers.ts       rendu des calques
redact.ts       floutage cuit dans les pixels, rectangle ou ellipse
annotate.ts     modèle et géométrie des calques, hit-test, bornes
keys.ts         une touche, en capsules et selon la plateforme (⌘ ou Ctrl)
tool-style.ts   dernier style de chaque outil, en localStorage
tree.ts         arbre de calques : groupes, aplatissement, déplacement
draft.ts        tracé en cours : rect aimanté, scène augmentée
handles.ts      poignées : redimensionnement, aimantation, nudge
hit.ts          quelle fenêtre, quel calque sous le curseur
history.ts      réducteur d'annulation, pur et sans React
watermark.ts    logo utilisateur, dessiné en dernier
export.ts       blob, téléchargement, presse-papier, lots
zip.ts          archive « stored », sans dépendance
store.ts        IndexedDB : styles + historique
styles.ts       création, export/import validé, préférences
spec.ts         scène sérialisable pour la porte machine
image.ts        fichier/blob/presse-papier → HTMLImageElement
color.ts        conversions, luminance, inkOn
random.ts       mulberry32
```

`src/lib/` n'importe jamais React. Les hooks correspondants vivent dans
`src/hooks/`, un par responsabilité (`useCanvasScene`, `useShots`, `useHistory`,
`useExport`, `useBatch`…).

## Les invariants

- **Le tracé en cours et le caret de saisie font partie du rendu** : le premier
  est une annotation brouillon glissée dans la scène (`withDraft`), le second un
  champ `scene.editing` que le moteur dessine. Seul le chrome d'édition — cadres
  de sélection, poignées, rectangle de sélection, ligne de dépôt du panneau — est
  en DOM, et n'apparaît nulle part dans le fichier exporté.
- **Les calques forment un arbre** (`Shot.layers: LayerNode[]`) : une annotation
  ou un groupe imbricable. Le rendu et le hit-test ne connaissent que la liste
  plate qu'en tire `flatten()` (`tree.ts`) ; un calque masqué en est écarté, et
  n'existe donc pas non plus à l'export. Toute manipulation d'arbre passe par
  `tree.ts`, jamais par un `map`/`filter` local.
- **La composition se centre sur sa boîte englobante**, jamais sur l'origine des
  décalages : `extent()` (`render.ts`) rend le centre de la boîte autant que sa
  taille, et `place()` le retranche. Sans ça une pile, dont les décalages ne vont
  que vers le haut et la gauche, se dessine basse et à droite d'un demi-décalage.
  `composition.offsetY` est la seule façon de contredire ce centrage.
- **La retouche manuelle d'une fenêtre (`Shot.placement`) n'entre ni dans le
  cadrage ni dans le centrage.** Elle s'applique dans `place()`, après coup :
  déplacer un shot ne redimensionne ni ne recentre ses voisins — sans quoi le
  glisser (⌥) ferait dériver toute la composition sous le curseur. Corollaire
  assumé : un décalage assez grand sort la fenêtre du canvas. `geometry.titleBar`
  et `geometry.radius` valent pour l'échelle 1 ; `box.scale` les ramène à une
  fenêtre retouchée, et c'est `screenRect()`/`frameRadius()` qui le font.
- **Toutes les dimensions sont relatives à la largeur du canvas**, jamais en px
  absolus, sinon l'export 3× ne ressemble plus à la preview. `y` est divisé par
  la largeur, pas par la hauteur.
- **Les calques, eux, sont relatifs à la largeur de LEUR FENÊTRE**, origine à son
  coin haut-gauche, et se dessinent sous `windowTransform` : une annotation
  appartient à son screenshot, elle le suit quand le padding, le ratio ou le
  layout changent, et s'incline avec lui. `windowMatrix` (`frame.ts`) est la
  seule description de cette rotation — la preview l'inverse pour retrouver le
  point sous le curseur.
- **Le rect d'un calque peut avoir un `w`/`h` négatif** : c'est ce qui permet à
  une flèche de pointer dans les quatre quadrants. Passer par `bounds()`
  (`annotate.ts`) pour un rectangle normalisé — c'est la source unique du
  hit-test et du cadre de sélection.
- **`screenRect()` (`screen.ts`) dit où le screenshot atterrit dans sa fenêtre,
  `sourceRect()` quelle part de l'image s'y voit.** Sources uniques : le cadre
  dessine ce rectangle-là à cet endroit-là, le floutage y échantillonne,
  `inspect()` les publie. Les recalculer ailleurs, c'est les voir diverger — c'est
  ce qui faisait ignorer le bezel du macbook à `inspect()`.
- **Le screenshot n'est jamais étiré.** `windowAspect()` donne à l'écran le
  rapport de l'image (bezel compris dans celui de la fenêtre) ; quand un ratio
  est verrouillé (`deviceRatio`, `screenRatio`) ou qu'un shot n'a pas le rapport
  du premier, `sourceRect()` le rogne en « cover », et `Shot.pan` dit où.
- **Un calque suit son image, pas sa fenêtre.** Tout geste qui déplace un
  screenshot sous ses calques les recale (`reanchorShots`, `anchor.ts`), d'une
  `View` à l'autre : réglages de cadre et de ratio, mais aussi l'ordre des
  images, les membres de la composition et le passage séparé/combiné, puisque la
  première image donne son rapport aux fenêtres des autres. Ces gestes passent
  tous par `useAnchoredSettings` ; en brancher un directement sur `useShots` ou
  `compose`, c'est rouvrir la fuite — un floutage découvre ce qu'il masquait.
  L'historique restaure les membres avec les images pour la même raison. Le
  rendu machine, lui, ne recale rien (`coordinates.md`, règle 5).
- **Les cotes d'un iPhone se lisent sur son petit côté** (`frameUnit`) : un
  screenshot paysage le couche, îlot sur le bord court que dit
  `settings.islandSide`, sans grossir son bezel ni son rayon. L'îlot se dessine
  par-dessus l'écran : son côté ne déplace ni screenshot ni calque.
- **Quand le screenshot bouge dans sa fenêtre, les calques le suivent**
  (`anchor.ts`) : glisser de l'image (`panShot`), changement de cadre, de barre
  de titre ou de ratio (`reanchorShots`, sur toutes les images). Sans ça un
  floutage découvre ce qu'il masquait. Un nouveau réglage qui déplace le
  screenshot s'ajoute à `ANCHOR_KEYS`. Le rendu machine, lui, reste déclaratif :
  `render()` ne déplace aucun calque.
- **Le contraste d'une encre sur un aplat se décide par `inkOn()`** (`color.ts`),
  qui compare les rapports WCAG réels. Ne pas reposer un seuil de luminance dans
  un coin : `luminance()` n'est pas corrigée en gamma et se trompe sur les tons
  moyens.
- **Le fond est déterministe** : PRNG `mulberry32` seedé par `settings.seed`.
- **Les couleurs du fond se résolvent à un seul endroit** : `settings.palette ??
  scene.palette`, dans `render.ts`. Une palette figée vit dans les réglages, donc
  suit l'annulation, les styles, l'historique et le lot sans code en plus.
  `Style.palette` n'existe plus ; `withLegacyPalette` migre l'ancien format.
- **Une trame dessine une forme par `fill`**, jamais un chemin cumulé : sous
  Skia, 43 000 points dans un seul chemin prennent 19 s, un par un 30 ms.
- **Le fond est mis en cache d'une frame à l'autre**, sur une clé qui liste tous
  les champs dont il dépend (`backgroundKey`, dans `background.ts`). Un champ
  oublié dans cette clé fige le fond : le réglage bouge, l'image ne suit pas.
  `cli/__tests__/render.test.ts` tient cette liste, un cas par réglage.
- Le flou du fond se fait par downscale/upscale d'un canvas offscreen, pas par
  `ctx.filter = 'blur()'` (support inégal, et c'est plus lent).
- **Le grain se blitte en tuiles, pas en `CanvasPattern`** : l'ombrage par motif
  d'un canvas 3200 × 2400 se mesure à 470 ms contre 69 ms pour la même tuile
  pré-mise à l'échelle et blittée. Le mode de fusion n'y est pour rien.
- **Le floutage est cuit dans les pixels sous le clip de la fenêtre**, jamais en
  CSS : sinon la donnée masquée resterait lisible dans le fichier exporté.
  **L'échantillon vient du screenshot source, jamais de `ctx.canvas`** : relire le
  canvas de destination force le rasteriseur à vider la frame en cours puis à en
  rasteriser la suite une seconde fois — une frame passait de 3 ms à 372 ms dès
  qu'une seule zone existait. **L'aplat des zones masquées ne se pose que sous ce
  qui déborde vraiment du screenshot** (`overflows`, un demi-pixel de marge) et
  la zone se cale sur les pixels quand la fenêtre est de face : comparé à
  l'égalité de flottants, l'aplat passait sous deux flous sur trois et ressortait
  en filet sombre. Une zone `redactionShape: 'ellipse'` est le même dessin sous
  un clip local ; l'échantillon reste celui de sa boîte.
- **Une forme a deux couleurs** : `color` pour le trait, `fillColor` pour le
  fond, chacune son opacité — `strokeOpacity` et `fill`. `stroke: false` coupe
  le contour, sauf sans fond, où il se trace même à `strokeOpacity: 0` — une
  forme ne peut pas être invisible, et c'est `strokeAndFill` qui le garantit,
  pas le parseur.
- La rotation Y est une approximation affine (compression horizontale +
  cisaillement vertical), pas un vrai mapping projectif : une matrice reste
  homothétique à l'export, un découpage en bandes ne le garantirait pas.
- **Un `pointermove` ne se traite qu'une fois par frame** (`Preview.tsx`) : une
  souris à 1000 Hz produisait autant d'événements, chacun coûtant trois passes de
  rendu React pour un canvas qui n'en dessine que soixante par seconde.

## Tests

`src/lib/__tests__/*.test.ts` pour la logique pure, `cli/__tests__/*.test.ts`
pour le rendu headless. La logique non triviale laisse un test derrière elle :
`quantize()` (palette), la géométrie de `renderScene()` à deux échelles,
`screenRect()` sur les quatre cadres, l'invalidation du cache de fond.
Pas de framework E2E : l'app est un canvas unique, Vitest suffit.

## Le lot

Le rendu d'un item est sérialisé et synchrone (36 ms à l'échelle 3) ; ce sont
les **encodages qui se recouvrent**, trois de front. `canvas.toBlob` encode déjà
hors du fil principal, et l'encodage pèse 97 % du temps d'un lot — 1 228 ms en
PNG contre 36 ms de rendu.

**Un Worker + `OffscreenCanvas` n'est pas la réponse**, et ce n'est plus un
« reste à faire » : mesuré, un lot de 12 items en 3× ne produit *aucune* tâche
longue. L'interface ne gèle pas, elle attend l'encodeur. Un worker déplacerait
les 3 % qui ne sont pas déjà hors du fil principal, au prix du portage de
`renderScene` et du transfert des images décodées.

Le plafond de trois vient de la mémoire, pas du temps : chaque item en vol
retient son canvas, 69 Mo à l'échelle 3. Monter ce nombre demande de mesurer la
mémoire.

## Reste à faire

- Zip64 si un lot devait dépasser 4 Gio ou 65 535 fichiers.
