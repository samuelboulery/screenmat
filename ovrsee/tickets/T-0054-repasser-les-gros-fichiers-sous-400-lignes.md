---
{
  "id": "T-0054",
  "titre": "Repasser les gros fichiers sous 400 lignes",
  "colonne": "fait",
  "priorite": "basse",
  "charge": "m",
  "tags": [
    "refactor"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
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

La refonte de la navigation a atterri (`5b9acb6`) et a réglé `Inspector.tsx`
au passage — 425 → 362. Le découpage réel diffère donc du plan : `useDocument`
s'est scindé en deux (l'état d'un côté, ce qui s'en déduit de l'autre, sinon
`useStyleActions` créait un cycle), et le gros morceau de `Preview.tsx` s'est
révélé être le hit-test, pas les helpers d'affichage.

- [x] `src/hooks/useDocument.ts` porte l'état du document — `settings`,
      `composition`, `scale`, `backgroundImage`, `patch`, `compose`, `reset`.
- [x] `src/hooks/useScene.ts` porte ce qui s'en déduit : `composed`, `scene`,
      `geometry`, `output`.
- [x] `src/hooks/useStyleScreen.ts` porte les quinze gestes de l'écran Styles,
      qui noyaient le routage sous soixante lignes de JSX.
- [x] `src/lib/hit.ts` porte `windowAt`, `layerAt` et `inWindow` — logique
      pure, sortie d'un composant vers `lib/` où elle est testable, avec
      `src/lib/__tests__/hit.test.ts` (8 cas).
- [x] Plus aucun fichier au-dessus de 400 lignes : `Preview.tsx` 393,
      `App.tsx` 371.
- [x] Aucun changement de comportement, vérifié dans l'app : tracé d'une box,
      désélection puis re-sélection au clic, réglages de l'écran Styles,
      annulation. Zéro erreur console.
- [ ] **Reste** : `describeScene()` et `marqueeStyle()` sont toujours dans
      `Preview.tsx`. Les sortir n'était plus nécessaire pour passer sous la
      barre, et ils n'ont qu'un seul appelant.
