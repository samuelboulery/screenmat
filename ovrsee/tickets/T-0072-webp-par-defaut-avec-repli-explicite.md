---
{
  "id": "T-0072",
  "titre": "WebP par défaut, avec repli explicite",
  "colonne": "fait",
  "priorite": "moyenne",
  "charge": "xs",
  "tags": [
    "export",
    "produit"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0062",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

Le grain est du bruit : il fait exploser un PNG. Mesuré à l'échelle 3 sur le
rendu de référence, **11,5 Mo en PNG contre 1,5 Mo en WebP**, pour un résultat
visuellement identique — grain, dégradés et flou compris, vérifiés à l'œil.
`types.ts` le disait déjà, mais le défaut restait PNG.

Le basculer ne se fait pas en changeant une constante : `canvasToBlob` **jette**
quand le navigateur ne sait pas encoder le WebP, garde-fou qui existe pour ne pas
livrer un PNG déguisé en `.webp`. Un défaut WebP sans repli casserait donc le
chemin nominal partout où l'encodeur manque.

## Critères d'acceptation

- [x] `DEFAULT_SETTINGS.format` vaut `webp`.
- [x] Web : `supportsWebp()` sonde une fois (canvas de 1 px), `supportedDefaults()`
      ramène le défaut à `png` là où l'encodeur manque, et `useDocument` s'en sert
      à l'initialisation comme au `reset`.
- [x] Node : `render()` retombe sur le PNG au lieu de jeter, et le `format` comme
      les `settings` renvoyés portent le format réellement produit — le nom de
      fichier en découle, il ne ment pas.
- [x] Le garde-fou de `canvasToBlob` est intact.
- [x] `--format png` continue de forcer le PNG.
- [x] Vérifié en bout de chaîne : `--scale 3` sort 1,5 Mo en `.webp` contre
      11,5 Mo en `.png`, rendu identique à l'œil.
