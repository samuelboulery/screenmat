---
{
  "id": "T-0056",
  "titre": "Refonte de la navigation et des états sélectionnés",
  "type": "epic",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "xl",
  "tags": [
    "ui",
    "navigation",
    "design-system"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-refonte-de-la-navigation-harmonisation-des-etats-s.md"
}
---

## Contexte

`App.tsx` porte deux états — `view` (editor/styles/history) et `mode`
(compose/annotate/batch) — pour cinq destinations réelles. « Editor » est à la
fois le parent de Compose et Annotate et leur voisin dans la barre ; choisir un
mode force `onView('editor')`. Le rail gauche veut dire deux choses : un
instrument en Annotate, une catégorie de sections de l'inspecteur en Compose. Et
la barre haute mélange identité, navigation et actions de l'écran courant, donc
son contenu change à chaque écran.

Trois symptômes d'une même cause, dont l'utilisateur voit surtout le dernier :
au moins trois langues visuelles cohabitent pour dire « ceci est sélectionné ».

## Critères d'acceptation

- [ ] Quatre destinations : Edit · Batch · Styles · History, un seul état de
      navigation dans `App.tsx`.
- [ ] La barre haute ne porte que l'identité et la navigation : sa largeur ne
      bouge plus d'un écran à l'autre.
- [ ] Deux recettes de sélection exactement, définies une fois dans `ui.tsx`.
