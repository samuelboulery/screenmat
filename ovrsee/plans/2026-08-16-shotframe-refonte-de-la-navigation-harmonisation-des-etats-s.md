---
{
  "status": "open",
  "title": "shotframe — refonte de la navigation + harmonisation des états sélectionnés",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — refonte de la navigation + harmonisation des états sélectionnés

## Context

Deux problèmes, un seul chantier.

**1. L'IA de la barre haute ne correspond pas à la structure réelle.** `App.tsx:44-45`
porte deux états (`view: editor|styles|history` × `mode: compose|annotate|batch`)
pour cinq destinations. « Editor » est à la fois le parent de Compose/Annotate et
leur voisin dans la barre ; choisir un mode force `onView('editor')`
(`TopBar.tsx:111`). Styles, Batch et History sont, eux aussi, des vues de
l'édition — le découpage ne dit pas ce qu'il prétend dire.

**2. La barre mélange trois natures.** Identité (marque + badge LOCAL),
navigation (modes + vues), et actions de l'écran courant (`TopBarActions.tsx`,
qui rend quatre jeux de boutons différents selon `view`/`mode`). Le contenu de la
barre change à chaque changement d'écran → largeur variable, layout shift, et
l'action primaire (Export) vit loin du canvas et de l'inspecteur où le travail
se fait.

**3. Le rail gauche veut dire deux choses.** En Annotate il porte un instrument
(`SEL ARR BOX RDC`…) ; en Compose il porte des **catégories de sections de
l'inspecteur** (`FRM BG 3D TXT BLUR` → `Inspector.tsx:112,178,272,355,387`).
Même widget, même style d'actif, deux sémantiques.

**4. Trois langues pour « sélectionné ».** Conséquence des trois points
précédents, mesurée dans l'audit : `bg-raised text-white` (Segmented, ToolRail),
`border-accent/30 bg-accent/10` (Row, CheckRow), `bg-accent/[.14]
border-accent/45` (Tile), `ring-selected` (Swatch, Filmstrip), `border-b
border-accent` (nav TopBar), `bg-raised ring-1 ring-accent/60` (LayersPanel).

Résultat visé : quatre destinations honnêtes, une barre qui ne bouge plus,
chaque action près de ce qu'elle manipule, et **deux** recettes de sélection —
une pour les commutateurs, une pour le contenu.

## Décisions prises

- Compose + Annotate **fusionnent** en un écran `edit`. Navigation à quatre :
  `Edit | Batch` (le document) et `Styles | History` (la bibliothèque), séparés
  par un espace, pas par un trait.
- Le rail gauche ne porte plus que des **instruments**. Les catégories Compose
  remontent dans l'inspecteur en sections repliables.
- Copy/Export descendent dans le **filmstrip**, déjà posé par CLAUDE.md comme le
  dock du document (dimensions, undo/redo, nouvelle session).
- Les actions de Batch, Styles et History descendent **dans leur écran**.
- Sélection, deux niveaux exactement :
  - **commutateur** (nav, instruments, ratio, format, échelle) →
    `bg-raised text-white` ;
  - **contenu sélectionné** (shot, calque, style, preset, couleur) →
    `border-accent/35 bg-accent/12 text-accent-ink`, et `ring-selected` quand la
    case est une image ou une couleur (un fond teinté mentirait sur le contenu).

## Cible

```
┌ header 58px ────────────────────────────────────────────────────────┐
│ shotframe [LOCAL]   [ Edit | Batch ]      [ Styles | History ]      │  ← nav seule, largeur stable
└─────────────────────────────────────────────────────────────────────┘
  ┌──┐                                              ┌──────────────┐
  │SL│                                              │ Layers       │  ← si le shot a des calques
  │TX│                                              │ Layer style  │  ← si un calque est sélectionné
  │AR│              canvas                          │ ▸ Frame      │
  │BX│                                              │ ▸ Background │  ← sections repliables
  │RD│                                              │ ▸ Depth      │
  └──┘                                              │ ▸ Title bar  │
  instruments                                       │ ▸ Blur       │
                                                    │ ▸ Presets    │
  ┌ filmstrip ──────────────────────────────────────────────────┐
  │ [▪][▪][+]  ⌘V to add  │ ↶ ↷ │ 1920×1080 · png │ ⧉ Copy  ⬇ Export │
  └─────────────────────────────────────────────────────────────┘
```

## Étapes

Chaque étape laisse le dépôt compilable (`pnpm exec tsc -b`).

### 1. État unique de navigation — `src/types.ts`, `src/App.tsx`, `src/components/TopBar.tsx`

- `type Screen = 'edit' | 'batch' | 'styles' | 'history'` dans `src/types.ts`
  (règle du projet : tous les types partagés y vivent) ; `TopBar.tsx` perd
  `Mode` et `View`. L'écran d'import reste dérivé de `empty`, pas un membre de
  l'union — il n'est pas une destination.
- `App.tsx` : `view` + `mode` → `const [screen, setScreen] = useState<Screen>('edit')`.
  Les branches de rendu deviennent `empty && screen === 'edit'` → `ImportScreen`,
  `screen === 'edit'` → `EditorScreen`, etc. `onChangeStyle` de Batch appelle
  `setScreen('styles')`.
- `TopBar` : props `{ screen, onScreen, showNav?, onHome }` — `onView`/`onMode`
  et `children` disparaissent.
- `TopBar` : marque + badge, puis **deux `Segmented`** — `Edit | Batch` et
  `Styles | History` — séparés par `gap` inter-groupe ≥ 2× le gap intra
  (règle de groupement par l'espace). Plus d'underline, plus de `<nav>` maison.
  `showModes` → `showNav` (masqué sur l'import : rien à naviguer).
- `children` disparaît de `TopBar` : la barre n'accueille plus d'actions.

### 2. Les actions descendent près de ce qu'elles manipulent

Suppression de `src/components/TopBarActions.tsx` ; ses quatre branches se
redistribuent :

| Action | Destination |
|---|---|
| Copy · Export | `Filmstrip.tsx`, cluster de droite, après undo/redo et les dimensions. `Export` en `variant="primary"`. |
| Cancel · Export all + « N selected · M files out » | `BatchScreen.tsx`, pied collant (`sticky bottom-0`) du `Panel` de droite, sous la section Output. |
| Export .json | `StylesScreen.tsx`, en-tête de la colonne détail, à côté de « Edit in editor ». |
| Save style (réglages courants → nouveau style) | `StylesScreen.tsx`, pied de la colonne liste, à côté du `DashedTile` « Import .json » — c'est là que naissent les styles. |
| « N exports · X local » + New shot | `HistoryScreen.tsx`, en-tête existant (ligne filtres/recherche). |

`Filmstrip` gagne `onCopy`, `onExport`, `copied` ; sous 1180 px les libellés
tombent déjà (`max-[1180px]:hidden` existant), l'icône reste.

### 3. Fusion Compose + Annotate — `src/components/EditorScreen.tsx`

- `mode` disparaît des props. Un seul rail : `ToolRail` avec les instruments
  (`SEL TXT NUM ARR LIN BOX ELL RDC`). `COMPOSE_TOOLS` et le type `ComposeTool`
  sont supprimés de `ToolRail.tsx`.
- **Règle du chrome de canvas** (remplace `annotating`) : les poignées et cadres
  n'apparaissent que si un calque est sélectionné, ou si un instrument de tracé
  (≠ `SEL`) est actif. Avec `SEL` et rien de sélectionné — l'état par défaut —
  le canvas montre exactement ce que l'export produira, ce que garantissait le
  mode Compose ; `Escape` désélectionne et y ramène en un geste.
- `AnnotateInspector.tsx` fusionne dans `Inspector.tsx` et disparaît. Ordre du
  panneau unique : `Layers` (si le shot a des calques) → `Layer` / `Layer style`
  (si sélection) → `Frame` → `Background` → `Depth & layout` → `Title bar` →
  `Blur & grain` → `Presets`.
- Props qui changent : `EditorScreen` perd `mode` ; `Inspector` perd `tool` et
  gagne ce que portait `AnnotateInspector` (`activeShot`, `selectedLayerIds`,
  `onPatchAnnotation`, `onPatchNode`, `onDeleteLayers`, `onMoveLayer`,
  `onMoveLayers`, `onGroupLayers`, `onUngroupLayer`, `onSelectLayers`) ;
  `Filmstrip` gagne `onCopy`, `onExport`, `copied`.

### 4. Sections repliables — `src/components/ui.tsx`

`Section` gagne `collapsible?: boolean` et rend alors
`<details><summary>` natif (chevron + `t-mono-label`, focus déjà couvert par
`:focus-visible`). Les sections contextuelles (Layers, Layer style) restent
ouvertes et non repliables ; les sections document sont repliables, `Frame` et
`Background` ouvertes par défaut, les autres fermées.
`ponytail:` l'état d'ouverture vit dans le composant, non persisté — à passer
dans `localStorage` (comme `LAST_STYLE_KEY`, `src/lib/styles.ts:153`) si l'usage
montre que le repli se refait à chaque session.

### 5. Harmonisation des états sélectionnés

Deux constantes exportées par `src/components/ui.tsx`, seule source :

```ts
export const SWITCH_ON = 'bg-raised text-white'                              // commutateur
export const SELECTED  = 'border-accent/35 bg-accent/12 text-accent-ink'     // contenu
export const SELECTED_DANGER = 'border-danger/35 bg-danger/12 text-[#FFC9C9]' // idem, floutage
```

| Élément | Aujourd'hui | Cible |
|---|---|---|
| `Segmented` (`ui.tsx:140`), `ToolRail` (`ToolRail.tsx:72`), `Tile tone="raised"` — ratio (`Inspector.tsx:140`) | `bg-raised text-white` | `SWITCH_ON` (inchangé, mais nommé) |
| `Tile` accent — frame, background, depth, layout, label style, presets, watermark | `bg-accent/[.14] border-accent/45 text-accent-ink` | `SELECTED` |
| `Row` — liste de styles, lignes de calque | `border-accent/30 bg-accent/10 text-ink` | `SELECTED` |
| `CheckRow` (`BatchScreen.tsx:23`) | copie locale de la recette `Row` | réutilise `Row` + la case |
| `LayersPanel` ligne active (`LayersPanel.tsx:150`) | `bg-raised ring-1 ring-accent/60` | `SELECTED` |
| `Swatch` (`ui.tsx:297`), vignettes `Filmstrip` (`Filmstrip.tsx:92`), fond image (`Inspector.tsx:193`) | `ring-selected` | inchangé — un fond teinté mentirait sur une image ou une couleur |
| Cases à cocher Batch (`BatchScreen.tsx:28` et `:145`) | `size-[15px]` / `size-4`, bordure `/20` et `/40` | une seule case : `size-[15px]`, `border-white/20`, cochée `bg-accent text-stage` |
| Nav TopBar (`TopBar.tsx:129`) | `border-b border-accent` | supprimée par l'étape 1 |
| `Toggle`, `ShotRing`, indicateurs de dépôt de `LayersPanel` | accent | inchangés — un interrupteur et un repère de canvas ne sont pas une sélection de liste |

Aucun composant ne réécrit ces chaînes : après coup,
`grep -rn "bg-accent/\[\?\.\?1" src/components` ne doit plus rien renvoyer hors
`ui.tsx`.

## Fichiers touchés

Supprimés : `components/TopBarActions.tsx`, `components/AnnotateInspector.tsx`.
Modifiés : `App.tsx`, `components/TopBar.tsx`, `components/EditorScreen.tsx`,
`components/Inspector.tsx`, `components/ToolRail.tsx`, `components/Filmstrip.tsx`,
`components/ui.tsx`, `components/LayersPanel.tsx`, `components/BatchScreen.tsx`,
`components/StylesScreen.tsx`, `components/HistoryScreen.tsx`,
`components/Preview.tsx` (props de chrome), `CLAUDE.md` (sections « Écrans » et
« Direction artistique » : deux recettes de sélection, quatre destinations).

Non touchés : `src/lib/**`, `cli/**`, `hooks/useShortcuts.ts` (le point de
rupture 1100 px et les touches nues valent toujours), `src/index.css` sauf ajout
éventuel d'un utilitaire.

## Risques

- **Hauteur de l'inspecteur unique.** Neuf sections dans un panneau de 288 px :
  c'est le repli natif qui tient la longueur, plus le `max-h-[calc(100%-190px)]
  overflow-y-auto` déjà en place. À surveiller au premier essai — si le scroll
  devient le mode normal, fermer davantage de sections par défaut.
- **Sous 1100 px**, l'inspecteur est une feuille rétractable et le rail passe à
  l'horizontale : vérifier que les sections repliables n'y ajoutent pas un
  second niveau de repli pénible.
- **Aucun test de composant React** dans le dépôt (Vitest ne couvre que
  `src/lib/` et `cli/`) : la refonte ne casse aucun test, mais rien ne la
  rattrape non plus — la vérification manuelle ci-dessous est le filet.

## Vérification

1. `pnpm exec tsc -b` puis `pnpm test` — la suite est en logique pure, elle doit
   rester verte sans modification (aucun test ne monte de composant).
2. `pnpm dev`, puis parcours manuel :
   - la barre haute garde exactement la même largeur sur les quatre écrans
     (plus aucun bouton n'y entre ni n'en sort) ;
   - coller un screenshot (`⌘V`) → outil `SEL`, aucune poignée, le canvas est
     l'export ; tracer une flèche → poignées et section « Layer style » ;
     `Escape` → canvas propre ;
   - Copy et Export depuis le filmstrip, à 1×/2×/3× ;
   - Batch : cocher des ratios, `Export all`, `Cancel` — actions au pied du
     panneau, jamais coupées au scroll ;
   - Styles : `Export .json`, `Save style`, `Import .json` ;
   - zoom 200 % et fenêtre à 1024 px : rail horizontal, feuille d'inspecteur,
     rien de clippé.
3. Passe visuelle de cohérence : sur chaque écran, un seul état sélectionné doit
   être teinté accent à la fois par famille — commutateurs neutres, contenu en
   accent.
4. `pnpm cli <image>` : le rendu machine ne doit pas bouger d'un pixel (aucun
   fichier de `src/lib/` n'est touché).
