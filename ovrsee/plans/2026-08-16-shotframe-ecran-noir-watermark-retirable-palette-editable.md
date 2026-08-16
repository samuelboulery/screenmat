---
{
  "status": "open",
  "title": "shotframe — écran noir, watermark retirable, palette éditable",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — écran noir, watermark retirable, palette éditable

## Contexte

Suite de la session précédente, qui a rendu les styles éditables et supprimables.
Trois manques et un bug restent, tous constatés par l'utilisateur en usage réel :

1. **Écran noir.** Rouvrir un export depuis l'historique éteint le canvas ; de
   même après un changement de style. Rien ne s'affiche, aucun message.
2. Un watermark déposé ne peut plus être retiré.
3. La palette d'un style ne s'enrichit pas : la tuile « + » est `disabled`.

Un audit de l'application a par ailleurs été demandé. Il figure en fin de plan,
avec ce qu'il a confirmé et ce qu'il a fallu écarter après vérification.

## 1. L'écran noir — une seule cause, deux portes

`settings.saturation === undefined` → `background.ts:49` calcule
`saturation(...color) * undefined` → NaN → `css()` produit
`rgba(NaN, NaN, NaN, .75)` → `addColorStop` jette une `SyntaxError` →
`renderScene` s'interrompt → le canvas reste noir, et chaque frame rejoue
l'exception. Les champs `saturation`/`contrast` ont été ajoutés en T-0018 : tout
ce qui a été persisté avant leur arrivée les ignore.

**Porte encore ouverte** — `App.tsx:177`, `reopen()` fait
`setSettings(entry.settings)` sur une entrée relue d'IndexedDB, sans validation.
C'est le chemin « je reviens sur une image de l'historique ». Correctif :

```ts
setSettings(parseSettings(entry.settings))   // lib/styles.ts, déjà écrit et testé
```

Une fois cette ligne posée, la seconde porte se referme d'elle-même : le
changement de style noircissait l'écran parce que les réglages globaux étaient
déjà contaminés par une réouverture — `patch()` est une fusion partielle, elle
propage l'`undefined` qu'elle trouve. Les styles, eux, sont déjà normalisés au
chargement (`normalizeStyle`, session précédente).

**Filet de sécurité** — `useCanvasScene.ts:85` appelle `renderScene` sans
garde. Une exception y tue la frame en silence : pas de message, pas de trace
visible, un canvas noir définitif. Le hook attrape, retient le message dans un
état et l'expose ; `Preview.tsx` l'affiche en surimpression sur le canvas. Aucun
câblage de prop à traverser — l'erreur s'affiche là où le rendu a échoué, ce qui
vaut pour l'éditeur comme pour l'aperçu de l'écran Styles. Attraper ne veut pas
dire avaler : sans message lisible, ce filet ne vaudrait pas mieux que le bug.

## 2. Retirer un watermark

`useSideFile.ts:76` sait poser un logo, rien ne sait l'enlever, et
`App.tsx:367` garde `if (activeStyle?.watermark)` — l'état ne redescend jamais à
`undefined`.

Bouton `Remove logo` sous la tuile de dépôt, visible seulement quand un logo est
présent, en `text-danger`. Le handler retire la clé plutôt que de poser
`undefined` :

```ts
const { watermark: _drop, ...rest } = activeStyle
styles.patch(rest)
```

`useStyleActions.ts:32` remet déjà `watermarkImage` à `null` quand le champ
disparaît : rien d'autre à défaire. Les six boutons de position se regrisent
tout seuls (fait la session précédente).

`opacity` et `size` restent non exposés — hors demande.

## 3. Palette éditable

Décidé avec l'utilisateur : **ajouter, retirer et modifier**, et **figer
automatiquement** la palette échantillonnée dès la première édition — une
palette qui se recalcule à chaque screenshot ne peut pas s'éditer.

La logique va dans `src/lib/styles.ts`, pure et testable, à côté de
`parsePalette` qui pose déjà le plafond de 8 accents :

```ts
withAccent(palette, color)        // ajoute, ignore au-delà de 8
withoutAccent(palette, index)     // retire un accent, jamais la base
withColor(palette, index, color)  // index -1 = la base
```

Côté UI, le motif de sélecteur de couleur existe déjà et se reprend tel quel —
`AnnotationStyle.tsx:89-101` : un `<label>` qui porte un `<input type="color">`
transparent en surimpression, focalisable et de taille pleine. Aucune
dépendance, aucun composant nouveau à inventer.

- Chaque carré de la palette devient un `<label>` éditable ; un `×` au survol et
  au focus retire un accent (la base, elle, se modifie mais ne se retire pas).
- La tuile « + » perd son `disabled` et ouvre le même sélecteur ; elle se grise à
  8 accents, et faute de palette de départ (aucun shot chargé, aucune palette
  figée) avec l'infobulle qui le dit.
- Éditer alors que « Override sampled colors » est décoché écrit
  `palette: withX(active.palette ?? sampled, …)` dans le style : le toggle se
  coche de lui-même, puisqu'il ne fait que refléter la présence d'une palette.

À savoir, pas un bug : le fond ne dessine que `settings.shapes` taches, couleurs
prises en rotation (`background.ts:162`). Une 6ᵉ couleur ne se voit que si le
réglage Shapes est assez haut.

## 4. Les trois correctifs d'audit retenus

- **`export.ts:43`** — `URL.revokeObjectURL` est appelé dans la foulée de
  `link.click()`, alors que le téléchargement consomme l'URL de façon asynchrone :
  selon le navigateur, le fichier peut ne jamais arriver, sans un mot. Révoquer
  après un délai, avec un commentaire `ponytail:` nommant le plafond.
- **`useCanvasScene.ts:85`** — le filet décrit en partie 1.
- **`useExport.ts:59`** — le `setTimeout` de l'état « Copied » n'est jamais
  annulé. Le garder dans un ref, l'annuler au démontage et avant d'en armer un
  nouveau.

## 5. Ce que l'audit a écarté

Vérifié dans le code, ces trois constats remontés sont faux — ils sont notés ici
pour qu'on ne les re-signale pas :

- « `activeShotId` orphelin après suppression » : `useShots.ts:278` retombe déjà
  sur `shots[0] ?? null`.
- « `archive()` laisse un message de succès mensonger » : l'appel est bien dans
  le `try` de `useExport.ts:36-49`, qui remet `status` à `null`.
- « palette sans accent → NaN » : `background.ts:53` gère explicitement le cas,
  et `background.test.ts:41` le couvre.

L'audit reste partiel : il a porté sur les hooks, les écrans et `lib/`, sans
exécuter l'application. Les parcours non couverts par un test — annotations,
lot, zip — méritent une passe en navigateur, à faire dans un second temps.

## Fichiers touchés

- `src/App.tsx` — `parseSettings` dans `reopen`, handlers watermark et palette.
- `src/hooks/useCanvasScene.ts` + `src/components/Preview.tsx` — filet et
  affichage de l'erreur de rendu.
- `src/components/StylesScreen.tsx` — 278 lignes aujourd'hui, plafond projet 400.
  Les sections Watermark et Palette sortent dans `StyleWatermark.tsx` et
  `StylePalette.tsx` ; l'écran garde l'ossature et le câblage.
- `src/lib/styles.ts` — les trois helpers de palette.
- `src/lib/export.ts`, `src/hooks/useExport.ts` — les deux correctifs d'audit.

## Tests

`src/lib/__tests__/styles.test.ts` : les helpers de palette sont de la logique
pure et se testent en quelques lignes — ajout au-delà de 8 ignoré, retrait qui
ne touche jamais la base, modification par index. Le reste est du câblage React,
que le projet ne teste pas (pas de framework DOM ici, et c'est un choix).

## Vérification

```bash
pnpm exec tsc -b
pnpm test
pnpm dev
```

Dans le navigateur, dans cet ordre :

1. **Écran noir, chemin historique** : écrire dans IndexedDB une entrée
   d'historique dépourvue de `saturation`/`contrast` (comme la version d'avant
   T-0018 l'aurait écrite), la rouvrir depuis l'écran History → l'image
   s'affiche, la console reste muette. Avant correctif : canvas noir et
   `SyntaxError: … rgba(NaN, NaN, NaN, 0.75)`.
2. **Filet** : forcer une scène invalide → un message lisible s'affiche
   sur le canvas au lieu du noir silencieux.
3. **Watermark** : déposer un logo, le voir dans l'aperçu, `Remove logo` → il
   disparaît de l'aperçu, les positions se regrisent, et il n'est pas revenu
   après rechargement.
4. **Palette** : « + » → une couleur s'ajoute, l'aperçu change (monter Shapes si
   besoin) ; cliquer un carré le modifie ; `×` le retire ; le toggle Override
   s'est coché seul ; tout survit au rechargement. Le « + » se grise au 8ᵉ accent.
5. **Export** : exporter un PNG → le fichier arrive bien dans les téléchargements.
6. Reprendre le parcours styles de la session précédente (éditer, Update,
   supprimer) pour vérifier qu'il n'a pas régressé.
