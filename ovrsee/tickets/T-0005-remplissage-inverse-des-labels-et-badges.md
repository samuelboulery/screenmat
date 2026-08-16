---
{
  "id": "T-0005",
  "titre": "Remplissage inversé des labels et badges",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "s",
  "tags": [
    "annotate",
    "couleur",
    "a11y"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-annotation-rendu-live-texte-au-clic-couleurs-inver.md",
  "epic": "T-0001"
}
---

## Contexte

Un label n'existe qu'en une déclinaison : fond sombre, contour et texte à la
couleur du calque. Sur un screenshot clair, la version inverse — pastille pleine,
texte lisible dessus — est souvent la bonne, et elle manque.

`Annotation.invert: boolean` (défaut `false`, le rendu actuel ne bouge pas).
`lib/color.ts` gagne `inkOn(hex, dark, light)`, qui remplace aussi le ternaire de
contraste écrit en dur dans `drawBadge` : une seule règle de contraste dans le
produit.

## Critères d'acceptation

- [ ] Un toggle « Filled » apparaît dans `AnnotationStyle` pour `text` et `badge`
      seulement.
- [ ] Label inversé : pastille remplie de la couleur du calque, sans contour,
      texte automatiquement noir sur `#FFD479` et blanc sur `#A378FF`.
- [ ] Badge inversé : cercle en contour sur fond sombre, numéro à la couleur.
- [ ] `labelStyle: 'plain'` reste sans effet, documenté dans le commentaire.
- [ ] `src/lib/__tests__/color.test.ts` vérifie l'encre choisie par `inkOn` et
      l'écart de luminance obtenu.
