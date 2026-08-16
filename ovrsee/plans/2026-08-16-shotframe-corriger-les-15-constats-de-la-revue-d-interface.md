---
{
  "status": "open",
  "title": "shotframe — corriger les 15 constats de la revue d'interface",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — corriger les 15 constats de la revue d'interface

## Contexte

Une revue `better-interface` en mode `full` sur `/Users/sam/code/shotframe` a rendu
un verdict **Block** : 9 constats HIGH et 6 MEDIUM, mesurés dans le DOM rendu
(contrastes, focalisables, reflow au zoom, comportement clavier réel), pas déduits
du code seul.

Trois familles de causes ressortent :

1. **Le clavier n'est pas un chemin de première classe.** Les raccourcis à touche
   unique sont posés sur `window` avec `preventDefault()`, ce qui tue le
   défilement aux flèches partout ; le canvas — le sujet du produit — n'a ni nom,
   ni focus, ni équivalent clavier.
2. **Rien n'est annoncé.** Zéro région live : un export qui échoue et un export
   qui réussit sont indiscernables sans regarder le coin bas-droit.
3. **Deux tokens et deux écrans n'ont pas été mesurés.** `--color-dim` échoue le
   contraste sur le repli opaque, et les écrans de gestion n'ont aucun repli
   étroit — l'écran Styles perd du contenu de façon inatteignable à 200 % de zoom.

Résultat visé : verdict **Approve**, sans toucher à la direction artistique
« Afterglow » ni au chemin de rendu unique. Aucune dépendance ajoutée.

## Décisions arrêtées

| Question | Choix |
|---|---|
| Étendue | Les 15 constats du tableau. Les 6 LOW écartés par le plafond restent ouverts. |
| Chemin clavier canvas | Minimal : nommer + focaliser le canvas, cibles de poignées à 24 px. Pas de curseur virtuel. |
| `--color-dim` | Remonter la valeur du token, un seul endroit. |
| Reflow | Étendre `useNarrow()` aux écrans Styles, Batch et History. |

---

## 1 · Clavier et canvas — constats 2, 5, 8

**Une seule cause pour les constats 2 et 5** : les touches simples sont globales
parce que le canvas n'est pas focalisable. Le rendre focalisable règle les deux.

**`src/components/Preview.tsx`** — le `<canvas>` reçoit :
- `tabIndex={0}`, `role="img"`, un `aria-label` dérivé de la scène
  (cadre, fond, nombre de calques — tout est dans `scene.settings` et
  `flatten(shot.layers)` de `lib/tree.ts`) ;
- un `onKeyDown` qui appelle le nouveau handler focalisé (ci-dessous) ;
- un focus programmatique quand `interactive` passe à vrai et à l'arrivée d'un
  premier shot, pour que le comportement souris reste celui d'aujourd'hui.

**`src/hooks/useShortcuts.ts`** — scinder en deux :
- **Global sur `window`** : les combinaisons avec modificateur uniquement
  (`⌘E`, `⌘C`, `⌘Z`/`⇧⌘Z`, `⌘D`, `⌘A`, `⌘G`/`⇧⌘G`, `⌘↑`/`⌘↓`). WCAG 2.1.4 ne
  vise que les touches uniques, ces raccourcis restent en place.
- **Focalisé, exporté comme handler `onKeyDown` du canvas** : `r`, `1/2/3`,
  flèches, `⌫`/`Delete`, `Escape`. Plus aucun `preventDefault()` sur `window`
  pour ces touches → les flèches redéfilent l'inspecteur `overflow-y-auto`.
  « Active uniquement au focus » est l'une des trois échappatoires admises par
  2.1.4, aucun interrupteur à construire.
- `isTyping()` reste utile pour le global.

**`src/components/SelectionOverlay.tsx:65-76`** — les poignées gardent leur carré
visible de 9 px et gagnent une cible de 24 px par pseudo-élément
(`before:absolute before:-inset-[7px] before:content-['']`), avec
`pointer-events` sur le pseudo. Vérifier qu'aucune paire de poignées adjacentes
ne voit ses cibles se recouvrir sur une annotation minuscule.

**Focus invisible (constat 8)** — trois contrôles focalisables de moins de 2 px :
- `src/App.tsx:391-407` : les deux `<input type=file class="sr-only">` sont
  déclenchés par des boutons, donc `tabIndex={-1}` — ils sortent de l'ordre de
  tabulation sans rien perdre.
- `src/components/AnnotationStyle.tsx:90-96` : l'`<input type=color>` est le seul
  chemin clavier vers une couleur personnalisée. Le sortir de `size-0 opacity-0` :
  l'input occupe le `<label>` de 40 px avec `opacity-0` seul (taille réelle
  conservée), le `···` passe en fond du label. L'anneau `:focus-visible` de
  `index.css:117` devient visible sans autre changement.

## 2 · Annonces — constat 7

**`src/App.tsx:382-389`** — deux régions **montées en permanence** (une région
insérée après coup n'est pas annoncée de façon fiable) :
- `role="alert"` pour `failure ?? exporter.error ?? library.error ?? batch.error` ;
- `role="status"` pour `exporter.status`, plus un texte « Copied to clipboard »
  quand `exporter.copied` passe à vrai (`useExport.ts:31`).

Le placement visuel actuel (absolu, bas-droit) reste ; seul le balisage change.
`ui.tsx:301` (`ErrorNote`) garde son rôle de rendu.

**`src/components/BatchScreen.tsx:98-100`** — la barre de progression prend
`role="progressbar"` + `aria-valuenow/valuemin/valuemax` et `aria-label="Batch
render progress"`. Pas de région live sur le compteur : la barre suffit et ne
bavarde pas à chaque item.

## 3 · Couleurs et contraste — constats 1 et 6

**`src/index.css:59`** — `--color-dim: #767a8c` → **`#83879a`**.
Mesures du candidat contre tous ses fonds réels :

| Fond | `#767a8c` | `#83879a` |
|---|---|---|
| `--color-stage` | 4,73 | 5,65 |
| `--color-panel` (translucide) | 4,52 | 5,41 |
| `--color-panel-solid` (repli) | 4,45 ❌ | 5,32 |
| `bg-sunken` sur `panel-solid` | 4,09 ❌ | **4,89** |

C'est le plus petit pas qui passe 4,5:1 partout, y compris le pire cas
(placeholder sur `bg-sunken` sur le repli opaque). La hiérarchie
`dim < ink-soft (#9599a8) < ink` reste lisible.

**`src/components/BatchScreen.tsx:118-135`** — la tuile de lot :
- retirer `opacity-60` du `<button>`, le poser sur le seul `<img>` : le bandeau
  de statut et la case à cocher cessent d'être atténués ;
- bandeau `bg-stage/60` → **`bg-stage/85`**, comme les voiles déjà en place dans
  `HistoryScreen.tsx:89` et `ImportScreen.tsx:72` ;
- statut en `text-ink` dans les deux états (mesuré 11,96:1 sur screenshot blanc).
  L'état retenu reste porté par la case et la bordure — le `text-dim` actuel
  tombait à 1,17:1, il ne portait rien.

## 4 · Mise en page et reflow — constats 3 et 4

**`src/hooks/useShortcuts.ts:119`** — `useNarrow()` existe déjà et est appelé une
fois dans `App.tsx:53`. Passer `narrow` aux trois écrans de gestion, comme il
l'est déjà à `EditorScreen`.

- **`StylesScreen.tsx:40`** : `grid-cols-[236px_1fr_620px]` → une seule colonne
  sous le point de rupture, les deux `<aside>` empilés sous la colonne centrale,
  `overflow-hidden` remplacé par `overflow-y-auto` sur le conteneur.
- **`BatchScreen.tsx:94,167`** : `flex` → `flex-col` en étroit, le panneau
  `w-[316px] shrink-0` passe pleine largeur sous la grille ; grille `grid-cols-4`
  → `grid-cols-2`.
- **`HistoryScreen.tsx:77`** : `grid-cols-4` → `grid-cols-2` en étroit.

**`src/components/ImportScreen.tsx:31,33`** :
- l'écran s'ancre sous la barre haute (`absolute inset-x-0 top-[58px] bottom-0`,
  le motif déjà utilisé par `EditorScreen.tsx:128` et les trois autres écrans) —
  aujourd'hui il est en `h-full` et se centre sur le viewport entier, d'où le
  titre qui chevauche la barre ;
- `h-[372px]` → `min-h-[372px]`, et `overflow-y-auto` sur le conteneur pour que
  le centrage flex ne rende plus le débordement haut inatteignable.

## 5 · Structure du document — constats 10 et 12

- **`index.html:2`** : `lang="fr"` → `lang="en"`. Toute la copie visible est en
  anglais.
- **`src/App.tsx`** : envelopper la zone d'écran (le bloc conditionnel après
  `<TopBar>`) dans un `<main>`.
- **`src/components/ui.tsx:92-99`** : `Section` rend son titre en `<h2 className="t-mono-label">`
  au lieu de passer par `MonoLabel`. **Ne pas** changer `MonoLabel` lui-même : il
  sert aussi d'étiquette simple (`Inspector.tsx:197`, `Slider` en `ui.tsx:159`).
  22 usages de `<Section>` héritent du titre sans modification.
- `ImportScreen.tsx:40` garde le seul `<h1>`.

## 6 · Copie — constats 11, 13, 14

**Noms accessibles en français (constat 11)** — traduire les cinq :
`AnnotationStyle.tsx:141` (`Inverser le fond et le texte` → **`Invert`**, le
libellé visible doit ouvrir le nom accessible : WCAG 2.5.3), `App.tsx:398,406`,
`TextInput.tsx:49`, `LayersPanel.tsx:175`.

**Messages d'erreur en français (extension du constat 14)** — 7 chaînes
utilisateur en français, découvertes à la préparation du plan :
`lib/image.ts:62`, `lib/store.ts:42,99`, `hooks/useExport.ts:44,57`,
`hooks/useImageInput.ts:40,48`, `hooks/useBatch.ts:69`. Les traduire **et** les
tourner en instruction plutôt qu'en constat d'échec
(« Import impossible » → « Couldn't read that file. Try a PNG or JPEG. »).

**Cohérence (constat 14)** :
- `Inspector.tsx:405-406` (`PNG`/`WebP`) et `BatchScreen.tsx:212-213`
  (`png`/`webp`) : une seule casse pour le même réglage.
- `HistoryScreen.tsx:66-73` : le bouton de tri est libellé par son état courant
  (`newest`) — le libeller par ce qu'il montre (`Newest first`), l'icône portant
  déjà le sens.
- `Inspector.tsx:365` : `placeholder="exemple.com"` → `example.com`.
- Notation des raccourcis : `AnnotateInspector.tsx:102,117,125,131` utilise des
  parenthèses, `TopBarActions.tsx:61,67` non. Choisir une forme, l'appliquer.

**États vides (constat 13)** :
- `ImportScreen.tsx:78-83` : les quatre boîtes vides se lisent comme un
  chargement bloqué. Sans export, remplacer la grille par une ligne qui oriente
  (« Your exports show up here ») ; garder les emplacements dessinés dès qu'il y
  a au moins un export.
- `HistoryScreen.tsx:99-102` : état vide qui dit ce qu'est l'endroit et pointe
  vers l'action, plutôt que « 0 of 0 exports ».

## 7 · Confirmation destructive — constat 9

**`src/components/HistoryScreen.tsx:111`** — `Purge the oldest` supprime sans
retour, deux mots après « there is no copy anywhere else ». Ajouter une
confirmation `window.confirm` nommant la conséquence, sur le modèle exact de
`App.tsx:203-209` (`newSession`), qui confirme déjà pour une action *moins*
destructive. Pas de composant modale : le projet n'en a pas et n'en a pas besoin
pour deux appels.

## 8 · Typographie — constat 15

`CLAUDE.md` fixe l'échelle : « Rien sous 10px », et `index.css:204` réserve
`t-mono-micro` à la surimpression sur vignette. Onze usages de 9 px enfreignent
l'un ou l'autre.

- `t-mono-micro` (`index.css:205-208`) : 9 px → 10 px.
- `font-mono text-[9px]` dans `Inspector.tsx:119,140,276`,
  `AnnotationStyle.tsx:58,126`, `Presets.tsx:26`, `BatchScreen.tsx:132` → passer
  à `t-mono-label` (10 px) ou 10 px selon la densité de la case ; vérifier
  qu'aucun libellé de tuile ne se coupe à 10 px (les grilles `grid-cols-4` et
  `grid-cols-5` de l'inspecteur sont les plus serrées).
- Si le 9 px est finalement assumé quelque part, c'est `CLAUDE.md` qu'il faut
  corriger, pas le code — mais ne pas laisser les deux se contredire.

---

## Vérification

1. `pnpm exec tsc -b` puis `pnpm test` — la suite Vitest couvre `lib/` et le
   rendu headless ; aucun de ces changements ne touche `renderScene()`, elle doit
   rester verte sans modification.
2. `pnpm dev`, puis sur l'app :
   - **Clavier** : Tab depuis la barre haute — les deux inputs fichier ne doivent
     plus apparaître dans l'ordre ; l'anneau de focus doit être visible sur le
     sélecteur de couleur personnalisée. Focus dans l'inspecteur (outil BG, qui
     déborde), `↓` doit défiler le panneau. Focus sur le canvas, `r` doit
     régénérer le fond et `↓` déplacer le calque sélectionné.
   - **Annonces** : exporter, puis vérifier que la région `role="status"` contient
     le nom de fichier ; provoquer une erreur (import d'un `.json` invalide comme
     fond) et vérifier `role="alert"`.
   - **Reflow** : `document.documentElement.style.zoom='2.35'` sur les écrans
     Styles, Batch et History — `document.documentElement.scrollWidth` ne doit
     pas dépasser `clientWidth`, et aucun rect d'élément ne doit sortir de
     `scrollWidth` (c'est la mesure qui a produit le constat 3 : colonne centrale
     à 56 px, 334 px d'aperçu hors scroll).
   - **Import à viewport court** : zoom 2×, le `<h1>` ne doit plus chevaucher la
     barre haute et le badge ⌘V doit rester atteignable.
3. **Contraste** — re-mesurer les paires rendues après le changement de token,
   avec le même script que la revue : placeholder de recherche
   (`HistoryScreen.tsx:63`) ≥ 4,5:1, et statut d'une tuile de lot non retenue
   par-dessus un screenshot blanc ≥ 4,5:1.
4. Relancer la revue : `/interfaces:better-interface full shotframe`.

## Hors périmètre

Les 6 constats LOW écartés par le plafond de 15 restent ouverts : `aria-valuetext`
sur les sliders (`ui.tsx:162`), renommage de calque en double-clic seulement
(`LayersPanel.tsx:191`), `--ease-out-ui` défini puis jamais utilisé
(`index.css:77`), `transition-all` sur le curseur du Toggle (`ui.tsx:197`),
« Add a color » `disabled` en permanence (`StylesScreen.tsx:139`), hexadécimaux
hors tokens (`TopBarActions.tsx:46`, `ui.tsx:67,218`, `SelectionOverlay.tsx:57`).
