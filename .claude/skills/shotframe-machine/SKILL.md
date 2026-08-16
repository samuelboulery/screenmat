---
name: shotframe-machine
description: La porte machine de shotframe — CLI `cli/main.ts`, serveur MCP `cli/mcp.ts`, API Node `render(spec)` / `inspect()`, format de scène sérialisable, shim DOM pour Node, styles de `~/.shotframe/styles/`. À invoquer AVANT de toucher à `cli/`, à un outil MCP, au format de scène, au shim, ou dès qu'il s'agit de piloter shotframe depuis un script, un build ou un autre agent.
---

# shotframe — pilotage par une machine

Une seconde porte d'entrée sur le **même** moteur, pour un script de build, un
générateur de docs ou une IA dans un autre projet. Détail complet et format de
scène : `cli/README.md`.

```
render(spec) → Buffer          cli/api.ts        ← LE CŒUR
  ▲ CLI (cli/main.ts)   ▲ MCP (cli/mcp.ts)   ▲ import direct
```

Les trois façades sont des enveloppes sans logique. `api.ts` porte tout ;
`main.ts` et `mcp.ts` l'appellent, et rien d'autre. Ne jamais y importer React,
ni y remettre une règle de rendu.

## Ce qui rend la chose possible

`cli/dom-shim.ts` installe `document`, `DOMMatrix` et consorts depuis
`@napi-rs/canvas`, et `src/lib/` tourne tel quel. C'est le même `renderScene()`
qui dessine en preview, à l'export web et ici.

**`dom-shim.ts` est le seul endroit où une globale du navigateur se polyfille.**
Il jette sur toute propriété DOM qu'il ne connaît pas : si un crash le nomme, la
réponse est de l'ajouter là, jamais de contourner dans `src/lib/`.

Node ≥ 24 exécute le TypeScript tel quel : `cli/` n'a pas d'étape de build.

`main.ts` charge `api.ts` par `await import()` **après** le parsing des
arguments : l'addon natif de `@napi-rs/canvas` coûte une centaine de
millisecondes, et `--help` comme `styles` n'en ont pas besoin.

## Le repère des calques

- **`src/lib/spec.ts`** décrit une scène sérialisable : réglages, composition, et
  les calques de chaque shot. `layers` est optionnel — une scène sans calques est
  l'usage « embellir sans annoter ». `parseScene` valide comme `parseStyle`, champ
  par champ : un JSON produit par un modèle est une donnée externe.
- **Les calques se placent en fractions de la largeur de leur fenêtre**, `y`
  compris. `inspect()` renvoie où le screenshot atterrit dans cette fenêtre :
  sans lui, une position calculée en pixels tombe trop haut de la hauteur de la
  barre de titre — ou du bezel, sur un cadre d'appareil.
- **Un style se règle dans l'app**, s'exporte en `.json`, se dépose dans
  `~/.shotframe/styles/` et se rappelle par son nom. Aucun réglage n'est dupliqué
  entre l'app et le CLI. `listStyles()` met en cache le style de chaque fichier,
  daté de son `mtime` : un lot de vingt shots au même style ne relit pas vingt
  fois le même `.json`, et un style corrigé pendant qu'un serveur MCP tourne se
  voit au prochain appel.

## Le coût en tokens

**La description des outils MCP est la seule documentation que le modèle lira**,
et elle est relue à chaque tour par tout client connecté. Deux règles :

- Le repère de coordonnées vit dans la description de `shotframe_inspect`, une
  seule fois. `shotframe_render` y renvoie d'une ligne. L'interpoler dans les
  deux le faisait payer deux fois.
- `shotframe_inspect` ne prend que `geometrySettings` — ce qui déplace le
  screenshot dans sa fenêtre. Le grain, la graine ou le format n'ont aucun effet
  sur sa réponse : les exposer coûterait des tokens et laisserait croire
  l'inverse.
- Les `.describe()` par champ du schéma `layer` sont ce qui rend les annotations
  justes : on n'y touche pas.
- Le serveur renvoie **un chemin, jamais l'image** : une PNG en base64 coûterait
  des milliers de tokens par appel pour une image que le modèle n'a pas besoin de
  revoir.
