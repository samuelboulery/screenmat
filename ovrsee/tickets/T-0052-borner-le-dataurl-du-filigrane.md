---
{
  "id": "T-0052",
  "titre": "Borner le dataUrl du filigrane",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "xs",
  "tags": [
    "securite"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-audit-global-shotframe-constats-et-plan-de-correction.md"
}
---

## Contexte

`src/lib/styles.ts:141-146` valide le préfixe du `dataUrl` du filigrane par
regex, mais ne borne pas sa longueur — alors que le même fichier tronque `name`
à 64 et `url` à 200 quelques lignes plus haut. Un `.json` de style importé est
une donnée externe : il peut pousser plusieurs mégaoctets de base64 dans
IndexedDB.

## Critères d'acceptation

- [ ] Un plafond explicite (~2 Mio) sur la longueur du `dataUrl` ; au-delà, le
      filigrane est rejeté comme l'est déjà un préfixe invalide — `undefined`,
      sans jeter.
- [ ] Le plafond est une constante nommée, dans le style des voisines de
      `styles.ts`.
- [ ] Un test dans `src/lib/__tests__/styles.test.ts` : un `dataUrl` au préfixe
      valide mais trop long ne passe pas.
