---
{
  "id": "T-0042",
  "titre": "Retirer un watermark",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "xs",
  "tags": [
    "ui",
    "styles"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-ecran-noir-watermark-retirable-palette-editable.md"
}
---

## Contexte

`useSideFile.ts:76` sait poser un logo sur un style, rien ne sait l'enlever :
une fois déposé, il est là pour toujours. `App.tsx:367` garde
`if (activeStyle?.watermark)`, et le champ ne redescend jamais à `undefined`.

Bouton sous la tuile de dépôt, en couleur destructive, visible seulement quand
un logo est présent. Le handler retire la clé plutôt que de poser `undefined`.
`useStyleActions.ts:32` remet déjà l'image décodée à `null` quand le champ
disparaît.

## Critères d'acceptation

- [ ] Un style avec logo expose une action pour le retirer ; sans logo, elle
      n'apparaît pas.
- [ ] Après retrait, le logo disparaît de l'aperçu et les six positions se
      regrisent.
- [ ] Après rechargement de la page, le logo n'est pas revenu.
