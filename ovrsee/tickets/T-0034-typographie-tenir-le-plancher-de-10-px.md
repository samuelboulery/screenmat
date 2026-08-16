---
{
  "id": "T-0034",
  "titre": "Typographie : tenir le plancher de 10 px",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "xs",
  "tags": [
    "design"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0026",
  "plan": "2026-08-16-shotframe-corriger-les-15-constats-de-la-revue-d-interface.md"
}
---

## Contexte

Constat 15. `CLAUDE.md` fixe l'échelle typographique : « Rien sous 10px, et 10px
uniquement en mono majuscule espacé », et `index.css` réserve explicitement
`t-mono-micro` à la surimpression sur une vignette.

Onze usages de 9 px enfreignent l'une ou l'autre règle, répartis sur sept
composants — dont trois hors vignette (tuiles de l'inspecteur, presets, styles
d'annotation). Le code et sa propre documentation se contredisent.

## Critères d'acceptation

- [ ] Plus aucun texte sous 10 px dans `src/`.
- [ ] Aucun libellé de tuile ne se coupe à 10 px, y compris dans les grilles les
      plus serrées de l'inspecteur (`grid-cols-4` et `grid-cols-5`).
- [ ] Si un 9 px devait finalement être assumé, c'est `CLAUDE.md` qui est
      corrigé — le code et la doc ne se contredisent plus.
