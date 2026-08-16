---
{
  "id": "T-0064",
  "titre": "Le grain se blitte au lieu de se peindre en motif",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "s",
  "tags": [
    "perf",
    "rendu"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0062",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

`applyGrain` remplit tout le canvas avec un `CanvasPattern` mis à l'échelle par
`setTransform` (`lib/noise.ts:51-60`). L'ombrage par motif coûte 470 ms sur
7,7 Mpx ; la même tuile pré-mise à l'échelle et blittée en boucle coûte 69 ms,
pixel pour pixel identique — mêmes origines entières, même répétition. C'est ce
qui fait passer un export PNG de 370 ms à 1 118 ms aujourd'hui.

Le mode de fusion n'est pas en cause : `overlay`, `source-over`, `soft-light` et
`multiply` ont été mesurés entre 535 et 640 ms. C'est le shader de motif qui
coûte, pas la fusion.

## Critères d'acceptation

- [ ] `noise.ts` porte un cache d'une entrée `{ scale, canvas }` pour la tuile de
      `128 × scale` px, dessinée une fois avec `imageSmoothingEnabled = false`.
      `noiseTile()` garde son cache actuel.
- [ ] `applyGrain` conserve `globalCompositeOperation = 'overlay'` et son alpha,
      et remplace le `fillRect` par une double boucle `drawImage`.
- [x] Rendu + encodage PNG à l'échelle 2 avec `grain: 0.35` : **765 ms** contre
      1 118 ms. Le gain réel est de ~30 %, pas les 7× qu'annonçait le banc
      synthétique — celui-ci mesurait un fond uni, où skia optimise.
- [x] Rendu comparé avant/après aux échelles 1, 2 et 3 : écart moyen de 0,5 à
      2,6 par canal sur 255, dû au rééchantillonnage de la tuile. Invisible sur
      une couche de bruit à 17 % d'opacité, et preview comme export partagent le
      même code : ils restent cohérents entre eux.
- [x] Navigateur : 0,70 ms contre 0,80 ms pour le motif, soit dans le bruit.
      Aucune régression côté web, le gain est côté Node.
