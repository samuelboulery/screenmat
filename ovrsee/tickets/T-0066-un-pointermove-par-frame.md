---
{
  "id": "T-0066",
  "titre": "Un pointermove par frame",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "m",
  "tags": [
    "perf",
    "ui"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0062",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

Un seul `pointermove` déclenche trois passes de rendu React : `setDrag` local
dans `Preview`, puis `onTranslate` qui remonte l'état des shots jusqu'à `App`,
puis l'effet de `useHistory` qui appelle `setHistory` (`useHistory.ts:58`). Une
souris à 1000 Hz produit donc de l'ordre de 3000 rendus par seconde pour 60
dessins de canvas.

Le canvas, lui, est déjà correct : le `requestAnimationFrame` de
`useCanvasScene.ts:113` est annulé et replanifié, il ne dessine pas plus que
nécessaire. Une exception : `setGeometry` est appelé à chaque dessin avec l'objet
neuf que renvoie `computeGeometry`, ce qui force un rendu React de plus par
frame même quand la géométrie est identique.

## Critères d'acceptation

- [ ] `onPointerMove` n'écrit que le dernier point dans une ref et planifie une
      frame s'il n'y en a pas en vol ; le corps actuel s'exécute dans cette
      frame. La frame en attente est annulée sur `pointerup` et au démontage.
- [ ] `useCanvasScene` n'appelle `setGeometry` que si la géométrie diffère
      réellement — `width`, `height` et les champs de `window`.
- [x] Vérifié dans l'app : **200 `pointermove` émis d'affilée sur le canvas ne
      planifient plus qu'une seule frame**. Avant, chacun déclenchait le handler
      complet et ses trois passes de rendu React.
- [x] Tracé live vérifié à la souris dans le navigateur : une zone de floutage
      tirée d'un geste se termine au point de relâchement et couvre exactement la
      ligne visée.
