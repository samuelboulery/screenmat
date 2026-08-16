---
{
  "id": "T-0020",
  "titre": "Faire tourner renderScene dans Node",
  "epic": "T-0019",
  "colonne": "backlog",
  "priorite": "haute",
  "charge": "m",
  "tags": ["cli", "rendu"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": null
}
---

## Contexte

Rien du reste de l'epic n'a de sol tant que `renderScene()` ne produit pas une
image hors navigateur. Canvas 2D n'existe pas dans Node : il faut le fournir.

**Approche : polyfiller les globales, ne pas toucher au moteur.** `src/lib/`
appelle `document.createElement('canvas')` à quatre endroits du chemin de rendu
(`noise.ts:15`, `background.ts:133`, `layers.ts:69`, `palette.ts:139`) et
`new DOMMatrix()` une fois (`noise.ts:54`). Plutôt qu'un seam d'injection dans
cinq fichiers, `cli/dom-shim.ts` (~40 lignes) installe ces globales depuis
`@napi-rs/canvas` avant tout import. Le `document` est un Proxy qui **jette sur
toute propriété inconnue** : un crash lisible vaut mieux qu'une divergence
silencieuse le jour où `src/lib/` touchera une autre API DOM.

Le chemin de rendu n'est ni porté ni dupliqué — c'est le même code. La règle
« un seul moteur » tient par construction.

`@napi-rs/canvas` (Skia précompilé, pas de node-gyp) va en
`optionalDependencies` : builder le site web n'en a pas besoin, et le bundle
n'embarque rien de nouveau.

Trois incertitudes à lever par un spike de 20 lignes **avant** d'écrire quoi que
ce soit d'autre :

| À vérifier | Repli |
|---|---|
| `ctx.createPattern().setTransform(DOMMatrix)` (grain, `noise.ts:51-54`) | dessiner la tuile en boucle plutôt qu'en pattern |
| `canvas.encode('webp')` | PNG seul côté Node, `webp` refusé proprement |
| Une monospace résolue par la stack `MONO` (`layers.ts:10`, `frame.ts:31`) | embarquer un `.ttf` dans `cli/fonts/` et l'enregistrer nommément |

Si lever ces trois points impose de modifier `src/lib/`, c'est le signal qu'il
faut s'arrêter et rediscuter, pas contourner.

## Critères d'acceptation

- [ ] `node cli/spike.ts capture.png` écrit un PNG non vide.
- [ ] Le PNG obtenu et l'export web de la même capture, même `seed` et mêmes
      réglages, se superposent — grain et police compris.
- [ ] Une propriété DOM non prévue lève une erreur nommant la propriété.
- [ ] `src/lib/` n'a pas été modifié.
- [ ] Node 24 exécute le TypeScript sans étape de build.
