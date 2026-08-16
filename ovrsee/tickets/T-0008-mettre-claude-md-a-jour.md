---
{
  "id": "T-0008",
  "titre": "Mettre CLAUDE.md à jour",
  "colonne": "revue",
  "priorite": "basse",
  "charge": "xs",
  "tags": [
    "docs"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-annotation-rendu-live-texte-au-clic-couleurs-inver.md",
  "epic": "T-0001"
}
---

## Contexte

`CLAUDE.md` décrit l'arborescence `src/`, les conventions de code et les
raccourcis. Après la refonte, trois modules et un composant manquent, le modèle
de calques a changé, et quatre raccourcis ne sont documentés nulle part.

## Critères d'acceptation

- [ ] Le bloc Architecture cite `lib/tree.ts`, `lib/draft.ts` et
      `components/LayersPanel.tsx`.
- [ ] Code Conventions décrit l'arbre de calques et le fait que le tracé en cours
      et le caret passent par `renderScene`, pas par le DOM.
- [ ] La section Raccourcis liste ⌘A, ⌘G, ⇧⌘G et ⇧ pendant le tracé.
