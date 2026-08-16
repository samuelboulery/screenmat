---
{
  "id": "T-0018",
  "titre": "Saturation et contraste du fond dans les réglages",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "s",
  "tags": ["couleur", "inspecteur"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-nouvelle-session-fonds-harmonises-en-lot.md"
}
---

## Contexte

L'intensité du fond est entièrement déduite de la palette du screenshot : aucun
réglage ne permet de l'assumer plus ou moins. L'option d'harmonisation d'un lot
(T-0017) aligne les captures entre elles, mais rien ne règle le niveau commun.

## Critères d'acceptation

- [ ] Deux curseurs « Saturation » et « Contrast » dans l'inspecteur, section
      Background.
- [ ] Neutres à 100 % : le rendu par défaut est inchangé.
- [ ] La saturation agit sur l'aplat et les taches sans toucher aux teintes ;
      le contraste écarte les taches de l'aplat, qui ne bouge pas.
- [ ] Les deux valeurs voyagent dans un style exporté, et un `.json` importé les
      valide et les borne.
