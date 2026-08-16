---
{
  "id": "T-0051",
  "titre": "Code mort et invariants tenus à la main",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "s",
  "tags": [
    "refactor"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-audit-global-shotframe-constats-et-plan-de-correction.md"
}
---

## Contexte

Trois constats de l'audit, tous vérifiés à la main :

- `mix()` (`src/lib/color.ts:62`) n'a aucune référence hors de sa définition,
  tests compris.
- `SKEW = 0.3` est déclaré deux fois — `src/lib/frame.ts:71` et
  `src/lib/render.ts:30` — et le commentaire de `frame.ts:69` *demande* de
  garder les deux valeurs égales. Un invariant tenu par la vigilance finit par
  céder.
- `type Point` est défini trois fois à l'identique (`draft.ts:12`,
  `frame.ts:76`, `handles.ts:9`).

## Critères d'acceptation

- [ ] `mix()` supprimé.
- [ ] `SKEW` exporté depuis `frame.ts` et importé par `render.ts` ; le
      commentaire qui réclamait l'égalité manuelle disparaît avec elle.
- [ ] Un seul `type Point`, dans `frame.ts` ; l'import existant de
      `Preview.tsx:12` continue de fonctionner.
- [ ] `pnpm exec tsc -b` et `pnpm test` verts ; une composition `tilt3d`
      exportée en 1× et 3× rend exactement comme avant.
