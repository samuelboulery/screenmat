---
{
  "id": "T-0061",
  "titre": "Deux recettes de sélection, une seule source",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "m",
  "tags": [
    "ui",
    "design-system"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0056",
  "plan": "2026-08-16-shotframe-refonte-de-la-navigation-harmonisation-des-etats-s.md"
}
---

## Contexte

Six façons de dire « sélectionné » cohabitent : `bg-raised text-white`
(Segmented, ToolRail), `border-accent/30 bg-accent/10` (Row, CheckRow),
`bg-accent/[.14] border-accent/45` (Tile), `ring-selected` (Swatch, Filmstrip),
`border-b border-accent` (nav), `bg-raised ring-1 ring-accent/60` (LayersPanel).
Trois d'entre elles se croisent dans un même panneau.

Deux niveaux suffisent : un commutateur (ce qui change de vue ou de réglage) et
un contenu sélectionné (ce sur quoi la prochaine action portera).

## Critères d'acceptation

- [ ] `ui.tsx` exporte `SWITCH_ON`, `SELECTED` et `SELECTED_DANGER`, et
      personne d'autre n'écrit ces chaînes : `grep` sur `bg-accent/` dans
      `src/components` ne renvoie plus rien hors `ui.tsx`.
- [ ] Commutateurs (Segmented, ToolRail, tuile de ratio) : `bg-raised
      text-white`.
- [ ] Contenu sélectionné (Tile accent, Row, ligne de calque, ligne de ratio du
      batch) : une seule recette accent, opacités comprises.
- [ ] Les vignettes de shot, les pastilles de couleur et le fond image gardent
      `ring-selected` : un fond teinté mentirait sur l'image ou la couleur.
- [ ] Les cases à cocher du batch ont une seule taille et une seule bordure
      d'état non coché.
- [ ] Toggle, repère de shot sur le canvas et indicateurs de dépôt de calque
      restent inchangés.
