---
{
  "id": "T-0063",
  "titre": "Le floutage ne relit plus le canvas de destination",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "l",
  "tags": [
    "perf",
    "rendu"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0062",
  "plan": "2026-08-16-shotframe-audit-d-optimisation-et-plan-de-correction.md"
}
---

## Contexte

`downsample()` échantillonne avec `layer.drawImage(ctx.canvas, …)`
(`lib/layers.ts:77`). Lire le canvas de destination force le rasteriseur à vider
toute la frame en cours, puis le reste de la frame se rasterise une seconde fois.
Mesuré : une frame passe de 2,9 ms à 372 ms dès qu'**une** zone floutée existe,
et deux zones coûtent la même chose qu'une — le coût est celui de la relecture,
pas du floutage. Ça frappe la preview, l'export web, le CLI et le MCP.

La correction consiste à échantillonner le screenshot source plutôt que la
destination. Elle demande d'extraire `screenRect(box, geometry, settings)` dans
`lib/frame.ts` : la règle qui dit où le screenshot atterrit dans sa fenêtre
existe aujourd'hui en trois exemplaires dispersés — `renderFrame` pour
browser/none, `drawDeviceShell` pour le bezel macbook/iphone, et `inspect()`
dans `cli/api.ts:209`, qui ignore le bezel et renvoie donc un `screen` faux pour
`frame: 'macbook'` et `'iphone'`.

## Critères d'acceptation

- [ ] `lib/frame.ts` exporte `screenRect(box, geometry, settings)`, et
      `renderFrame`, `renderRedactions` et `inspect()` en sont les seuls
      lecteurs — plus aucun calcul de barre de titre ou de bezel ailleurs.
- [ ] `renderRedactions` échantillonne `shot.image`, jamais `ctx.canvas` : un
      `grep` sur `ctx.canvas` dans `lib/layers.ts` ne renvoie rien.
- [ ] La tuile réduite se dessine sous `windowTransform` : une zone floutée sur
      une fenêtre à `rotateY: 24` suit l'inclinaison. Le plafond « zone floutée
      échantillonnée sans la rotation » disparaît de `CLAUDE.md`.
- [ ] Une zone qui déborde de l'image est bornée à l'image ; sans intersection,
      elle retombe sur l'aplat `#0B0B0F` du mode `solid`, avec un commentaire
      `ponytail:` qui nomme le choix.
- [ ] `inspect()` renvoie le bon `screen` pour les quatre cadres — un test le
      couvre.
- [x] Rendu CLI d'un shot avec une zone floutée : **le floutage ne coûte plus
      rien** (762 ms contre 765 sans zone, 10 zones comprises), contre +372 ms
      par frame avant. Couverture vérifiée aux échelles 1 et 3, et sur les quatre
      cadres : la moyenne colorimétrique sous la zone floutée correspond à celle
      de la même région non floutée à 1–8/255 près.
- [!] **Le gain est propre à Node/skia.** Mesuré dans Chrome, relire `ctx.canvas`
      coûte 1,37 ms contre 1,35 ms pour lire le screenshot : le navigateur ne
      paie pas cette relecture. Le changement reste justifié — CLI, serveur MCP et
      lots divisés par cent, rotation suivie, repère de `inspect()` corrigé — mais
      il n'accélère pas l'app web.
