---
{
  "id": "T-0031",
  "titre": "Reflow : repli étroit des écrans de gestion et écran Import",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "a11y",
    "layout"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0026",
  "plan": "2026-08-16-shotframe-corriger-les-15-constats-de-la-revue-d-interface.md"
}
---

## Contexte

**Constat 3** — l'écran Styles est une grille fixe `236px 1fr 620px` sous
`overflow-hidden`, sans aucun repli étroit. Mesuré : à zoom 1,6× la colonne
centrale — nom du style, filigrane, palette, réglages — tombe de 648 px à
**84 px** ; à 2,35× (≈ 200 % sur un 1280) elle fait 56 px, le document déborde
de 305 px et **334 px de la colonne d'aperçu sortent du scroll**, donc
inatteignables. Batch et History partagent le motif : aucun repli.

**Constat 4** — l'écran Import est en `h-full` et se centre sur le viewport
entier, sans tenir compte des 58 px de la barre haute, avec une dropzone
`h-[372px]` fixe. Capture à viewport court : le `<h1>` chevauche le badge LOCAL
de la barre, le haut de la dropzone et le badge ⌘V sont coupés, et `scrollY`
reste à 0 — le centrage flex rend le débordement haut inatteignable.

`useNarrow()` existe déjà et sert l'éditeur ; les trois écrans de gestion ne
l'ont jamais reçu.

## Critères d'acceptation

- [ ] À zoom 2,35× sur Styles, Batch et History : `scrollWidth` ne dépasse pas
      `clientWidth`, et aucun rect d'élément ne sort du `scrollWidth`.
- [ ] Sous le point de rupture, les deux `aside` de l'écran Styles s'empilent
      sous la colonne centrale et tout le contenu reste atteignable au scroll.
- [ ] À zoom 2×, le titre de l'écran Import ne chevauche plus la barre haute et
      le badge ⌘V reste atteignable.
- [ ] Au-dessus du point de rupture, les quatre écrans sont visuellement
      inchangés.
