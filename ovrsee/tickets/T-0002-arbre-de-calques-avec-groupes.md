---
{
  "id": "T-0002",
  "titre": "Arbre de calques avec groupes",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "l",
  "tags": [
    "annotate",
    "modele"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-annotation-rendu-live-texte-au-clic-couleurs-inver.md",
  "epic": "T-0001"
}
---

## Contexte

`Shot.annotations` est un tableau plat : pas de regroupement possible, et rien
pour masquer ou verrouiller un calque. Toutes les fonctionnalités qui suivent
(multi-sélection, panneau, drag & drop) s'appuient sur ce modèle — il passe en
premier, sans changement visible.

`Shot.annotations: Annotation[]` devient `Shot.layers: LayerNode[]`, où un nœud
est soit une `Annotation`, soit un `LayerGroup` imbricable. `Annotation` gagne
`name`, `hidden`, `locked`, `invert`. Nouveau module pur `src/lib/tree.ts` :
`isGroup`, `flatten`, `findNode`, `updateNode`, `removeNodes`, `insertNodes`,
`moveNodes`, `groupNodes`, `ungroup`, `nodeIds`.

Aucune migration de persistance : les calques ne sont ni dans `Style` ni dans
`HistoryEntry`.

## Critères d'acceptation

- [ ] `render.ts` dessine via `flatten(shot.layers, { skipHidden: true })` — un
      calque masqué n'est ni en preview ni à l'export.
- [ ] `hitTest` ignore les nœuds masqués et verrouillés, `badgeNumbers` reçoit la
      liste aplatie.
- [ ] `signature()` (`history.ts`) est bâti sur `nodeIds` : créer ou dissoudre un
      groupe est une étape d'annulation distincte.
- [ ] `moveNodes` refuse de déplacer un groupe dans sa propre descendance.
- [ ] `src/lib/__tests__/tree.test.ts` couvre l'ordre de `flatten`, l'héritage du
      `hidden` depuis un groupe, et l'aller-retour `groupNodes`/`ungroup`.
- [ ] `pnpm test` et `pnpm exec tsc -b` verts, comportement de l'app inchangé.
