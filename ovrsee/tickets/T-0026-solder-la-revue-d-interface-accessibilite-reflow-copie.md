---
{
  "id": "T-0026",
  "type": "epic",
  "titre": "Solder la revue d'interface : accessibilité, reflow, copie",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "l",
  "tags": [
    "a11y",
    "design"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-corriger-les-15-constats-de-la-revue-d-interface.md"
}
---

## Contexte

Une revue `better-interface` en mode `full` a rendu un verdict **Block** :
9 constats HIGH et 6 MEDIUM, tous mesurés dans le DOM rendu — contrastes,
focalisables, reflow au zoom, comportement clavier réel — et non déduits du code.

Trois familles de causes : le clavier n'est pas un chemin de première classe
(raccourcis à touche unique globaux, canvas sans nom ni focus), rien n'est
annoncé (zéro région live), et deux tokens et deux écrans n'ont jamais été
mesurés (`--color-dim` échoue sur le repli opaque, les écrans de gestion n'ont
aucun repli étroit).

Cet epic regroupe les huit tickets qui soldent les 15 constats. La DA
« Afterglow » et le chemin de rendu unique ne bougent pas. Aucune dépendance
ajoutée.

## Critères d'acceptation

- [ ] Les huit tickets enfants sont en colonne finale.
- [ ] `pnpm exec tsc -b` et `pnpm test` passent sans modification de la suite.
- [ ] `/interfaces:better-interface full shotframe` rend un verdict **Approve**.
