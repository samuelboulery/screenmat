---
{
  "id": "T-0046",
  "titre": "Le logo ramène à l'écran d'accueil",
  "colonne": "revue",
  "priorite": "moyenne",
  "charge": "xs",
  "tags": [
    "ui",
    "navigation"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-allegement-de-la-barre-haute-repere-du-shot-actif.md"
}
---

## Contexte

La marque `shotframe` en haut à gauche est un `<span>` inerte. C'est pourtant
l'affordance que tout le monde essaie en premier pour revenir au début. Le seul
chemin vers l'écran d'import passe aujourd'hui par le bouton « New session ».

## Critères d'acceptation

- [ ] Avec des shots chargés, cliquer la marque demande confirmation puis
      ramène à l'écran d'import, réglages et composition remis à zéro — la
      bibliothèque de styles et l'historique survivent.
- [ ] Sur l'écran d'import, la marque n'est pas un bouton : il n'y a nulle part
      où revenir.
- [ ] La marque est atteignable au clavier, porte un nom accessible, et son
      changement d'état au survol dit qu'elle se clique.
- [ ] Aucun changement visuel de la marque au repos.
