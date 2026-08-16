---
{
  "id": "T-0043",
  "titre": "Palette d'un style éditable",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "ui",
    "styles",
    "palette"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-ecran-noir-watermark-retirable-palette-editable.md"
}
---

## Contexte

La tuile « + » de la section Palette est `disabled` (`StylesScreen.tsx:173`) :
une palette figée se prend telle qu'échantillonnée, ou pas du tout. On ne peut
ni ajouter une couleur de marque, ni corriger celle que l'échantillonnage a
sortie.

Ajouter, retirer et modifier. La logique va dans `lib/styles.ts`, pure, à côté
de `parsePalette` qui pose déjà le plafond de 8 accents. Le sélecteur de couleur
existe et se reprend tel quel : `AnnotationStyle.tsx:89-101`, un `<label>`
portant un `<input type="color">` transparent, focalisable et de taille pleine —
aucune dépendance à ajouter.

Éditer alors que « Override sampled colors » est décoché fige la palette
échantillonnée dans le style, et le toggle se coche de lui-même : une palette
qui se recalcule à chaque screenshot ne peut pas s'éditer.

## Critères d'acceptation

- [ ] Le « + » ajoute une couleur à la palette du style ; l'aperçu en tient
      compte.
- [ ] Cliquer une couleur existante la modifie ; un `×` retire un accent.
- [ ] La couleur de base se modifie mais ne se supprime pas.
- [ ] Éditer sans override actif fige la palette et coche le toggle.
- [ ] Le « + » se grise au 8ᵉ accent, et faute de palette de départ.
- [ ] Les trois helpers sont couverts par un test dans
      `src/lib/__tests__/styles.test.ts`.
