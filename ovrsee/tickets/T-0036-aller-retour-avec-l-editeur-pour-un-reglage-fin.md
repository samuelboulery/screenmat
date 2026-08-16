---
{
  "id": "T-0036",
  "titre": "Aller-retour avec l'éditeur pour un réglage fin",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "ui",
    "styles"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-rendre-les-styles-editables-et-supprimables.md"
}
---

## Contexte

L'écran Styles n'expose que quatre réglages ; le reste — ratio, coins, fond,
ombre, rotation — vit dans l'Inspector. Il manque le passage de l'un à l'autre.

Un bouton « Edit in editor » applique le style et bascule sur la vue Editor.
Mais seul, il mène à un cul-de-sac : `useStyleActions.save()`
(`useStyleActions.ts:54`) crée **toujours** un nouveau `Style N`, il n'écrase
jamais l'actif. Le retour est donc la moitié qui compte : un `update()` qui
réécrit le style actif avec les réglages courants, rendu par une tuile dans
`Presets.tsx` à côté du `+`, visible seulement quand un style est actif.

## Critères d'acceptation

- [ ] « Edit in editor » depuis la fiche d'un style ouvre l'éditeur avec ce
      style appliqué.
- [ ] Une tuile « Update » apparaît dans Presets quand un style est actif, et
      seulement là.
- [ ] Après réglage fin puis « Update », la fiche du style reflète les nouvelles
      valeurs.
- [ ] Aucun `Style N` en double n'apparaît dans la liste au passage.
- [ ] Le `+` de Presets continue de créer un nouveau style.
