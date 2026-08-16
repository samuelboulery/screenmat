---
{
  "id": "T-0049",
  "titre": "Favicon",
  "colonne": "fait",
  "priorite": "basse",
  "charge": "xs",
  "tags": [
    "ui"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-allegement-de-la-barre-haute-repere-du-shot-actif.md"
}
---

## Contexte

`index.html` n'a aucun `<link rel="icon">` et `public/` ne contient que les
polices : l'onglet affiche l'icône par défaut du navigateur. Un outil qu'on
garde ouvert à côté d'un screenshot se repère à son onglet.

## Critères d'acceptation

- [ ] Un fichier local `public/favicon.svg`, sans appel réseau ni police
      embarquée, référencé depuis `index.html`.
- [ ] Le mark reprend le dégradé `#7DE2FF → #A378FF` sur un fond opaque
      `#07070A` : lisible en thème d'onglet clair comme sombre.
- [ ] Un seul fichier — pas de `.ico` ni de jeu multi-tailles.
