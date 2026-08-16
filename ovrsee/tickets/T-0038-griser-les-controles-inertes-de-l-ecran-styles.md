---
{
  "id": "T-0038",
  "titre": "Griser les contrôles inertes de l'écran Styles",
  "colonne": "fait",
  "priorite": "basse",
  "charge": "xs",
  "tags": [
    "ui",
    "a11y",
    "styles"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-rendre-les-styles-editables-et-supprimables.md"
}
---

## Contexte

Deux contrôles de l'écran Styles acceptent le clic et ne font rien, ce qui
donne l'impression que l'écran est cassé.

Les six positions de watermark (`StylesScreen.tsx:111`) sont inertes tant
qu'aucun logo n'est déposé : `App.tsx:359` garde `if (activeStyle?.watermark)`.
Le toggle « Override sampled colors » (`StylesScreen.tsx:131`) est inerte tant
qu'aucun shot n'est chargé : `shots.activeShot?.palette` vaut `undefined`
(`App.tsx:367`).

Un bouton mort doit se voir mort. `Toggle` (`ui.tsx:182`) n'a pas de prop
`disabled` — à ajouter.

## Critères d'acceptation

- [ ] Sans logo, les six positions de watermark sont grisées et non
      focalisables.
- [ ] Sans palette échantillonnée ni palette figée, le toggle est grisé.
- [ ] Dès qu'un logo est déposé, les positions redeviennent actives.
- [ ] `Toggle` accepte `disabled` et l'expose à l'assistive technology.
