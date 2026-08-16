---
{
  "id": "T-0032",
  "titre": "Structure du document : lang, main et titres de section",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "xs",
  "tags": [
    "a11y"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0026",
  "plan": "2026-08-16-shotframe-corriger-les-15-constats-de-la-revue-d-interface.md"
}
---

## Contexte

**Constat 10** — `index.html` déclare `lang="fr"` alors que toute la copie
visible est en anglais. Le lecteur d'écran applique prononciation, coupure et
guillemets français à chaque libellé du produit.

**Constat 12** — sonde DOM sur l'éditeur : `headings: []`, `main: 0`. Le seul
`<h1>` du produit vit sur l'écran d'import ; les en-têtes de section sont des
`<div class="t-mono-label">`. Un outil de six écrans et d'une dizaine de
panneaux n'offre aucune structure de parcours.

`MonoLabel` ne doit **pas** devenir un titre : il sert aussi d'étiquette simple
(le seed dans l'inspecteur, le libellé d'un slider). C'est `Section` qui porte un
titre, et ses 22 usages en héritent sans modification.

## Critères d'acceptation

- [ ] `document.documentElement.lang === 'en'`.
- [ ] Un `<main>` unique enveloppe la zone d'écran, sous la barre haute.
- [ ] Chaque `<Section>` rend son titre dans un élément de titre ; `MonoLabel`
      reste un `div` là où il n'est qu'une étiquette.
- [ ] L'écran d'import garde son unique `<h1>`.
