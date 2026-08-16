---
{
  "id": "T-0015",
  "titre": "Mettre la doc à jour après l'arrivée de lucide",
  "colonne": "fait",
  "priorite": "basse",
  "charge": "xs",
  "tags": [
    "docs"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0009",
  "plan": "2026-08-16-shotframe-systeme-d-icones-unifie-passe-de-design.md"
}
---

## Contexte

`CLAUDE.md` annonce « Zéro dépendance runtime hors React » et la règle projet
interdit les librairies d'UI. Une fois lucide installé, ces deux phrases mentent
— et une doc qui ment se retourne contre la prochaine session, qui refusera un
import parfaitement légitime ou en ajoutera un qui ne l'est pas.

## Critères d'acceptation

- [ ] `CLAUDE.md` : la ligne « zéro dépendance » dit la vérité, et la section
      Direction artistique décrit le jeu d'icônes (source, taille, épaisseur).
- [ ] `.claude/rules/shotframe-conventions.md` : lucide nommé comme le seul jeu
      sanctionné, la règle « demander avant d'installer » maintenue telle quelle.
- [ ] Aucun commentaire de code ne prétend plus que le codebase est sans icônes.
