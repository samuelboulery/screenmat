---
{
  "id": "T-0011",
  "titre": "Icônes du rail d'outils et de la barre haute",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "ui"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0009",
  "plan": "2026-08-16-shotframe-systeme-d-icones-unifie-passe-de-design.md"
}
---

## Contexte

Le rail affiche `FRM`, `BG`, `3D`, `TXT`, `BLUR` et huit abréviations
d'annotation en mono 9 px — illisibles sans le tooltip. La barre haute mélange
onglets texte et boutons `↺`/`↻`.

Le rail fait 56 px de large : l'icône y va seule, avec tooltip et nom
accessible. La navigation, elle, garde son mot — un onglet se lit, il ne se
devine pas.

## Critères d'acceptation

- [ ] `ToolRail.tsx` : 5 + 8 outils en icônes 20 px, état actif distinguable
      sans survol, Redact toujours en `--color-danger`, `aria-label` sur chaque
      bouton. Le commentaire de tête ne prétend plus qu'il n'y a pas d'icônes.
- [ ] `TopBar.tsx` : vues (Editor/Styles/History) et modes
      (Compose/Annotate/Batch) en icône + label.
- [ ] `TopBarActions.tsx` : plus de `↺`/`↻` ; undo/redo en `IconButton`, les
      actions de fin de course (Export, Copy…) gardent leur mot.
- [ ] Sous 1100 px, le rail horizontal tient dans la largeur sans recouvrement.
