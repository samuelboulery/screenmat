---
{
  "status": "open",
  "title": "shotframe — rendre les styles éditables et supprimables",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — rendre les styles éditables et supprimables

## Contexte

L'écran **Styles** est aujourd'hui presque en lecture seule. Seul le nom est
modifiable (`StylesScreen.tsx:74`). Le bloc « Locked in this style » est fait de
`<div>` statiques (`StylesScreen.tsx:160-177`) : cliquer sur Frame, Padding,
Grain ou Export ne fait rien. Et la suppression n'existe nulle part dans l'UI,
alors que toute la couche données est déjà là et testable :
`store.deleteStyle` (`src/lib/store.ts:78`) et `library.removeStyle`
(`src/hooks/useLibrary.ts:70`) sont écrits, exportés… et jamais appelés.

Objectif : depuis l'écran Styles, modifier les réglages d'un style sur place,
basculer dans l'éditeur pour un réglage fin qui revient dans le style, et
supprimer un style.

## Approche

### 1. Réglages éditables dans l'écran Styles

Remplacer le bloc statique `Locked in this style` (`StylesScreen.tsx:160-177`)
par les mêmes contrôles que l'Inspector, réutilisés tels quels depuis
`src/components/ui.tsx` — aucun nouveau composant :

| Réglage | Contrôle | Référence à copier |
|---|---|---|
| Frame | grille de `Tile` + `FRAME_ICON` | `Inspector.tsx:110-127` |
| Padding | `Slider` min 0 / max 0.2 / step 0.005 | `Inspector.tsx:145-153` |
| Grain | `Slider` min 0 / max 1 / step 0.05 | `Inspector.tsx:393-401` |
| Export | `Segmented` PNG / WebP | `Inspector.tsx:402-409` |

`FRAMES` (`Inspector.tsx:16`) passe en `export const` et est importé par
`StylesScreen` — la liste ne doit pas exister en double.

Nouvelle prop `onPatchSettings: (patch: Partial<Settings>) => void`. Câblage
dans `App.tsx` (bloc `StylesScreen`, ligne 347) :

```ts
onPatchSettings={(next) => {
  if (!activeStyle) return
  styles.patch({ ...activeStyle, settings: { ...activeStyle.settings, ...next } })
  patch(next)           // App.tsx:68 — garde l'éditeur en phase
}}
```

Le double écrit est voulu : `scene` (`App.tsx:91`) dérive de `settings`, donc
pousser le patch dans l'éditeur rend l'aperçu de droite juste **gratuitement**,
et il n'y a pas de second chemin de rendu. Un style est toujours appliqué quand
il est affiché au centre (le clic dans la liste passe par `styles.apply`), donc
les deux ne peuvent pas diverger.

Pas de bouton « Enregistrer » : l'écriture est immédiate, comme le champ nom qui
existe déjà. Titre de section « Locked in this style » conservé.

### 2. Bouton « Edit in editor »

Dans le panneau central, à côté du nom. Nouvelle prop `onEditInEditor: () => void`,
câblée dans `App.tsx` : `styles.apply(id)` puis `setView('editor')`.

**Le retour est obligatoire, sinon le bouton est un cul-de-sac** :
`useStyleActions.save()` (`useStyleActions.ts:54`) crée *toujours* un nouveau
style `Style N`, il n'écrase jamais l'actif. Ajouter :

```ts
const update = useCallback(() => {
  if (!activeStyle) return
  void library.saveStyle({ ...activeStyle, settings })
}, [activeStyle, library, settings])
```

exposé dans `StyleActions`, et rendu dans `Presets.tsx` : une tuile « Update »
à côté du `+` existant, visible seulement quand `activeStyleId` est non nul.
Chaîne de props déjà tracée par `onSaveStyle` : `App` → `EditorScreen` →
`Inspector:164` → `Presets`.

### 3. Suppression

Bouton `Delete style` en bas du panneau central, `variant="ghost"` +
`text-danger` + `DeleteIcon` (`icons.tsx:181`) — `#FF9A9A` est la couleur du
destructif dans la DA, pas l'accent. Prop `onDelete: (id: string) => void`,
câblée dans `App.tsx` avec la confirmation native, convention du projet
(`App.tsx:208`, `HistoryScreen.tsx:59`) :

```ts
onDelete={(id) => {
  if (window.confirm('Delete this style? This cannot be undone.')) {
    void library.removeStyle(id)
  }
}}
```

`removeStyle` remet déjà `activeStyleId` à `null` : le panneau central retombe
sur son état vide tout seul.

### 4. Deux no-op collatéraux, dans le même geste

- **Positions du watermark** (`StylesScreen.tsx:111`) : sans logo, `App.tsx:359`
  garde `if (activeStyle?.watermark)` et le clic ne fait rien. Ajouter
  `disabled={!active.watermark}` sur les six boutons — un bouton mort doit se
  voir mort.
- **Toggle « Override sampled colors »** (`StylesScreen.tsx:131`) : sans shot
  chargé, `shots.activeShot?.palette` est `undefined` et cocher n'a aucun effet
  (`App.tsx:367`). Ajouter une prop `disabled` à `Toggle` (`ui.tsx:182`, elle
  n'existe pas) et la passer `!sampled && !active.palette`.

La tuile « Add a color » reste `disabled` : hors périmètre.

## Fichiers touchés

- `src/components/StylesScreen.tsx` — l'essentiel : contrôles éditables, bouton
  éditeur, bouton suppression, deux `disabled`.
- `src/App.tsx` — câblage des trois nouvelles props (bloc ligne 347).
- `src/components/Inspector.tsx` — `export const FRAMES` + passage de
  `onUpdateStyle` à `Presets`.
- `src/components/Presets.tsx` — tuile « Update ».
- `src/hooks/useStyleActions.ts` — `update()`.
- `src/components/ui.tsx` — `disabled` sur `Toggle`.
- `src/components/EditorScreen.tsx` — un prop de plus à faire transiter.

Attention à `StylesScreen.tsx` : 219 lignes aujourd'hui, plafond projet 400.
Si l'ajout des contrôles fait déborder, extraire le panneau central en
`StyleDetails.tsx` plutôt que de laisser grossir.

## Tests

Pas de test ajouté : que du câblage React, et la règle du projet réserve les
tests à la logique pure (`src/lib/__tests__/`). Rien de nouveau n'atterrit dans
`src/lib/`.

## Vérification

```bash
pnpm exec tsc -b     # tsc --noEmit ne vérifie rien ici (fichier solution)
pnpm test
pnpm dev
```

Parcours manuel, dans cet ordre :

1. Charger un shot, `Save style` depuis Presets, aller sur **Styles**.
2. Cliquer le style : le panneau central s'ouvre, l'aperçu de droite s'affiche.
3. Bouger Padding et Grain, changer Frame et Export → l'aperçu de droite suit
   en direct.
4. Revenir sur **Editor** : les réglages de l'éditeur sont ceux qu'on vient de
   poser (pas de retour aux valeurs d'avant).
5. Recharger la page (F5), retourner sur Styles : les valeurs modifiées sont
   toujours là (IndexedDB).
6. `Edit in editor` → régler finement → tuile `Update` dans Presets → revenir
   sur Styles : la fiche reflète les nouveaux réglages, et **aucun** `Style N`
   en double n'est apparu dans la liste.
7. Sans logo déposé : les six positions de watermark sont grisées et
   inertes. Sans shot chargé : le toggle palette est grisé.
8. `Delete style` → confirmer → le style quitte la liste, le panneau central
   retombe sur « No style yet ». Recharger : il n'est pas revenu.
