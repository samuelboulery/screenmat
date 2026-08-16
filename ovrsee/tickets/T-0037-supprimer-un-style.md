---
{
  "id": "T-0037",
  "titre": "Supprimer un style",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "s",
  "tags": [
    "ui",
    "styles"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-rendre-les-styles-editables-et-supprimables.md"
}
---

## Contexte

Un style enregistré ne se supprime pas. La couche données est pourtant
complète et inutilisée : `store.deleteStyle` (`lib/store.ts:78`) et
`library.removeStyle` (`useLibrary.ts:70`) sont écrits, exportés, et appelés par
personne. Il ne manque que la glu UI.

Bouton en bas de la fiche du style actif, en `text-danger` — `#FF9A9A` est la
couleur du destructif dans la DA, jamais l'accent — et confirmation native,
convention du projet (`App.tsx:208`, `HistoryScreen.tsx:59`).

## Critères d'acceptation

- [ ] Un bouton « Delete style » figure dans le panneau central, en couleur
      destructive.
- [ ] Il demande confirmation avant d'agir ; annuler ne supprime rien.
- [ ] Après confirmation le style quitte la liste et le panneau retombe sur
      « No style yet ».
- [ ] Après rechargement de la page, le style n'est pas revenu.
