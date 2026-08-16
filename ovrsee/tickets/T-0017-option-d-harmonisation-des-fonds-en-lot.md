---
{
  "id": "T-0017",
  "titre": "Option d'harmonisation des fonds en lot",
  "colonne": "backlog",
  "priorite": "haute",
  "charge": "s",
  "tags": ["batch", "couleur"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-nouvelle-session-fonds-harmonises-en-lot.md"
}
---

## Contexte

Le fond est dérivé de la palette de chaque screenshot : sur un lot issu d'un même
produit, un écran pâle et un écran très coloré sortent avec des fonds
d'intensités très différentes. L'override de palette par un style uniformise
tout et fait perdre la teinte propre à chaque écran ; il manque l'entre-deux.

## Critères d'acceptation

- [ ] Une case à cocher dans le panneau Batch aligne saturation et luminance des
      fonds du lot.
- [ ] La teinte de chaque palette est conservée — seule l'intensité bouge.
- [ ] Option décochée par défaut ; décochée, le rendu du lot est identique à
      aujourd'hui.
- [ ] `harmonizePalettes` est une fonction pure testée : cible atteinte, teinte
      conservée, gris et lot d'un seul élément sans division par zéro.
