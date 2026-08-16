---
{
  "id": "T-0044",
  "titre": "Téléchargement révoqué trop tôt et timer Copied",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "xs",
  "tags": [
    "bug",
    "export"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-shotframe-ecran-noir-watermark-retirable-palette-editable.md"
}
---

## Contexte

Deux constats d'audit, petits et réels.

`export.ts:43` — `URL.revokeObjectURL` est appelé dans la foulée de
`link.click()`, alors que le téléchargement consomme l'URL de façon asynchrone.
Selon le navigateur, le fichier peut ne jamais arriver, sans le moindre message.

`useExport.ts:59` — le `setTimeout` qui éteint l'état « Copied » n'est jamais
annulé : il tire dans le vide si le composant est parti, et deux copies
rapprochées arment deux timers concurrents.

## Critères d'acceptation

- [ ] L'URL objet d'un téléchargement est révoquée après coup, pas dans la même
      pile que le clic, avec un commentaire nommant le délai retenu.
- [ ] Le timer « Copied » est annulé au démontage et avant d'en armer un nouveau.
