---
{
  "status": "open",
  "title": "Audit global shotframe — constats et plan de correction",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# Audit global shotframe — constats et plan de correction

## Context

Demande : audit global du code (verbosité, code mort, sécurité). L'audit est
fait ; ce document en donne le résultat puis le plan de correction retenu.

Le verdict d'ensemble est bon : 11 608 lignes, 79 fichiers, **zéro `any`, zéro
`@ts-ignore`, zéro `eslint-disable`, zéro `innerHTML`/`eval`, zéro URL distante,
zéro secret, zéro TODO/FIXME**, et 11 marqueurs `ponytail:` qui nomment chacun
leur plafond. Les primitives de validation (`src/lib/parse.ts`) sont
centralisées et correctes — `num()` rejette `NaN` et `Infinity`, les chaînes
sont tronquées, les tableaux bornés. Le travail ci-dessous porte sur une
poignée de vrais défauts, pas sur un redressement.

### Ce qui a été écarté après vérification

Trois constats remontés par l'audit sont des faux positifs, à ne pas corriger :

- **« path traversal » dans le CLI** (`--out`, `--spec`, chemin d'image) : lire
  et écrire le fichier qu'on lui désigne est le contrat d'un CLI. `cat` a la
  même « faille ». Seul le serveur MCP est une vraie frontière, parce que c'est
  un modèle distant qui choisit les chemins — traité en §1.
- **`clamp` dupliqué** entre `parse.ts:20` et `tree.ts:156` : signatures
  différentes (`(value,min,max)` contre `(index,length)`), pas une duplication.
- **Couleurs en dur de `AnnotationStyle.tsx:23`** (`BASE_COLORS`) : ce sont des
  encres peintes sur le canvas, pas du chrome. Elles doivent rester en hex, un
  `var(--color-accent)` n'a aucun sens passé à `ctx.fillStyle`.

Le `fetch` de `useExport.ts:89` porte sur une URL objet locale et son
commentaire le dit — conforme à la contrainte hors-ligne.

---

## §1 — Durcir l'écriture du serveur MCP

`cli/mcp.ts:117` résout `args.output` puis `writeFile` : un modèle distant
choisit librement le chemin **et écrase silencieusement** ce qui s'y trouve.
Le contenu écrit est une PNG rendue, donc le risque n'est pas l'exécution de
code mais la destruction d'un fichier existant.

Deux garde-fous dans `cli/mcp.ts`, sans toucher à `cli/api.ts` :

1. **Racine d'écriture.** `ROOT = resolve(process.env.SHOTFRAME_OUT ?? dirname(premier input))`.
   Choisir le dossier du screenshot d'entrée plutôt que `cwd` garde le cas
   nominal — « shotframe écrit à côté de la capture qu'on lui a donnée » — sans
   exception à écrire. `SHOTFRAME_OUT` élargit pour qui le veut, comme
   `SHOTFRAME_STYLES` le fait déjà pour les styles (`cli/styles-dir.ts:10`).
   Un `output` qui sort de `ROOT` fait échouer l'appel avec un message qui
   nomme la racine.
2. **Jamais d'écrasement.** `writeFile(..., { flag: 'wx' })`. Sur `EEXIST`,
   suffixer `-2`, `-3`… et renvoyer le chemin réellement écrit dans le JSON de
   retour — le modèle apprend le vrai chemin, et re-rendre deux fois le même
   screenshot reste un geste normal au lieu d'une erreur.

Le CLI (`cli/main.ts`) n'est **pas** modifié : `--out` doit continuer d'écrire
où on lui dit.

Ajouter une ligne à `cli/README.md` sur le périmètre d'écriture du MCP.

## §2 — Code mort et invariants tenus à la main

- **Supprimer `mix()`** — `src/lib/color.ts:62`. Vérifié : aucune référence
  hors de sa définition, tests compris.
- **Unifier `SKEW`** — `src/lib/frame.ts:71` et `src/lib/render.ts:30`
  déclarent tous deux `0.3`, avec un commentaire en `frame.ts:69` qui *demande*
  de les garder égaux. Exporter la constante depuis `frame.ts`, l'importer dans
  `render.ts`, supprimer le commentaire : l'invariant devient structurel.
- **Un seul `type Point`** — défini trois fois à l'identique (`draft.ts:12`,
  `frame.ts:76`, `handles.ts:9`). Le garder dans `frame.ts` (le plus bas dans
  la chaîne de dépendances) et le ré-exporter ailleurs, en gardant l'import
  existant de `Preview.tsx:12` fonctionnel.

## §3 — Une borne manquante

`src/lib/styles.ts:141-146` valide le préfixe du `dataUrl` du filigrane par
regex mais **ne borne pas sa longueur**, alors que le fichier tronque `name` à
64 et `url` à 200 juste à côté. Un `.json` importé peut donc pousser plusieurs
mégaoctets en base64 dans IndexedDB. Ajouter un plafond explicite (~2 Mio) et
rejeter au-delà, dans le même style que les voisins.

## §4 — Test sur la couche de validation

`src/lib/parse.ts` est la brique dont dépendent `parseStyle` **et**
`parseScene`, les deux frontières de données externes du projet — et c'est le
seul module non testé qui compte. `image.ts`, `store.ts` (DOM/IndexedDB),
`noise.ts` et `random.ts` ne justifient pas de test.

Un `src/lib/__tests__/parse.test.ts` couvrant : `num()` face à `NaN`,
`Infinity`, `-Infinity`, `"3"` et `null` ; `oneOf()` sur une valeur hors liste ;
`isRecord()` sur un tableau et sur `null` ; `clamp()` aux bornes.

## §5 — Dette de forme

### Fichiers au-dessus du plafond de 400 lignes

- **`src/App.tsx` (503)** — un seul composant `App()` : ~230 lignes de câblage
  puis ~230 de routage JSX. Extraire deux hooks :
  - `src/hooks/useDocument.ts` ← les mémos `composed`/`scene`/`geometry`/
    `output` (lignes 85-136) et les `patch`/`compose`.
  - `src/hooks/useSessionActions.ts` ← `reopen`, `startBatch`, `newSession`
    (lignes 186-254).

  App ne garde alors que le routage de vue et le passage de props.
- **`src/components/Preview.tsx` (446)** — sortir `describeScene()` (429) et
  `marqueeStyle()` (442), déjà des fonctions de module, vers un
  `src/components/preview-helpers.ts`. Suffit à repasser sous la barre.
- **`src/components/Inspector.tsx` (425)** — sortir les tables de constantes
  `RATIOS`/`LAYOUTS`/`BACKGROUNDS`/`DEPTHS` (26-45) vers un
  `src/components/inspector-options.ts`.

Découpes mécaniques, aucun changement de comportement.

### Couleurs de chrome hors tokens

Chrome DOM peint en hex au lieu d'un token de `src/index.css` :
`SelectionOverlay.tsx:56,85` (`#7DE2FF` → `var(--color-accent)`),
`ui.tsx:74` (`#23232C`), `ui.tsx:237` (`#FFC9C9`),
`TopBarActions.tsx:38` (`#6F7386` → `var(--color-dim)`).
Les aperçus de fond d'`Inspector.tsx:36-38` sont des vignettes qui imitent
l'artwork : les laisser en hex.

Un rayon hors des cinq déclarés : `border-radius: 2px` sur le curseur de slider,
`src/index.css:237,247` → `--radius-xs`.

---

## Vérification

```bash
pnpm exec tsc -b          # app + node + cli ; tsc --noEmit ne vérifie rien ici
pnpm test                 # doit rester vert, + le nouveau parse.test.ts
pnpm build
```

Sur le durcissement MCP (§1), quatre cas à faire tourner à la main via
`pnpm mcp` ou un appel direct à l'outil :

1. `shotframe_render` sans `output` → écrit `<input>-shotframe.png` à côté de
   l'entrée, comme avant.
2. Le même appel une seconde fois → écrit `…-shotframe-2.png`, ne remplace pas
   le premier fichier, et renvoie le nouveau chemin.
3. `output: "../../evil.png"` → échec, message nommant la racine, **aucun
   fichier créé**.
4. `SHOTFRAME_OUT=/tmp/sf` avec `output: "a.png"` → écrit `/tmp/sf/a.png`.

Sur le reste : `pnpm dev`, charger un screenshot, vérifier que la sélection et
les poignées gardent leur cyan, exporter en 1× et 3× et confirmer que le rendu
est inchangé (la déduplication de `SKEW` touche la géométrie de `tilt3d` — c'est
le seul point où une régression visuelle est possible, à contrôler sur une
composition `tilt3d`).
