---
{
  "id": "T-0045",
  "titre": "Alléger la barre haute vers le filmstrip",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "ui",
    "navigation"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-allegement-de-la-barre-haute-repere-du-shot-actif.md"
}
---

## Contexte

Les 58 px de la barre haute portent aujourd'hui neuf choses : la marque, le
badge LOCAL, les trois modes, le bouton « New session », les trois vues, les
dimensions de sortie, undo/redo, Copy et Export. Trois d'entre elles ne relèvent
pas de la navigation — elles décrivent ou manipulent le *document* : les
dimensions, undo/redo et la remise à zéro. Leur place est dans le chrome
d'édition, avec le rail et l'inspecteur.

Le filmstrip flottant est déjà un panneau du document, en bas du canvas, et il a
la place à droite de son hint. Il les accueille.

Le mode **batch** garde ses métadonnées et ses actions dans la barre haute :
`BatchScreen` n'affiche pas de filmstrip et n'a rien à annuler.

## Critères d'acceptation

- [ ] En mode Compose et Annotate, la barre haute ne contient plus que :
      `shotframe`, badge LOCAL, Compose/Annotate/Batch, Editor/Styles/History,
      Copy, Export.
- [ ] Le filmstrip affiche à droite de son hint, séparés par le même filet que
      celui déjà en place : undo, redo, les dimensions de sortie
      (`3200 × 2400 · png`) et le bouton « New session ».
- [ ] Undo/redo y sont grisés quand la pile est vide et gardent leurs libellés
      d'origine (`Undo (⌘Z)`, `Redo (⇧⌘Z)`).
- [ ] Les dimensions se masquent sous 1180 px, comme le faisait la barre haute.
- [ ] Les vignettes restent la seule zone qui rétrécit : le nouveau groupe ne se
      comprime pas.
- [ ] Les branches batch, styles et history de `TopBarActions` sont inchangées.
