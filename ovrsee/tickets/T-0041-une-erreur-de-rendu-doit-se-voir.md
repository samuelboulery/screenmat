---
{
  "id": "T-0041",
  "titre": "Une erreur de rendu doit se voir",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "s",
  "tags": [
    "render",
    "a11y",
    "dx"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-ecran-noir-watermark-retirable-palette-editable.md"
}
---

## Contexte

`useCanvasScene.ts:85` appelle `renderScene` sans garde. Une exception y tue la
frame en silence : ni message, ni indice, un canvas noir définitif que rien ne
distingue d'un fond sombre. C'est ce qui a rendu T-0039 et T-0040 si pénibles à
diagnostiquer — le symptôme ne disait rien de sa cause.

Le hook attrape et retient le message ; `Preview.tsx` l'affiche en surimpression
sur le canvas. Pas de prop à traverser : l'erreur se montre là où le rendu a
échoué, dans l'éditeur comme dans l'aperçu de l'écran Styles. Attraper sans
afficher serait pire que le bug.

## Critères d'acceptation

- [ ] Une exception dans `renderScene` affiche un message lisible par-dessus le
      canvas au lieu de le laisser noir et muet.
- [ ] Le message disparaît dès qu'un rendu réussit.
- [ ] L'erreur reste visible en console pour le diagnostic.
