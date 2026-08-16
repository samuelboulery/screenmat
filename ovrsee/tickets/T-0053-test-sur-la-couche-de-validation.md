---
{
  "id": "T-0053",
  "titre": "Test sur la couche de validation",
  "colonne": "en-cours",
  "priorite": "moyenne",
  "charge": "xs",
  "tags": [
    "test"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-audit-global-shotframe-constats-et-plan-de-correction.md"
}
---

## Contexte

`src/lib/parse.ts` porte les primitives dont dépendent `parseStyle` **et**
`parseScene` — les deux frontières de données externes du projet — et n'a aucun
test. C'est le seul module non couvert qui compte : `image.ts` et `store.ts`
demandent un DOM et IndexedDB, `noise.ts` et `random.ts` ne justifient pas de
test.

## Critères d'acceptation

- [ ] `src/lib/__tests__/parse.test.ts` couvre `num()` face à `NaN`, `Infinity`,
      `-Infinity`, `"3"` et `null` — chacun doit retomber sur le défaut.
- [ ] `oneOf()` sur une valeur hors liste, `isRecord()` sur un tableau et sur
      `null`, `clamp()` à ses deux bornes.
- [ ] Les tests décrivent le comportement attendu aux frontières, pas
      l'implémentation.
