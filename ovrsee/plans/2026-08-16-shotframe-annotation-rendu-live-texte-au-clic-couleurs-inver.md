---
{
  "status": "open",
  "title": "shotframe — Annotation : rendu live, texte au clic, couleurs inversées, calques en arbre",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — Annotation : rendu live, texte au clic, couleurs inversées, calques en arbre

## Context

L'écran **Annotate** de shotframe fonctionne, mais son geste de dessin est aveugle :
pendant un tracé on ne voit qu'un rectangle pointillé en DOM
(`Preview.tsx:311-316`), quelle que soit la forme. Une flèche ne montre ni sa
pointe ni son inclinaison avant le relâchement, et `⇧` n'aimante qu'au
redimensionnement — pas au tracé (`handles.ts:56`, appelé seulement depuis
`applyHandle`). Le texte impose de glisser une boîte avant de pouvoir taper, et
la frappe se fait dans l'inspecteur, loin du visuel. Les labels et badges n'ont
qu'une déclinaison de couleur. Enfin la pile de calques est une simple liste
plate, à sélection unique, réordonnable seulement par deux boutons `↑`/`↓`
(`AnnotateInspector.tsx:104-121`).

Objectif : que l'annotation se pilote au geste, dans le canvas, avec une vraie
gestion de calques — arbre de groupes, multi-sélection, drag & drop, visibilité,
verrouillage, renommage.

Contrainte structurante : **`renderScene()` reste le seul chemin de rendu**
(`.claude/rules/shotframe-conventions.md`). Tout ce qui se voit *dans le visuel*
— y compris le tracé en cours et le caret de saisie — passe par la scène. Seul
le chrome d'édition (cadre de sélection, poignées, marquee, ligne de dépôt)
reste en DOM, comme aujourd'hui `SelectionOverlay`.

Décisions actées avec l'utilisateur : arbre de groupes **imbriqué** (pas de
`groupId` plat), multi-sélection **⇧-clic + rectangle de sélection**, panneau
avec **visibilité + verrouillage + renommage**, saisie texte avec **caret
dessiné dans le canvas**.

---

## 1. Modèle : la pile de calques devient un arbre

`types.ts` — `Shot.annotations: Annotation[]` devient `Shot.layers: LayerNode[]` :

```ts
export type LayerGroup = {
  id: string
  kind: 'group'
  name: string
  collapsed: boolean
  hidden: boolean
  locked: boolean
  children: LayerNode[]
}

export type LayerNode = Annotation | LayerGroup
```

`kind` sert de discriminant : `isGroup(node)` ⇔ `node.kind === 'group'`.
`Annotation` gagne `name: string` (vide ⇒ nom dérivé comme aujourd'hui),
`hidden: boolean`, `locked: boolean`, `invert: boolean`.

Le renommage `annotations` → `layers` est mécanique mais traverse tout : le type
change de toute façon, chaque site d'usage doit être relu.

**Nouveau module pur `src/lib/tree.ts`** (pas d'import React, testable sans
navigateur, comme `annotate.ts`) :

| Fonction | Rôle |
|---|---|
| `isGroup(node)` | discriminant |
| `flatten(nodes, opts?)` | `Annotation[]` en ordre de peinture ; `opts.skipHidden`, `opts.skipLocked`. Un enfant hérite du `hidden`/`locked` de ses ancêtres |
| `findNode(nodes, id)` | `{ node, parent, index }` |
| `updateNode(nodes, id, patch)` | mise à jour immuable en profondeur |
| `removeNodes(nodes, ids)` / `insertNodes(nodes, parentId, index, added)` | primitives |
| `moveNodes(nodes, ids, parentId, index)` | le drag & drop. Refuse de déplacer un groupe dans sa propre descendance |
| `groupNodes(nodes, ids, name)` / `ungroup(nodes, groupId)` | ⌘G / ⇧⌘G |
| `nodeIds(nodes)` | liste récursive d'identifiants |

**Points d'accroche à mettre à jour :**
- `render.ts:224` et `render.ts:230` → `flatten(shot.layers, { skipHidden: true })`.
  Un calque masqué ne se dessine pas, donc ne sort pas non plus à l'export.
- `annotate.ts:116` `badgeNumbers()` reçoit la liste aplatie ; un badge masqué ne
  compte pas dans la numérotation (le commentaire existant le documente déjà :
  le numéro est un rang, jamais stocké).
- `annotate.ts:225` `hitTest()` reçoit `flatten(layers, { skipHidden: true, skipLocked: true })`.
- `history.ts:33` `signature()` → `nodeIds(shot.layers).join(',')`, pour qu'une
  création ou une dissolution de groupe soit bien une étape d'annulation
  distincte et non un simple coalescing.
- `useShots.ts` : `patchLayers` opère désormais via `tree.ts`
  (`updateNode`, `removeNodes`, `moveNodes`) au lieu de `map`/`filter` à plat.

**Aucune migration de persistance.** Les calques ne sont pas stockés : `Style`
ne porte que `settings`/`palette`/`watermark`, `HistoryEntry` que des réglages et
des blobs (`store.ts`). Rien à versionner.

---

## 2. Rendu live du tracé, avec aimantation ⇧

**Nouveau module pur `src/lib/draft.ts`** :

- `draftRect(kind, from, to, shift): Rect | null` — extrait de
  `Preview.drawnRect()` (`Preview.tsx:333-350`), enrichi :
  - `isSegment` (arrow/line) + `shift` → `snapTo45(w, h)` (déjà écrit,
    `handles.ts:56` — **l'exporter**). Couvre horizontales, verticales et
    diagonales parfaites.
  - surface (box/ellipse/redaction) + `shift` → carré (côté = max des deux).
  - `isPoint` → rect de taille nulle, sans seuil.
  - sinon `null` sous `MIN_DRAW`.
- `withDraft(scene, shotId, annotation): Scene` — clone la scène en ajoutant
  l'annotation brouillon en fin de pile du shot visé.

**`Preview.tsx`** :
- `drag` porte `shift: boolean`, mis à jour à chaque `onPointerMove` depuis
  `event.shiftKey` (l'aimantation doit suivre l'appui/relâchement de ⇧ en cours
  de tracé, pas seulement son état initial).
- pendant un tracé, on construit l'annotation brouillon avec
  `createAnnotation(kind, toFractions(rect, box))` et on rend
  `withDraft(scene, …)`. **On voit exactement la forme finale** : flèche avec sa
  pointe, ellipse, pastille de label, floutage réel.
- supprimer le `<div>` pointillé (`Preview.tsx:311-316`) et `drawPreview()`
  (`Preview.tsx:352-374`).
- afficher pendant le tracé d'un segment les deux poignées `start`/`end` via
  `SelectionOverlay` (sans `onGrab`) : les deux extrémités restent saisissables à
  l'œil, ce que l'utilisateur attend d'une flèche.
- **Scinder le `useEffect` de rendu** (`Preview.tsx:71-122`) : un effet possède
  le `ResizeObserver` (dépendance : la boîte), un autre dessine (dépendances :
  scène + inset). Aujourd'hui l'observer est recréé à chaque changement de
  scène — avec un re-rendu par mouvement de pointeur, ça devient coûteux.

---

## 3. Texte : un clic, et on tape

- `annotate.ts:50` `isPoint()` renvoie vrai pour `'badge' | 'text'`. Le rect d'un
  label ne porte déjà que son ancre : `bounds()` (`annotate.ts:160-163`) le
  calcule depuis `labelSize()`, `w`/`h` sont ignorés. Le changement est cohérent
  avec le modèle existant, pas une exception.
- `createAnnotation()` (`annotate.ts:68`) : `text: ''` au lieu de `'Label'` — la
  saisie s'ouvre dans la foulée, un texte par défaut n'aurait qu'à être effacé.
- `Scene` gagne `editing?: { id: string; caret: number }`.
  `renderAnnotations()` dessine, quand `annotation.id === editing.id`, une barre
  verticale à `rect.x + padX + ctx.measureText(text.slice(0, caret)).width`,
  hauteur `fontSize * 1.2`, épaisseur `max(1, fontSize * 0.06)`, couleur du
  calque. Le caret vit dans le moteur de rendu — c'est la seule façon qu'il
  tombe au bon pixel quelle que soit l'échelle et la rotation de la fenêtre.
- **Capture clavier** : un `<input>` invisible (`absolute size-0 opacity-0`)
  dans `Preview`, focalisé pendant l'édition. Sa `value` reflète
  `annotation.text`, `selectionStart` donne l'index du caret. `onInput` →
  `patchAnnotation({ text })`, `onSelect`/`onKeyUp` → index. On récupère l'IME,
  la dictée et le clavier mobile sans les réécrire.
- `useShortcuts.isTyping()` (`useShortcuts.ts:29`) bloque déjà les raccourcis
  quand un `input` a le focus : flèches et `Delete` iront au texte, pas au
  calque. Rien à changer.
- Clignotement : état local dans `Preview`, 530 ms ; `editing` n'est passé à la
  scène que sur la phase visible. Sous `prefers-reduced-motion`, caret fixe.
- Fin d'édition : `Enter`, `Escape`, clic ailleurs, changement d'outil. **Texte
  vide au commit ⇒ le calque est supprimé** (pas de label fantôme invisible).
- Double-clic sur un label avec l'outil Select (`event.detail === 2` dans
  `onPointerDown`) rouvre la saisie.
- **`editing` ne doit jamais atteindre l'export** : `useExport` construit sa
  scène sans ce champ. Un test le verrouille (voir §7).

---

## 4. Label et badge : remplissage inversé

- `Annotation.invert: boolean` (défaut `false` — le rendu actuel ne bouge pas).
- `lib/color.ts` : ajouter
  `inkOn(hex, dark = '#07070A', light = '#FFFFFF'): string` —
  `luminance(hexToRgb(hex)) > 0.5 ? dark : light`. Remplace le ternaire en dur de
  `drawBadge` (`layers.ts:215`) : une seule règle de contraste dans le produit.
- `drawLabel()` (`layers.ts:222`) : `invert` ⇒ pastille remplie de
  `annotation.color`, sans contour, texte en `inkOn(color)`. Sinon, comportement
  actuel (fond `STAGE`, contour et texte à la couleur).
- `drawBadge()` (`layers.ts:200`) : le badge est déjà « rempli » ; `invert` donne
  la variante contour — cercle tracé sur fond `STAGE`, numéro à la couleur.
- `labelStyle: 'plain'` n'a pas de fond : `invert` y est sans effet, à
  documenter dans le commentaire de la fonction.
- `AnnotationStyle.tsx` : un `Toggle` « Filled » à côté du `Segmented` de style,
  visible pour `text` et `badge` uniquement.

---

## 5. Multi-sélection

- `useShots.ts` : `selectedAnnotationId: string | null` →
  `selectedLayerIds: string[]`, et `selectAnnotation(id)` →
  `selectLayers(ids, mode: 'replace' | 'toggle' | 'range')`. Conserver un dérivé
  `selectedLayerId` (l'unique sélectionné, sinon `null`) pour les cas à valeur
  unique du panneau de style.
- Canvas (`Preview.tsx:202-218`) : ⇧/⌘-clic bascule l'appartenance au lot.
- **Marquee** : glisser avec l'outil Select sur du vide trace un rectangle
  pointillé **en DOM** — c'est du chrome d'édition, pas de l'artwork, donc il n'y
  a pas de second chemin de rendu ici. Au relâchement, sélectionne tout nœud dont
  `bounds()` croise le rectangle, dans l'espace non tourné de la fenêtre
  (`inWindow`, déjà là `Preview.tsx:141`). Masqués et verrouillés exclus.
- Déplacement : `onUpdate` devient `onTranslate(shotId, ids, dx, dy)`, servi par
  une action `translateLayers` dans `useShots` (un seul `patchLayers`, un seul
  commit d'historique, coalescé comme aujourd'hui).
- `SelectionOverlay` : un cadre par nœud sélectionné ; **poignées seulement quand
  la sélection est unitaire**. Marquer le raccourci :
  `// ponytail: pas de redimensionnement multiple — le faire passerait par une
  boîte englobante et une mise à l'échelle relative de chaque rect`.
- `useLayerActions.ts` : `onDelete`, `onDuplicate`, `onNudge`, `onLayerMove`
  itèrent la sélection. `onEscape` la vide.
- `useShortcuts.ts` : ajouter `⌘A` (tout sélectionner dans le shot actif),
  `⌘G` (grouper), `⇧⌘G` (dégrouper).

---

## 6. Panneau Calques

Extraire **`src/components/LayersPanel.tsx`** de `AnnotateInspector.tsx` (qui
reste le composeur : liste + style + actions ; le fichier tient sous 400 lignes).

- Lignes récursives : un groupe affiche un chevron de repli (`collapsed`) et ses
  enfants indentés. La pile se lit toujours de haut en bas comme elle se dessine
  (dernier créé en tête), comme le commentaire actuel `AnnotateInspector.tsx:60`.
- Par ligne : badge de type (`KIND_LABEL`), nom, œil (`hidden`), cadenas
  (`locked`). Double-clic sur le nom ⇒ `input` en place, écrit `name`. Un nom
  vide retombe sur la dérivation actuelle (texte du label, sinon `KIND_NAME`).
- Sélection : clic = remplace, ⌘-clic = bascule, ⇧-clic = plage entre le dernier
  point d'ancrage et la ligne cliquée.
- **Drag & drop natif HTML5**, sur le modèle déjà en place dans
  `Filmstrip.tsx:32-62` (aucune dépendance à installer) : lignes `draggable`,
  `onDragOver` déduit la cible de la position Y du pointeur dans la ligne —
  quart haut = avant, quart bas = après, milieu d'un groupe = dedans — `onDrop`
  appelle `moveNodes`. Trait indicateur de dépôt, `aria-grabbed` sur la ligne
  saisie, et le repli clavier ⌘↑/⌘↓ existant reste la voie accessible.
- Réutiliser `Row` (`ui.tsx:203-223`, déjà `aria-pressed` + anneau d'accent) et
  `Section`. Panneau `w-72`, la liste défile.

---

## 7. Tests (Vitest, logique pure — `src/lib/__tests__/`)

- `tree.test.ts` — ordre de `flatten`, filtrage des masqués et héritage depuis un
  groupe masqué ; `moveNodes` refuse un groupe dans sa descendance ;
  `groupNodes`/`ungroup` en aller-retour.
- `draft.test.ts` — ⇧ aimante un segment à 0/45/90° en conservant sa longueur ;
  ⇧ carre une surface ; sous `MIN_DRAW` ⇒ `null` ; kinds ponctuels ⇒ rect nul.
- `color.test.ts` — `inkOn` rend une encre sombre sur `#FFD479`, claire sur
  `#A378FF`, avec un écart de luminance suffisant.
- `annotate.test.ts` (existant) — `bounds()` d'un label ignore `w`/`h` ;
  `hitTest` saute les verrouillés et les masqués.
- `render.test.ts` (existant) — le caret n'est dessiné que si `scene.editing` est
  posé ; les calques d'un groupe masqué n'apparaissent pas.
- `history.test.ts` (existant) — `signature()` change à la création d'un groupe.

---

## Ordre d'exécution

1. **Arbre** — `lib/tree.ts`, types, renommage `annotations` → `layers`, rendu et
   hit-test via `flatten`, `signature` via `nodeIds`. Aucun changement visible ;
   `pnpm test` et `tsc -b` verts avant de continuer.
2. **Tracé live** — `lib/draft.ts`, `snapTo45` exporté, scission de l'effet de
   rendu, suppression de l'aperçu pointillé.
3. **Texte** — clic, caret dans `renderScene`, input invisible, suppression du
   calque vide.
4. **`invert`** — `inkOn` dans `color.ts`, `drawLabel`/`drawBadge`, toggle.
5. **Multi-sélection** — état, ⇧-clic, marquee, overlay multiple, actions de
   calque.
6. **`LayersPanel`** — arbre, dnd, œil/cadenas/renommage, ⌘G/⇧⌘G/⌘A.
7. **Docs** — `CLAUDE.md` : bloc Architecture (`lib/tree.ts`, `lib/draft.ts`,
   `components/LayersPanel.tsx`), section Raccourcis (⌘A, ⌘G, ⇧⌘G, ⇧ pendant le
   tracé), et le nouveau modèle de calques dans Code Conventions.

Surveiller `Preview.tsx` : 374 lignes aujourd'hui, plafond projet à 400. Le
brouillon, le marquee et la saisie texte le feront déborder — extraire un hook
`useCanvasScene` (dimensionnement + boucle de rendu) au moment où ça dépasse.

---

## Vérification

```bash
pnpm exec tsc -b        # tsc --noEmit ne vérifie rien ici (config solution)
pnpm test
pnpm build
pnpm dev
```

Passage manuel dans `pnpm dev`, mode **Annotate** :

1. Tracer une flèche : la pointe et l'inclinaison sont visibles pendant le
   geste ; maintenir ⇧ l'aimante à l'horizontale, à la verticale et à 45°, et le
   relâchement de ⇧ en cours de tracé la libère.
2. Tracer un box avec ⇧ : carré. Sans ⇧ : libre.
3. Outil Texte, un clic : le caret clignote dans le canvas, la frappe s'affiche
   en direct au bon corps. `Escape` sur un texte vide ⇒ aucun calque créé.
   Double-clic sur un label existant ⇒ réédition.
4. Sur un label puis un badge, activer « Filled » : fond coloré, texte
   automatiquement noir sur `#FFD479`, blanc sur `#A378FF`.
5. ⇧-clic sur trois calques, puis glisser : les trois bougent ensemble ; ⌘G les
   groupe ; l'œil du groupe les masque tous ; le cadenas les rend
   inattrapables au clic et au marquee mais toujours sélectionnables dans le
   panneau.
6. Glisser une ligne du panneau dans un groupe, puis l'en ressortir ; ⌘Z ramène
   chaque étape une par une.
7. Glisser un rectangle de sélection sur du vide : prend tout ce qu'il touche,
   sauf masqués et verrouillés.
8. **⌘E pendant une saisie de texte** : le PNG exporté ne contient ni caret, ni
   cadre de sélection, ni marquee, et un groupe masqué en est absent.
9. Rejouer 1 → 8 sous 1100 px de large (inspecteur en feuille rétractable) et
   avec `rotateY` non nul (le caret et les cadres doivent suivre l'inclinaison).
