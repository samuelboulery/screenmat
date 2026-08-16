---
{
  "id": "T-0003",
  "titre": "Tracé live et aimantation ⇧",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "annotate",
    "canvas"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-annotation-rendu-live-texte-au-clic-couleurs-inver.md",
  "epic": "T-0001"
}
---

## Contexte

Pendant un tracé, `Preview` n'affiche qu'un `div` pointillé quelle que soit la
forme : une flèche ne montre ni sa pointe ni son inclinaison avant le
relâchement. `snapTo45` existe déjà (`handles.ts`) mais n'est appelé qu'au
redimensionnement, jamais au tracé.

Nouveau module pur `src/lib/draft.ts` : `draftRect(kind, from, to, shift)` —
extrait de `Preview.drawnRect()`, enrichi de l'aimantation — et
`withDraft(scene, shotId, annotation)`. Pendant le geste, la preview rend une
scène augmentée de l'annotation brouillon : le seul chemin de rendu est
respecté, et on voit exactement la forme finale.

## Critères d'acceptation

- [ ] Tracer une flèche montre sa pointe et son inclinaison pendant le geste.
- [ ] ⇧ maintenu aimante un segment aux horizontales, verticales et diagonales à
      45° ; relâcher ⇧ en cours de tracé le libère aussitôt.
- [ ] ⇧ sur un box ou une ellipse donne un carré / un cercle.
- [ ] Le `div` pointillé et `drawPreview()` sont supprimés de `Preview.tsx`.
- [ ] Les deux extrémités d'un segment en cours de tracé sont marquées.
- [ ] Le `ResizeObserver` n'est plus recréé à chaque changement de scène (effet
      de rendu scindé).
- [ ] `src/lib/__tests__/draft.test.ts` : snap à 0/45/90° à longueur conservée,
      carré sous ⇧, `null` sous `MIN_DRAW`, rect nul pour les kinds ponctuels.
