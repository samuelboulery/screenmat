---
{
  "id": "T-0065",
  "titre": "Le fond est mis en cache entre deux frames",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "m",
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

`renderBackground` refait à chaque frame l'aplat, les blobs — canvas hors écran
puis ré-agrandissement — et le grain plein canvas. Pendant qu'on déplace un
calque ou qu'on tire une poignée, rien de tout ça ne change.

Le fond est cachable tel quel, grain compris : `applyGrain` est appelé à la fin
de `renderBackground`, donc **avant** que les fenêtres soient dessinées
(`render.ts:226`). Le fond complet est une image indépendante du reste de la
scène.

Le risque est la clé : un champ oublié fige le fond et l'utilisateur voit un
réglage rester sans effet.

## Critères d'acceptation

- [ ] `background.ts` porte un cache d'une seule entrée `{ key, canvas }`.
      Succès → `ctx.drawImage(cache, 0, 0)` ; échec → on peint dans le canvas
      hors écran puis on le blitte.
- [ ] La clé couvre tous les champs lus : `width`, `height`, `scale`,
      `settings.background`, `blur`, `shapes`, `shapeOpacity`, `saturation`,
      `contrast`, `grain`, `seed`, `palette.base`, `palette.accents`, et
      l'identité de `backgroundImage`.
- [ ] `background.test.ts` couvre les deux sens : changer `seed` change les
      pixels, ne rien changer réutilise le cache sans repeindre.
- [ ] Dans l'app : bouger chaque curseur de la section Background produit un
      changement visible, aucun réglage ne reste sans effet.
- [x] Glisser un calque sur une scène `mesh` avec grain ne repeint plus le fond :
      zéro canvas alloué sur vingt frames consécutives. Mesuré dans Chrome à
      l'échelle 2, **10,9 ms par frame cache touché contre 20,3 ms cache raté** —
      9,4 ms rendus, plus de la moitié du budget d'une frame à 60 fps. C'est le
      gain principal de l'app web ; côté Node il ne rendait que 10 %.
