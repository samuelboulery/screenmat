---
{
  "id": "T-0055",
  "titre": "Couleurs de chrome et rayon hors tokens",
  "colonne": "revue",
  "priorite": "basse",
  "charge": "xs",
  "tags": [
    "ui"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-audit-global-shotframe-constats-et-plan-de-correction.md"
}
---

## Contexte

Quelques couleurs de chrome DOM sont peintes en hex au lieu du token
correspondant de `src/index.css`, et un rayon sort des cinq déclarés. Dérive
lente : chaque valeur en dur est un endroit que le prochain réglage de palette
oubliera.

À ne **pas** toucher : `BASE_COLORS` d'`AnnotationStyle.tsx:23` et les aperçus
de fond d'`Inspector.tsx:36-38` — ce sont des encres et des vignettes d'artwork,
un `var(--color-accent)` n'a aucun sens passé à `ctx.fillStyle`.

## Critères d'acceptation

- [x] `SelectionOverlay.tsx:56,85` utilisent `var(--color-accent)` au lieu de
      `#7DE2FF` — les deux valeurs étaient identiques, l'échange est neutre.
- [x] `src/index.css` — le `border-radius: 2px` des deux pistes de slider passe
      à `--radius-xs`, et leur dégradé aux tokens d'accent. Sur une piste de
      3 px, 2 px comme 4 px sont ramenés à 1,5 px par le navigateur : rien ne
      bouge à l'œil.
- [ ] **Écarté après vérification :** `ui.tsx:74` (`#23232C`), `ui.tsx:237`
      (`#FFC9C9`) et `TopBarActions.tsx:38` (`#6F7386`) ne sont **pas** des
      doublons de tokens — `--color-dim` vaut `#83879a`, pas `#6F7386`. Les
      remplacer changerait la couleur. Soit ces trois teintes méritent leur
      propre token, soit elles restent en dur : c'est une décision de DA, pas
      un nettoyage. `TopBarActions.tsx` est de toute façon en cours de
      réécriture par la refonte de la navigation.
