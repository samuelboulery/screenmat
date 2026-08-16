---
{
  "id": "T-0029",
  "titre": "Annoncer erreurs, statut d'export et progression du lot",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "s",
  "tags": [
    "a11y"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0026",
  "plan": "2026-08-16-shotframe-corriger-les-15-constats-de-la-revue-d-interface.md"
}
---

## Contexte

Constat 7. Sonde DOM : `[aria-live], [role=status], [role=alert]` → **zéro**.

Les erreurs d'export, de bibliothèque et de lot, le nom du fichier écrit, la
bascule `Copy → Copied` et la progression du lot sont rendus en texte muet dans
le coin bas-droit. Un export qui échoue et un export qui réussit sont
indiscernables sans regarder cet endroit précis de l'écran.

Les régions doivent être **montées en permanence** : une région insérée après
coup n'est pas annoncée de façon fiable. Le placement visuel actuel ne change
pas, seul le balisage.

## Critères d'acceptation

- [ ] Un export réussi écrit le nom de fichier et le poids dans une région
      `role="status"` déjà présente au chargement.
- [ ] Une erreur (export, import, bibliothèque, lot) arrive dans une région
      `role="alert"`.
- [ ] Une copie réussie est annoncée, pas seulement affichée sur le bouton.
- [ ] La barre de progression du lot expose `role="progressbar"` avec
      `aria-valuenow`, sans région live sur le compteur.
