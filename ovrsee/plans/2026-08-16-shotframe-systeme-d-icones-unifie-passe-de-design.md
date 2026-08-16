---
{
  "status": "open",
  "title": "shotframe — système d'icônes unifié + passe de design",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — système d'icônes unifié + passe de design

## Contexte

shotframe affiche aujourd'hui ses onglets, ses outils et ses actions avec trois
langages visuels qui cohabitent mal :

- des **abréviations mono** (`FRM`, `BG`, `3D`, `SEL`, `ARR`, `RDC`…) dans le
  rail d'outils, le panneau des calques et l'inspecteur ;
- des **glyphes Unicode détournés en icônes** — `↺` undo, `↻` redo, `◉`/`◌`
  visibilité, `⊘`/`○` verrou, `›`/`⌄` repli, `↖↑↗` filigrane, `+`, `‹ Inspect` ;
- des **micro-icônes dessinées en CSS** (`LayoutIcon.tsx`, rectangles en bordure,
  couleur `#8B8FA0` codée en dur, hors tokens).

Le commentaire en tête de `ToolRail.tsx:3-4` pose le dilemme sans le trancher :
« un jeu d'icônes les remplacerait toutes ou aucune ». **On tranche pour
toutes.** Dans la même passe, on corrige les incohérences accumulées : 16 rayons
différents, deux opacités de `disabled`, trois paddings de bouton, trois tailles
de case, `aria-label` absent sur tous les boutons icône-seule.

Décidé avec l'utilisateur : **lucide-react**, et icône seule ou icône + texte au
cas par cas (un verrou de calque n'a pas besoin d'un mot, un onglet de
navigation si).

## Dépendance

`pnpm add lucide-react` — v1.31.0, ISC, publiée le 2026-08-09, peer `react ^19`,
aucun script de cycle de vie (rien à autoriser dans `onlyBuiltDependencies`).
ESM une icône par fichier → tree-shaking Vite ; ~50 icônes ≈ 6-8 ko gzip.
Bundlée, donc **la contrainte hors ligne tient**.

C'est la seule dépendance runtime hors React : `CLAUDE.md` et le commentaire du
`ToolRail` deviennent faux et sont mis à jour dans la même passe (étape 8).

## Grammaire visuelle

- **Deux tailles.** 16 px partout (barres, listes, lignes de calque, inline),
  20 px dans le `ToolRail` seul (bouton de 44 px).
- **`stroke-width: 1.5`** partout — la DA est fine (hairlines 1 px, texte
  12-13 px) ; le 2 px par défaut de Lucide écraserait le reste.
- **Pas de `fill`.** L'état actif se dit par la couleur uniquement
  (`text-white` sur `bg-raised`, ou `text-accent`), comme le reste de la DA :
  l'accent ne sert qu'à l'action primaire et à la sélection courante.
- **`--color-danger`** pour l'outil Redact, les modes de floutage et Delete.

Réglé une fois dans `src/index.css` — Lucide pose une classe `.lucide` sur
chaque `<svg>`, et `stroke-width`/`width`/`height` sont surchargeables en CSS :

```css
.lucide {
  width: 16px;
  height: 16px;
  stroke-width: 1.5;
  flex: none;
}
```

Le rail passe `className="size-5"` pour ses 20 px. Aucun `size=`/`strokeWidth=`
à répéter sur 60 appels. Les `<svg>` sont décoratifs (`aria-hidden`) — c'est le
bouton qui porte le nom accessible.

## Mapping icônes

Un seul fichier `src/components/icons.tsx` : il ré-exporte les icônes Lucide
sous des noms de domaine et porte les tables `Record<clé, LucideIcon>`. Les
composants importent depuis là, jamais depuis `lucide-react` directement — un
seul endroit à relire pour juger la cohérence du jeu.

**Barre haute** — icône + label (la navigation se lit, elle ne se devine pas)

| Élément | Icône | Texte |
|---|---|---|
| Vue Editor | `Image` | gardé |
| Vue Styles | `Palette` | gardé |
| Vue History | `History` | gardé |
| Mode Compose | `Wand2` | gardé |
| Mode Annotate | `PenLine` | gardé |
| Mode Batch | `Boxes` | gardé |
| Badge LOCAL | `ShieldCheck` | gardé (dit l'offline) |

**ToolRail** — icône seule, 20 px, `title` + `aria-label` (le rail fait 56 px de
large : le mot n'y tient pas, et le tooltip existe déjà)

| Outil | Icône | | Outil | Icône |
|---|---|---|---|---|
| FRM Frame & canvas | `Frame` | | SEL Select | `MousePointer2` |
| BG Background | `PaintBucket` | | TXT Text label | `Type` |
| 3D Depth & layout | `Rotate3d` | | NUM Numbered badge | `Hash` |
| TXT Title bar | `Type` | | ARR Arrow | `ArrowUpRight` |
| BLUR Blur & grain | `Droplet` | | LIN Line | `Slash` |
| | | | BOX Box | `Square` |
| | | | ELL Ellipse | `Circle` |
| | | | RDC Redact | `SquareAsterisk` (danger) |

La même table sert de `KIND_LABEL` iconique dans `LayersPanel.tsx:12-20` et
`AnnotateInspector.tsx:9-16` : un calque porte l'icône de l'outil qui l'a créé.

**Actions** — icône seule dans les barres denses, icône + label sur les boutons
de fin de course (Export, Save style : une action irréversible ou coûteuse garde
son mot)

| Action | Icône | Texte |
|---|---|---|
| Undo / Redo | `Undo2` / `Redo2` | non |
| Copy / copié | `Copy` / `Check` | gardé |
| Export | `Download` | gardé |
| Export all (zip) | `Archive` | gardé |
| Cancel batch | `X` | gardé |
| Export .json | `FileJson` | gardé |
| Save style | `Bookmark` | gardé |
| New shot | `ImagePlus` | gardé |
| Shuffle du seed (`Inspector.tsx:197`) | `Shuffle` | gardé |
| Ordre de pile (`AnnotateInspector.tsx:87,96`) | `SendToBack` / `BringToFront` | non |
| Group / Ungroup | `Group` / `Ungroup` | non |
| Delete calque | `Trash2` | non (danger, tooltip `Delete ⌫`) |
| Ajouter (`+` ×3) | `Plus` | non |
| Feuille inspecteur (`EditorScreen.tsx:173`) | `PanelRightOpen` / `PanelRightClose` | non |

**Panneau des calques** — icône seule, 16 px

| État | Icône |
|---|---|
| Visible / masqué (`LayersPanel.tsx:210`) | `Eye` / `EyeOff` |
| Déverrouillé / verrouillé (`:217`) | `LockOpen` / `Lock` |
| Groupe déplié / replié (`:164`) | `ChevronDown` / `ChevronRight` |

**Inspecteur**

| Élément | Icône | Texte |
|---|---|---|
| Frame browser / mac / phone / none | `AppWindow` / `Laptop` / `Smartphone` / `Ban` | gardé |
| Layout single / stack / side / tilt3d | `Square` / `Copy` / `Columns2` / `Rotate3d` | gardé |
| Fond par image (`Inspector.tsx:186` « img ») | `Image` | non |
| Redaction blur / pixel / solid | `Droplet` / `Grid3x3` / `SquareSlash` | gardé (danger : on ne devine pas) |
| Ratios `4:3 1:1 16:9…` | — | **texte mono, inchangé** : c'est une donnée, pas une action |
| Recherche (`HistoryScreen.tsx:60`) | `Search` dans le champ | placeholder gardé |
| Choose file (`ImportScreen.tsx:44`) | `FolderOpen` | gardé |
| Badge `⌘ V` (`ImportScreen.tsx:37`) | — | **inchangé** : un raccourci clavier s'écrit, il ne se dessine pas |

`LayoutIcon.tsx` (60 lignes de CSS + `#8B8FA0` hors tokens) **est supprimé** —
les quatre dispositions passent aux icônes Lucide ci-dessus. C'est le sens de
« toutes ou aucune ». *Arbitrage assumé : les rectangles CSS décrivent mieux la
disposition réelle (décalage de la pile, inclinaison) qu'un `Rotate3d`
générique. Si tu préfères les garder, on les conserve et on remplace juste le
`#8B8FA0` par `currentColor` — dis-le et je bascule.*

Les noms d'export Lucide ci-dessus sont posés de mémoire. Première chose à faire
après l'install : `ls node_modules/lucide-react/dist/esm/icons/ | grep …` pour
vérifier chaque nom, et corriger la table avant d'écrire le reste. `tsc -b`
attrapera de toute façon un import inexistant.

## Correctifs de design

**1. Cinq rayons au lieu de seize.** Aujourd'hui : `rounded`, `-sm`, `-md`,
`-lg`, `-xl`, `-2xl`, `-full` et `[2px] [3px] [4px] [5px] [7px] [9px] [10px]
[14px] [20px]`. Tokens dans `@theme` (`src/index.css:49`) — Tailwind 4 dérive
les utilitaires `rounded-*` de `--radius-*` :

```css
--radius-xs: 4px;   /* poignées, cases à cocher */
--radius-sm: 7px;   /* vignettes de filmstrip */
--radius-md: 10px;  /* boutons, cases, champs */
--radius-lg: 14px;  /* panneaux flottants, cartes */
--radius-xl: 20px;  /* dropzone */
```

Balayage : toute valeur `rounded-[Npx]` prend le token le plus proche. Attention,
cela change la valeur de `rounded-md`/`rounded-lg` déjà utilisés — c'est
volontaire, mais le sweep doit passer sur **tous** les fichiers d'un coup.

**2. Une seule opacité de `disabled` : `40 %`.** `AnnotateInspector.tsx:85,94`
utilise `opacity-30`, `ui.tsx:20` `opacity-40`.

**3. Paddings de `Button` alignés** (`ui.tsx:12-14`) : `px-[17px]` et `px-[14px]`
deviennent `px-3.5` ; le variant `ghost` n'a plus à porter de padding texte — il
devient icône-seule via `IconButton`.

**4. Une taille de case : 40 px.** `Presets.tsx:25,30` en `size-[38px]` passe à
`size-10`, comme `Swatch`. Le rail garde ses 44 px (`size-11`), c'est une cible
de pointage plus grosse, assumée.

**5. Gaps sur l'échelle.** `gap-[14px]` (`TopBar.tsx:59`) → `gap-3.5` ; même
traitement pour les `p-[18px]`, `p-[26px_28px]`, `py-[9px]`, `py-[5px]`.

**6. `aria-label` sur tout bouton icône-seule.** Aujourd'hui seul `title` est
posé (`ToolRail.tsx:62`, `TopBarActions.tsx:46,49`, `AnnotateInspector.tsx:82,91`,
`LayersPanel.tsx:160,207,214`). Le passage aux icônes rend le manque bloquant :
plus aucun texte ne reste à lire pour un lecteur d'écran.

**7. Une primitive `IconButton` dans `ui.tsx`.** Trois styles de bouton
icône-seule ad hoc existent aujourd'hui (`TopBarActions` ghost, le `Toggle`
local de `LayersPanel.tsx:223`, les boutons d'ordre de `AnnotateInspector`).
`IconButton` les remplace : `size-8`, `rounded-md`, hover `bg-white/[.04]`,
`disabled:opacity-40`, et une prop `label` **obligatoire** qui alimente à la
fois `title` et `aria-label` — l'oubli d'accessibilité devient impossible à
écrire.

**8. Collision de noms.** `LayersPanel.tsx:223` définit un `Toggle` local qui
n'a rien à voir avec le `Toggle` (interrupteur) de `ui.tsx:141`. Il disparaît
avec `IconButton`.

## Étapes

1. **Socle** — `pnpm add lucide-react`, règle `.lucide` dans `index.css`,
   `src/components/icons.tsx` (tables de mapping), `IconButton` dans `ui.tsx`.
2. **ToolRail** (`ToolRail.tsx`) — icônes 20 px, `aria-label`, commentaire de
   tête réécrit.
3. **Barre haute** — `TopBar.tsx` (vues + modes icône&nbsp;+&nbsp;label, via
   `Option.label: ReactNode` qui accepte déjà un nœud), `TopBarActions.tsx`.
4. **Calques** — `LayersPanel.tsx` (œil, verrou, chevron, icône de kind),
   `AnnotateInspector.tsx` (ordre, group/ungroup, delete).
5. **Inspecteur** — `Inspector.tsx` (frames, layouts, shuffle, fond image),
   suppression de `LayoutIcon.tsx`, `AnnotationStyle.tsx` (modes de floutage).
6. **Écrans** — `StylesScreen.tsx` (positions du filigrane, `+`),
   `BatchScreen.tsx`, `HistoryScreen.tsx` (recherche), `ImportScreen.tsx`,
   `Filmstrip.tsx`, `Presets.tsx`, `EditorScreen.tsx` (feuille).
7. **Passe de design** — les huit correctifs ci-dessus, en un balayage.
8. **Docs** — `CLAUDE.md` (ligne « zéro dépendance runtime hors React »,
   mention du jeu d'icônes dans la section DA) et
   `.claude/rules/shotframe-conventions.md` (lucide est le jeu sanctionné ; la
   règle « demander avant d'installer » reste).

Étapes 2 à 6 indépendantes les unes des autres une fois le socle en place.

## Vérification

```bash
pnpm exec tsc -b     # tsc --noEmit ne vérifie rien ici (fichier solution)
pnpm test            # Vitest — logique pure, ne doit pas bouger
pnpm build           # relever la taille du bundle avant/après
pnpm dev
```

À l'œil, écran par écran :

- **Import** — dropzone, badge `⌘ V` toujours en texte, `Choose file` avec icône.
- **Compose** — rail d'outils : les cinq icônes lisibles à 20 px, l'état actif
  distinct de l'inactif sans lire le tooltip ; survol → tooltip correct.
- **Annotate** — huit outils, Redact bien en rouge ; panneau des calques : œil,
  verrou, chevron alignés optiquement sur la ligne de texte ; icône de kind
  cohérente avec l'outil qui a créé le calque.
- **Layouts / Batch / Styles / History** — aucun glyphe Unicode résiduel :
  `grep -rn "›\|‹\|⌄\|◉\|◌\|⊘\|↺\|↻\|↖\|↗\|↙\|↘" src/` doit ne rendre que des
  commentaires et des libellés de raccourci.
- **Sous 1100 px** — rail horizontal : 8 icônes de 44 px + gaps tiennent dans la
  largeur ; le bouton de feuille (`PanelRightOpen`) ne recouvre pas le rail.
- **Clavier** — `Tab` sur chaque écran : l'anneau de focus accent reste visible
  sur les boutons icône-seule (le `:focus-visible` global d'`index.css:98` s'y
  applique déjà).
- **Export** — exporter un PNG et vérifier qu'aucune icône n'a fuité dans
  l'image : les icônes sont du chrome DOM, `renderScene()` reste le seul moteur.
