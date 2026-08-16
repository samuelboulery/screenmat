---
{
  "id": "T-0030",
  "titre": "Contraste : token dim et tuile de lot lisible",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "s",
  "tags": [
    "a11y",
    "design"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0026",
  "plan": "2026-08-16-shotframe-corriger-les-15-constats-de-la-revue-d-interface.md"
}
---

## Contexte

Deux paires rendues échouent le contraste, mesurées et non estimées.

**Constat 6** — `--color-dim: #767a8c` : placeholder de recherche mesuré dans le
DOM à **4,43:1** sur son fond composite à 12 px. `t-mono-label` passe à 4,52:1
sur le panneau translucide mais tombe à **4,45:1** sur `--color-panel-solid`, le
repli servi quand `backdrop-filter` manque. Le candidat `#83879a` est le plus
petit pas qui passe 4,5:1 partout, pire cas compris (4,89:1 sur `bg-sunken`
au-dessus du repli opaque), et garde la hiérarchie `dim < ink-soft < ink`.

**Constat 1** — tuile de lot non retenue : `opacity-60` sur le bouton entier,
statut `text-dim` 9 px sur `bg-stage/60` posé sur le screenshot. Mesuré
**1,17:1** sur screenshot clair. C'est le statut de la file que l'écran existe
pour donner. L'état retenu est déjà porté par la case et la bordure.

## Critères d'acceptation

- [ ] Le placeholder de recherche de l'écran History mesure ≥ 4,5:1 sur son fond
      rendu.
- [ ] `t-mono-label` mesure ≥ 4,5:1 sur `--color-panel-solid` comme sur le
      panneau translucide.
- [ ] Le statut d'une tuile de lot non retenue mesure ≥ 4,5:1 par-dessus un
      screenshot blanc.
- [ ] Retenu / non retenu reste distinguable au premier coup d'œil.
