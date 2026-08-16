---
{
  "id": "T-0068",
  "titre": "Travail refait côté app : flatten, historyBytes, vignettes, polices",
  "colonne": "en-cours",
  "priorite": "basse",
  "charge": "xs",
  "tags": [
    "perf",
    "ui"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0062",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

Quatre petits gaspillages sans lien entre eux, tous chiffrés et tous corrigeables
en quelques lignes.

`visible(shot)` appelle `flatten()` deux fois par fenêtre et par frame
(`render.ts:236` et `242`). `historyBytes()` fait un `getAll()` sur le magasin de
métadonnées, qui porte les vignettes en dataURL : environ 1 Mo de base64
désérialisé pour faire une somme (`store.ts:126`). `makeThumbnail` génère 320 px
pour un affichage à 208 px (`image.ts:70`). Et les polices sont déclarées en
`font-display: swap` sans `preload`, alors qu'elles sont locales et que leurs
chemins sont stables.

## Critères d'acceptation

- [ ] `render.ts` calcule `visible(shot)` une fois par fenêtre et le réutilise
      pour les deux boucles.
- [~] `historyBytes()` : **écarté**. IndexedDB ne sait pas projeter un champ, un
      curseur livre la fiche entière comme `getAll()`. Éviter la désérialisation
      des vignettes demande de les sortir vers le magasin `BLOBS` — une migration
      de schéma pour quelques dizaines de millisecondes au montage. Un
      commentaire `ponytail:` nomme le plafond dans `store.ts`.
- [ ] `makeThumbnail` a 240 px pour défaut.
- [ ] `index.html` précharge `space-grotesk-latin.woff2` et
      `jetbrains-mono-latin.woff2` — pas les variantes `-ext`.
- [ ] `pnpm test` vert, aucun changement visible à l'écran hors le texte qui
      s'affiche dans sa police dès la première peinture.
