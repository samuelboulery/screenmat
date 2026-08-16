---
{
  "id": "T-0060",
  "titre": "Sections repliables de l'inspecteur",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "s",
  "tags": [
    "ui",
    "editeur"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0056",
  "plan": "2026-08-16-shotframe-refonte-de-la-navigation-harmonisation-des-etats-s.md"
}
---

## Contexte

L'inspecteur unique porte neuf sections dans un panneau de 288 px. Sans repli,
il devient une colonne à défilement permanent. Le repli natif `<details>` fait
le travail sans état global ni dépendance.

## Critères d'acceptation

- [ ] `Section` (`src/components/ui.tsx`) accepte `collapsible` et rend alors
      `<details>/<summary>`, avec le même `t-mono-label` comme titre.
- [ ] Layers et le style du calque restent ouverts et non repliables : ils sont
      contextuels à une sélection.
- [ ] Frame et Background ouverts par défaut, les autres sections document
      fermées.
- [ ] Le repli s'ouvre au clavier et le focus reste visible (`:focus-visible`
      déjà en place).
- [ ] Un commentaire `ponytail:` note que l'état d'ouverture n'est pas persisté
      et nomme le chemin de mise à niveau (`localStorage`, comme
      `LAST_STYLE_KEY`).
