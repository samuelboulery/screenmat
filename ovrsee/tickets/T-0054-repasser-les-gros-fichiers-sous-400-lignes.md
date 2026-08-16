---
{
  "id": "T-0054",
  "titre": "Repasser les gros fichiers sous 400 lignes",
  "colonne": "pret",
  "priorite": "basse",
  "charge": "m",
  "tags": [
    "refactor"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-audit-global-shotframe-constats-et-plan-de-correction.md"
}
---

## Contexte

Trois fichiers dépassent le plafond de 400 lignes posé par
`.claude/rules/shotframe-conventions.md` : `src/App.tsx` (503),
`src/components/Preview.tsx` (446), `src/components/Inspector.tsx` (425).

`App.tsx` est le cas réel : un seul composant, ~230 lignes de câblage suivies de
~230 de routage JSX. Les deux autres passent sous la barre en sortant des
fonctions et des tables déjà autonomes.

**Bloqué — à reprendre après la refonte de la navigation.** Le plan
`2026-08-16-shotframe-refonte-de-la-navigation-harmonisation-des-etats-s.md`
réécrit `App.tsx:44-45` (les états `view` × `mode`) et une partie
d'`EditorScreen`. Redécouper `App.tsx` avant que cette refonte ait atterri, ce
serait du travail jeté et un conflit garanti. Rouvrir ce ticket une fois la
refonte fusionnée, et recompter les lignes avant de découper : elle change
peut-être déjà la donne.

## Critères d'acceptation

- [ ] `src/hooks/useDocument.ts` porte les mémos `composed`, `scene`,
      `geometry`, `output` et les fonctions `patch`/`compose`.
- [ ] `src/hooks/useSessionActions.ts` porte `reopen`, `startBatch`,
      `newSession`.
- [ ] `describeScene()` et `marqueeStyle()` sortent de `Preview.tsx` ; les
      tables `RATIOS`/`LAYOUTS`/`BACKGROUNDS`/`DEPTHS` sortent d'`Inspector.tsx`.
- [ ] Les quatre fichiers touchés sont sous 400 lignes, et `App.tsx` ne garde
      que le routage de vue et le passage de props.
- [ ] Aucun changement de comportement : `pnpm test` vert, l'app se charge, un
      export 1× et 3× rend à l'identique.
