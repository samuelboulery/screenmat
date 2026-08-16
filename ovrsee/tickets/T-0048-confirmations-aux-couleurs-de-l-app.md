---
{
  "id": "T-0048",
  "titre": "Confirmations aux couleurs de l'app",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "s",
  "tags": [
    "ui",
    "accessibilite"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-allegement-de-la-barre-haute-repere-du-shot-actif.md"
}
---

## Contexte

Trois moments de décision passent par `window.confirm()` : ouvrir une nouvelle
session, supprimer un style, purger l'historique. Une boîte système grise
tombe au milieu d'une DA « Afterglow », sans son vocabulaire ni ses couleurs,
et ne distingue pas une remise à zéro réversible d'une suppression définitive.

Le remplacement s'appuie sur l'élément natif `<dialog>` : focus trap,
restitution du focus, fermeture par `Esc`, inertie du reste de la page et
`::backdrop` sont dans la plateforme. Aucune dépendance à ajouter.

## Critères d'acceptation

- [ ] Plus aucun `window.confirm` dans `src/`.
- [ ] Les trois confirmations passent par un seul dialogue monté une fois, aux
      tokens de la DA : titre, corps, un bouton d'annulation et un bouton
      d'action nommé par ce qu'il fait (« Start over », « Delete »).
- [ ] Une action destructive porte le rouge `#FF9A9A`, jamais le dégradé
      d'accent réservé à l'action primaire.
- [ ] `Esc` ferme sans agir ; `Tab` reste piégé dans la boîte ; le focus revient
      au bouton d'origine après fermeture.
- [ ] Sur une action destructive, le focus initial est sur « Cancel » : une
      suppression ne se valide pas à l'aveugle sur `Entrée`.
