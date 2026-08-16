---
{
  "id": "T-0067",
  "titre": "Démarrage du CLI et lectures répétées de la porte machine",
  "colonne": "en-cours",
  "priorite": "moyenne",
  "charge": "s",
  "tags": [
    "perf",
    "cli",
    "mcp"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0062",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

`node cli/main.ts --help` prend 180 ms, dont 104 ms de `require('@napi-rs/canvas')`
— l'addon natif est chargé pour afficher un texte. `main.ts` importe `api.ts` au
sommet du fichier, donc toutes les branches paient la pile complète. La sonde
WebP de `dom-shim.ts:54`, elle, ne coûte qu'1 ms : elle reste.

Deux autres lectures se refont pour rien : `buildScene()` décode les shots en
série (`api.ts:116-127`), et `resolveStyle()` relit puis reparse tout
`~/.shotframe/styles/` à chaque appel (`styles-dir.ts:42-52`) — un lot de N shots
avec le même style paie N fois la même lecture.

Enfin `tsc --noEmit` ne vérifie rien dans ce dépôt, le piège est documenté mais
rien ne le rend injouable.

## Critères d'acceptation

- [x] `cli/main.ts` charge `api.ts` par `await import()` après le parsing des
      arguments. `time node cli/main.ts --help` : **95 ms** contre 180 ; `styles`
      idem. Les 50 ms visés supposaient un coût de démarrage nul : il reste le
      dépouillement des types de `main.ts` et de ses imports purs, et `node -e 0`
      coûte déjà 20 ms.
- [ ] `buildScene()` décode les shots par `Promise.all`.
- [ ] `resolveStyle()` sert un cache mémoire invalidé par le `mtime` du dossier :
      un style ajouté pendant qu'un serveur MCP tourne est vu au appel suivant.
- [ ] `package.json` expose `"typecheck": "tsc -b"`.
- [ ] `pnpm test` reste vert, rendu CLI et MCP inchangés.
