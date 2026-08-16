---
{
  "id": "T-0040",
  "titre": "Écran noir à la réouverture d'un export",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "s",
  "tags": [
    "bug",
    "render",
    "history"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-ecran-noir-watermark-retirable-palette-editable.md"
}
---

## Contexte

Rouvrir un export depuis l'écran History éteint le canvas. `reopen()`
(`App.tsx:177`) fait `setSettings(entry.settings)` sur une entrée relue
d'IndexedDB, sans validation. Une entrée écrite avant l'arrivée de
`saturation`/`contrast` (T-0018) n'a pas ces champs : `undefined` traverse
`background.ts:49`, `css()` produit `rgba(NaN, NaN, NaN, .75)`, `addColorStop`
jette, `renderScene` s'arrête. Même famille que T-0039, autre porte d'entrée.

Les réglages ainsi contaminés se propagent : `patch()` étant une fusion
partielle, changer de style ensuite laisse l'`undefined` en place — d'où le
second symptôme, « je change de style et tout repasse en noir ».

`parseSettings` (`lib/styles.ts`) fait déjà exactement ce qu'il faut.

## Critères d'acceptation

- [ ] Rouvrir une entrée d'historique dépourvue d'un réglage ajouté depuis
      affiche l'image, sans exception en console.
- [ ] Après une telle réouverture, changer de style garde le rendu visible.
