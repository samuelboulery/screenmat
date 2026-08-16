---
{
  "id": "T-0057",
  "titre": "Aplatir la navigation en quatre destinations",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "ui",
    "navigation"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0056",
  "plan": "2026-08-16-shotframe-refonte-de-la-navigation-harmonisation-des-etats-s.md"
}
---

## Contexte

`view` × `mode` décrit une hiérarchie qui n'existe pas : Compose et Annotate
sont des enfants d'« Editor » et s'affichent pourtant à côté de lui. Un seul
état, quatre destinations, et la nav parle une seule langue.

## Critères d'acceptation

- [ ] `type Screen = 'edit' | 'batch' | 'styles' | 'history'` dans
      `src/types.ts` ; `Mode` et `View` disparaissent de `TopBar.tsx`.
- [ ] `App.tsx` n'a plus qu'un `screen` ; plus aucun appel du genre
      `onView('editor')` déclenché par un autre contrôle.
- [ ] La barre haute affiche deux groupes segmentés — `Edit | Batch` puis
      `Styles | History` — séparés par un espace au moins double du gap
      intra-groupe, sans trait de séparation.
- [ ] L'écran d'import reste dérivé de « aucun shot chargé », pas une
      destination de l'union ; la nav y est masquée.
- [ ] Le soulignement accent de la nav (`border-b`) n'existe plus.
