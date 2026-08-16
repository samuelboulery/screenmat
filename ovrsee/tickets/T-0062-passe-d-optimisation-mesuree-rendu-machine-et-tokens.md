---
{
  "id": "T-0062",
  "titre": "Passe d'optimisation mesurée : rendu, machine et tokens",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "xl",
  "type": "epic",
  "tags": [
    "perf",
    "audit"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

Audit de performance sur tout le dépôt, points chauds mesurés au banc
(`@napi-rs/canvas`, canvas 3200×2400 — un export à l'échelle 2). Le moteur est
sain dans l'ensemble, mais deux appels coûtent 100 à 300 fois leur voisinage, et
le rendu ne cache rien entre deux frames alors que l'essentiel du dessin est
invariant pendant un geste.

`renderScene` ment sur son coût quand on le chronomètre seul : skia diffère la
rastérisation. Les chiffres qui comptent sont ceux qui la forcent — encodage PNG
ou relecture du canvas.

| Scénario | Aujourd'hui |
|---|---|
| 1 shot, 0 calque | 2,9 ms |
| 1 shot, **1 zone floutée** | **372 ms** |
| 1 shot, 2 zones floutées | 373 ms — le coût est par frame, pas par zone |
| Rendu + encodage PNG, `grain: 0` | 370 ms |
| Rendu + encodage PNG, `grain: 0.35` | **1 118 ms** |

Le bundle web (97,7 Ko gzip), les tests (5,5 s) et la structure des composants ne
sont pas des problèmes. Une seconde ressource entre dans le périmètre : les
tokens que le dépôt fait consommer à un modèle — ~4 630 résidents par tour, plus
~1 660 de schémas MCP.

## Critères d'acceptation

- [ ] Rendre par le CLI un shot avec une zone floutée et `grain: 0.35` passe
      sous ~120 ms, contre ~1 100 ms aujourd'hui.
- [ ] `time node cli/main.ts --help` reste sous 50 ms.
- [ ] Contexte résident du projet sous ~1 200 tokens, schémas MCP sous ~1 150.
- [ ] `pnpm test`, `pnpm build` et `pnpm typecheck` verts, aucune régression
      visuelle sur les sept captures de référence.
