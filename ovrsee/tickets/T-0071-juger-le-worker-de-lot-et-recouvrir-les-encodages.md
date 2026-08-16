---
{
  "id": "T-0071",
  "titre": "Juger le worker de lot, et recouvrir les encodages",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "s",
  "tags": [
    "perf",
    "export"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0062",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

« Rendu du lot dans un Worker + `OffscreenCanvas` » figurait au « reste à faire »
depuis l'origine, et le plan d'audit l'a repoussé volontairement : les points 1
à 3 divisaient d'abord le coût par item, le worker se jugeait après.

Jugé, donc, à la mesure — 12 items à l'échelle 3 dans Chrome :

| | |
|---|---|
| Rendu d'un item | 36 ms |
| Encodage PNG d'un item | 1 228 ms |
| Encodage WebP d'un item | 819 ms |
| Tâches longues sur tout le lot | **0** |

L'encodage pèse 97 % du temps, et `canvas.toBlob` l'exécute déjà hors du fil
principal. L'interface ne gèle pas — elle attend l'encodeur. Un worker aurait
déplacé les 3 % restants, au prix du portage de `renderScene` et du transfert
des images décodées.

Ce qui manquait était plus simple : `runBatch` attendait la fin de chaque
encodage avant de lancer le rendu suivant, laissant le processeur inoccupé
l'essentiel du temps.

## Critères d'acceptation

- [x] `runBatch` mène trois encodages de front ; le rendu, lui, reste sérialisé
      et synchrone, ce qui fait servir le cache de fond entre deux items aux
      réglages proches.
- [x] 12 items à l'échelle 3 : **15,0 s contre 26,4 s**, pour un zip identique
      (100,2 Mo), et toujours zéro tâche longue.
- [x] L'archive garde l'ordre de la file alors que les encodages finissent dans
      le désordre : entrées indexées, pas empilées.
- [x] Une erreur tombée sur un encodage en vol remonte au lieu de se perdre en
      rejet non traité.
- [x] Trois tests dans `export.test.ts` couvrent l'ordre, le plafond de
      concurrence et la remontée d'erreur.
- [x] Le « reste à faire » du skill `shotframe-moteur` ne réclame plus de
      worker : il dit pourquoi il n'en faut pas.

## Suite donnée

Le poids, lui, était bien un vrai problème : à l'échelle 3, un PNG pèse 11,5 Mo
contre 1,5 Mo en WebP. **WebP passe donc en format par défaut** — voir T-0072.
