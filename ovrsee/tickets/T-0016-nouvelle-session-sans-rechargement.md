---
{
  "id": "T-0016",
  "titre": "Nouvelle session sans rechargement",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "xs",
  "tags": ["ui"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-nouvelle-session-fonds-harmonises-en-lot.md"
}
---

## Contexte

Une fois des shots chargés, rien ne ramène l'app à son écran d'import : il faut
recharger la page. `useShots.reset()` existe déjà et n'est appelé nulle part.

## Critères d'acceptation

- [ ] Un bouton « New session » dans la barre haute, visible seulement quand des
      shots sont chargés.
- [ ] Il vide shots, réglages, composition, image de fond, file de lot, et
      ramène sur l'écran d'import.
- [ ] Les styles et l'historique persistés survivent à l'opération.
- [ ] Une confirmation native protège du clic accidentel quand des shots sont
      chargés.
