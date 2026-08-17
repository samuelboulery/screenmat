---
{
  "id": "T-0075",
  "titre": "Lien Docs dans la barre haute et pointeurs uniques",
  "colonne": "fait",
  "priorite": "moyenne",
  "tags": [
    "ui",
    "docs"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-documentation-de-la-porte-machine-lien-docs-dans-la-barre-ha.md"
}
---

## Contexte

Une documentation qu'on ne trouve pas n'existe pas : il manque un point d'entrée
depuis l'app. Et une fois `public/docs/` en place, `cli/README.md` cesse d'être
une source pour devenir un pointeur — deux sources divergeraient au premier
changement de flag.

## Critères d'acceptation

- [ ] Un lien « Docs » (icône + mot) en haut à droite de la barre haute, visible
      sur les quatre écrans **et** sur l'écran d'import ; ouvre `/docs/` dans un
      onglet, `rel="noreferrer"`.
- [ ] La barre garde la même hauteur (58 px) et la même largeur d'un écran à
      l'autre.
- [ ] Le lien ne porte ni `SWITCH_ON` ni `SELECTED` : ce n'est ni un commutateur
      ni une sélection. La recette « ghost » est partagée avec `Button`, pas
      recopiée.
- [ ] L'icône est ajoutée dans le seul `src/components/icons.tsx`.
- [ ] `cli/README.md` ne contient plus de référence de flags ni de format de
      scène — seulement le schéma des trois façades et des liens vers
      `../public/docs/*.md`.
- [ ] `CLAUDE.md` et `.claude/skills/shotframe-machine/SKILL.md` pointent vers
      `public/docs/` et non plus vers `cli/README.md`.
