---
{
  "status": "open",
  "title": "shotframe — allègement de la barre haute, repère du shot actif, dialogue maison, favicon",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — allègement de la barre haute, repère du shot actif, dialogue maison, favicon

## Contexte

Cinq retours issus d'une passe visuelle sur l'écran Compose
(`Screenshot 2026-08-16 at 20.17.02.png`) :

1. **Barre haute surchargée.** Les 58 px du haut portent aujourd'hui la marque,
   le badge LOCAL, les 3 modes, le bouton « New session », les 3 vues, les
   dimensions de sortie, undo/redo, Copy et Export. Trois de ces éléments
   n'appartiennent pas à la navigation : ils décrivent ou manipulent le
   *document*. Ils descendent dans le filmstrip flottant, avec le reste du
   chrome d'édition.
2. **Aucun repère du shot actif** sur le canvas dès qu'une composition
   multi-shot (`stack` / `side` / `tilt3d`) affiche plusieurs fenêtres : seule
   la vignette du filmstrip porte `ring-selected`. Sur le canvas, rien ne dit
   quelle fenêtre reçoit les réglages.
3. **Le logo n'est pas cliquable.** Retour à l'accueil impossible sans vider
   la session par le bouton dédié.
4. **`window.confirm()` natif** à trois endroits — une boîte système grise au
   milieu d'une DA « Afterglow ».
5. **Pas de favicon** : `index.html` n'a aucun `<link rel="icon">` et `public/`
   ne contient que les polices.

Résultat visé : une barre haute réduite à la navigation et aux deux actions de
fin de course, un canvas qui désigne sa fenêtre active sur n'importe quel fond,
et zéro chrome de navigateur dans les moments de décision.

## Contraintes du projet à respecter

- `renderScene()` reste le **seul** chemin de rendu. Le repère du shot actif est
  du **chrome d'édition en DOM** — comme `SelectionOverlay` — donc absent de
  l'export. Ne rien ajouter dans `src/lib/render.ts`.
- Aucune dépendance nouvelle. Le dialogue s'appuie sur l'élément **natif
  `<dialog>`** (focus trap, `Esc`, backdrop, `::backdrop` — gratuits).
- Toute icône passe par `src/components/icons.tsx`, jamais par un import direct
  de `lucide-react`.
- Aucun appel réseau : le favicon est un fichier local dans `public/`.
- Commentaires en français, code en anglais. TypeScript strict, pas de `any`.

---

## 1. Barre haute → filmstrip

### `src/components/TopBar.tsx`
- La marque `shotframe` (l. 80) devient un `<button type="button">` avec
  `onHome`, `title`/`aria-label` « Back to start ». Style visuel inchangé
  (`text-[15px] font-bold tracking-tight`), `hover:text-accent-ink` pour dire
  qu'elle se clique. Rendue en `<span>` non cliquable quand `showModes` est
  faux (écran d'import : il n'y a nulle part où revenir).
- Supprimer l'`IconButton` « New session » (l. 100-102) et la prop
  `onNewSession` ; ajouter la prop `onHome: () => void`.
- L'import de `NewSessionIcon` sort de ce fichier.

### `src/components/TopBarActions.tsx`
- Branche compose/annotate (l. 53-81) : ne restent que **Copy** et **Export**.
  Retirer le `<span className={META}>` des dimensions et les deux `IconButton`
  undo/redo.
- Retirer les props devenues inutiles : `output`, `canUndo`, `canRedo`,
  `onUndo`, `onRedo`, et les imports `UndoIcon` / `RedoIcon`. Les autres
  branches (batch, styles, history) et la constante `META` restent en place —
  `META` sert encore aux branches batch et history.

### `src/components/Filmstrip.tsx`
Le panneau accueille un second groupe, à droite du hint, séparé par le même
filet `h-7 w-px bg-hairline` déjà utilisé (l. 84) :

```
[◧][◧][+]  │  ⌘V to add · drag to reorder  │  ↶ ↷  │  3200 × 2400 · png  │  ⊞
```

- Nouvelles props, **toutes optionnelles** (le filmstrip sert aussi ailleurs et
  ne doit pas devenir obligatoire à câbler) :
  `output?: { width: number; height: number; format: Format } | null`,
  `canUndo?`, `canRedo?`, `onUndo?`, `onRedo?`, `onNewSession?`.
- Le groupe entier n'est rendu que si `onUndo` est fourni : un seul garde-fou,
  pas une condition par élément.
- Undo/redo : `IconButton` de `ui.tsx` avec `UndoIcon` / `RedoIcon`, labels
  « Undo (⌘Z) » / « Redo (⇧⌘Z) » — reprendre mot pour mot ceux de
  `TopBarActions` pour ne pas casser l'infobulle connue.
- Dimensions : `t-mono-micro text-dim whitespace-nowrap`, masquées sous 1180 px
  (`max-[1180px]:hidden`) comme le faisait `META`.
- New session : `IconButton` avec `NewSessionIcon`, label « New session ».
- `shrink-0` sur le groupe : c'est la liste de vignettes qui absorbe la
  contrainte de largeur (elle a déjà `min-w-0 overflow-x-auto`).

### `src/components/EditorScreen.tsx`
Faire transiter les six nouvelles valeurs de `App` jusqu'à `<Filmstrip>`
(l. 218-231). Ajouter au type `EditorScreenProps` : `output`, `canUndo`,
`canRedo`, `onUndo`, `onRedo`, `onNewSession`.

### `src/App.tsx`
- Le bloc `output` (aujourd'hui construit en ligne dans le JSX de
  `TopBarActions`, l. 266-274) devient un `useMemo` nommé `output`, dérivé de
  `geometry`, `scale` et `settings.format` — il alimente maintenant
  `EditorScreen`.
- `<TopBar onHome={newSession}>` remplace `onNewSession`.
- `<EditorScreen>` reçoit `output`, `history.canUndo/canRedo/undo/redo`,
  `onNewSession={newSession}`.

> Le mode **batch** garde ses dimensions et ses actions dans la barre haute :
> `BatchScreen` n'affiche pas de filmstrip, et il n'y a rien à annuler.

---

## 2. Repère du shot actif (multi-shot)

Aujourd'hui `Preview` calcule déjà tout ce qu'il faut : `geometry.windows`,
`selectedBox` (l. 178-182), `ratio`, et `geometry.radius`.

### `src/components/SelectionOverlay.tsx` — nouvel export `ShotRing`
Même fichier : c'est le même sujet (chrome de sélection en DOM), et il reste
sous 130 lignes.

```tsx
/** Repère de la fenêtre active. Bi-ton : le trait d'accent seul disparaît sur
 *  un artwork clair, la garde sombre le porte sur n'importe quel fond. */
export function ShotRing({ box, ratio, radius }: ShotRingProps) {
  const matrix = windowMatrix(box)
  const origin = applyMatrix(matrix, { x: box.x, y: box.y })
  return (
    <div
      className="pointer-events-none absolute top-0 left-0"
      style={{
        width: box.width * ratio,
        height: box.height * ratio,
        borderRadius: radius * ratio,
        transformOrigin: '0 0',
        transform: `matrix(${matrix[0]}, ${matrix[1]}, ${matrix[2]}, ${matrix[3]}, ${origin.x * ratio}, ${origin.y * ratio})`,
        boxShadow:
          '0 0 0 1.5px rgba(7,7,10,.65), 0 0 0 3px #7DE2FF, 0 0 0 4.5px rgba(7,7,10,.65)',
      }}
    />
  )
}
```

Trois anneaux concentriques via un seul `box-shadow` : garde sombre → accent →
garde sombre. Le contraste tient aussi bien sur un fond mesh clair que sur la
scène noire, sans dépendre de la couleur de l'artwork. `box-shadow` plutôt que
`outline` : il suit `border-radius` partout et empile trois traits en une
propriété. Réutilise `windowMatrix` / `applyMatrix` de `lib/frame.ts`, déjà
couverts par `src/lib/__tests__/frame.test.ts` — l'inclinaison `tilt3d` est
donc suivie gratuitement.

### `src/components/Preview.tsx`
Monter `<ShotRing>` dans le `<div className="relative">` (avant les
`SelectionOverlay`, l. 377), sous condition :

```tsx
{scene.shots.length > 1 && selectedBox && geometry && ratio > 0 && (
  <ShotRing box={selectedBox} ratio={ratio} radius={geometry.radius} />
)}
```

`scene.shots.length > 1` : en layout `single` il n'y a rien à distinguer, et un
anneau permanent autour de l'unique fenêtre serait du bruit.

---

## 3. Dialogue de confirmation maison

### `src/components/ConfirmDialog.tsx` — nouveau fichier

Un hook `useConfirm()` qui renvoie `{ confirm, dialog }` :

- `confirm(request: ConfirmRequest): Promise<boolean>` — pose la demande en
  state, garde le `resolve` dans un `useRef`, appelle `showModal()`.
- `dialog` — le `<dialog ref>` à monter **une fois** dans `App`.
- `ConfirmRequest = { title: string; body: string; action: string; tone?: 'danger' }`.

Pourquoi le `<dialog>` natif : focus trap, restitution du focus, fermeture par
`Esc`, inertie du reste de la page et `::backdrop` sont dans la plateforme. En
réimplémenter la moitié en React serait la partie coûteuse et fausse.

Habillage aux tokens existants, sans nouveau token :

- `<dialog>` : `panel rounded-lg w-[380px] max-w-[calc(100vw-40px)] p-5
  text-ink backdrop:bg-stage/70` + `open:` non nécessaire (`showModal` suffit).
  Réinitialiser les marges par défaut du user-agent (`m-auto`).
- Titre : `t-card-title` dans un `<h2>`. Corps : `t-body text-ink-soft mt-2`.
- Pied : `mt-5 flex justify-end gap-2` — `<Button>` « Cancel » (secondary) et
  `<Button variant="primary">` portant le libellé d'action. Pour `tone:
  'danger'`, l'action prend `border border-danger/40 text-danger` en variante
  `secondary` plutôt que le dégradé d'accent : la DA réserve l'accent à
  l'action primaire, `#FF9A9A` au destructif.
- `onClose` du `<dialog>` résout `false` — c'est le chemin `Esc`, il ne doit pas
  laisser la promesse pendante.
- Le bouton de confirmation reçoit le focus initial via `autoFocus`, sauf en
  `tone: 'danger'` où c'est « Cancel » qui le prend : une suppression ne se
  valide pas à l'aveugle sur `Entrée`.

### Sites d'appel — les trois `window.confirm` disparaissent

| Fichier | Aujourd'hui | Devient |
|---|---|---|
| `src/App.tsx` l. 210-215 (`newSession`) | `window.confirm('Start a new session? …')` | `await confirm({ title: 'Start a new session?', body: 'The current shots and settings are cleared. Saved styles and history are kept.', action: 'Start over' })` |
| `src/App.tsx` l. 420 (suppression de style) | `window.confirm('Delete this style? …')` | `confirm({ title: 'Delete this style?', body: 'This cannot be undone.', action: 'Delete', tone: 'danger' })` |
| `src/components/HistoryScreen.tsx` l. 58-60 | `window.confirm('Delete the oldest exports? …')` | La confirmation **remonte dans `App`** : `onPurge={() => void confirmPurge()}` (l. 434). `HistoryScreen` perd `confirmPurge` et appelle `onPurge` directement. Un seul `<dialog>` monté, dans `App`. |

`newSession` devient `async` (le `useCallback` renvoie une `Promise<void>`) ;
les appelants — le logo et le bouton du filmstrip — l'enveloppent en
`() => void newSession()`.

---

## 4. Favicon

### `public/favicon.svg` — nouveau
SVG 32×32, autonome, sans police : un carré à coins arrondis `#07070A` portant
le glyphe de cadre de la marque, tracé en dégradé `#7DE2FF → #A378FF` (les deux
mêmes arrêts que `--gradient-accent`). Fond opaque et non transparent : l'icône
doit tenir dans un onglet clair comme sombre, exactement comme le reste de la
DA. Un seul fichier, pas de `.ico` ni de jeu multi-tailles — un SVG couvre tous
les navigateurs cibles d'un outil desktop.

### `index.html`
Ajouter dans le `<head>` :

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

---

## Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/components/TopBar.tsx` | logo cliquable, `onNewSession` → `onHome`, `IconButton` retiré |
| `src/components/TopBarActions.tsx` | dimensions + undo/redo retirés de la branche compose, props nettoyées |
| `src/components/Filmstrip.tsx` | groupe droit : undo · redo · dimensions · new session |
| `src/components/EditorScreen.tsx` | 6 props traversantes vers `Filmstrip` |
| `src/components/Preview.tsx` | montage de `ShotRing` |
| `src/components/SelectionOverlay.tsx` | nouvel export `ShotRing` |
| `src/components/ConfirmDialog.tsx` | **nouveau** — `useConfirm()` + `<dialog>` natif |
| `src/components/HistoryScreen.tsx` | `window.confirm` retiré |
| `src/App.tsx` | `useConfirm`, `output` mémoïsé, câblage `EditorScreen` / `TopBar` |
| `index.html` | `<link rel="icon">` |
| `public/favicon.svg` | **nouveau** |

Aucun fichier de `src/lib/` ni de `cli/` n'est touché : rien de tout cela
n'entre dans le rendu.

---

## Vérification

1. `pnpm exec tsc -b` — vert (le compilateur attrape les props supprimées de
   `TopBar` / `TopBarActions` restées câblées dans `App`).
2. `pnpm test` — la suite Vitest existante reste verte : elle ne couvre que
   `src/lib/` et `cli/`, aucun de ces fichiers ne bouge. Pas de nouveau test —
   la seule logique ajoutée (`ShotRing`) est une composition de `windowMatrix` /
   `applyMatrix`, déjà couverts par `frame.test.ts`.
3. `pnpm dev`, puis à l'écran :
   - **Barre haute** — ne restent que : `shotframe`, `LOCAL`, Compose/Annotate/
     Batch, Editor/Styles/History, Copy, Export.
   - **Filmstrip** — undo/redo grisés au chargement, actifs après un réglage ;
     les dimensions suivent le ratio et l'échelle ; le bouton new session ouvre
     le dialogue.
   - **Repère multi-shot** — coller 2 screenshots, passer en layout `side` puis
     `tilt3d`, cliquer une vignette : l'anneau saute à la bonne fenêtre, suit
     l'inclinaison en `tilt3d`, et reste lisible sur un fond clair
     (background `solid` blanc) comme sur un fond sombre.
   - **Export** — exporter en 2× et vérifier que ni l'anneau ni aucun chrome
     n'apparaît dans le PNG.
   - **Logo** — cliquer `shotframe` avec des shots chargés : dialogue, puis
     retour à l'écran d'import ; sans shot, le logo ne fait rien.
   - **Dialogue** — `Esc` ferme sans agir, `Tab` reste piégé dans la boîte, le
     focus revient au bouton d'origine après fermeture, et le bouton destructif
     (suppression de style, purge d'historique) n'a pas le focus initial.
   - **Favicon** — visible dans l'onglet, lisible en thème clair et sombre.
4. Contraste : vérifier l'anneau à l'échelle 1 sur les quatre presets de fond —
   c'est la garde sombre qui fait le travail, pas la teinte de l'artwork.
