---
{
  "id": "T-0001",
  "type": "epic",
  "titre": "Annotation au geste et vrais calques",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "xl",
  "tags": [
    "annotate",
    "canvas"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-annotation-rendu-live-texte-au-clic-couleurs-inver.md"
}
---

## Contexte

L'écran Annotate marche mais son geste est aveugle : pendant un tracé on ne voit
qu'un rectangle pointillé en DOM, quelle que soit la forme. Le texte impose de
glisser une boîte avant de taper, et la frappe se fait dans l'inspecteur. Les
labels et badges n'ont qu'une déclinaison de couleur. La pile de calques est une
liste plate, à sélection unique, réordonnable par deux boutons.

Cet epic regroupe la refonte : voir ce qu'on dessine pendant qu'on le dessine,
taper le texte là où il apparaîtra, et gérer les calques comme un vrai outil de
dessin — arbre de groupes, multi-sélection, drag & drop, visibilité, verrouillage.

Contrainte qui tient tout : `renderScene()` reste le seul chemin de rendu. Ce
qui se voit dans le visuel passe par la scène ; seul le chrome d'édition (cadre,
poignées, marquee) reste en DOM.

## Critères d'acceptation

- [ ] Les sept tickets enfants sont en colonne finale.
- [ ] `pnpm test`, `pnpm exec tsc -b` et `pnpm build` passent.
- [ ] Un export réalisé pendant une saisie de texte ne contient ni caret, ni
      cadre de sélection, ni calque masqué.
