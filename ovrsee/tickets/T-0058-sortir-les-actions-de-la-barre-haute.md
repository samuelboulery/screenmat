---
{
  "id": "T-0058",
  "titre": "Sortir les actions de la barre haute",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "ui",
    "navigation"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0056",
  "plan": "2026-08-16-shotframe-refonte-de-la-navigation-harmonisation-des-etats-s.md"
}
---

## Contexte

`TopBarActions` rend quatre jeux de boutons selon l'écran : la barre change de
contenu et de largeur à chaque navigation, et l'action primaire (Export) vit
loin du canvas. T-0045 avait déjà descendu dimensions, undo/redo et nouvelle
session dans le filmstrip ; le reste suit la même règle — une action vit près de
ce qu'elle manipule.

## Critères d'acceptation

- [ ] `src/components/TopBarActions.tsx` est supprimé, `TopBar` n'accepte plus
      de `children`.
- [ ] Copy et Export vivent dans le filmstrip, à droite du groupe document,
      Export en bouton primaire ; le libellé tombe sous 1180 px, l'icône reste.
- [ ] Batch : Cancel, Export all et « N selected · M files out » vivent au pied
      du panneau de droite, visibles sans scroll même quand la liste défile.
- [ ] Styles : « Export .json » dans l'en-tête de la colonne détail, « Save
      style » au pied de la colonne liste, près de « Import .json ».
- [ ] History : le compteur d'exports et « New shot » vivent dans l'en-tête de
      l'écran.
- [ ] La barre haute a la même largeur sur les quatre écrans.
