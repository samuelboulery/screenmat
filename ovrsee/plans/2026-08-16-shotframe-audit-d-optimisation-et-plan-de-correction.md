---
{
  "status": "open",
  "title": "shotframe — audit d'optimisation et plan de correction",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — audit d'optimisation et plan de correction

## Contexte

Audit de performance sur tout le dépôt : app web, moteur de rendu, CLI, serveur
MCP, build et tests. Trois explorations parallèles ont produit un inventaire ;
les points chauds ont ensuite été **mesurés** au banc (`@napi-rs/canvas`, canvas
3200×2400, soit un export à l'échelle 2), parce que deux des constats les plus
gros étaient mal chiffrés dans l'inventaire et qu'un troisième, invisible à la
lecture, dominait tout le reste.

Résultat : le moteur est sain, mais **deux appels précis coûtent 100 à 300 fois
leur voisinage**, et le rendu ne cache rien entre deux frames alors que
l'essentiel du dessin est invariant pendant un geste.

Le périmètre couvre une seconde ressource : **les tokens que le dépôt fait
consommer à un modèle**. Le contexte résident du projet et les schémas d'outils
du serveur MCP sont relus à chaque tour ; ils se paient en `cache_read` comme le
reste. Ils sont traités au point 6.

## Ce qui a été mesuré

`renderScene` seul ment sur son coût : skia diffère la rastérisation. Les chiffres
ci-dessous forcent la rastérisation (encodage PNG ou relecture).

| Scénario | Mesure |
|---|---|
| 1 shot, 0 calque, rendu seul | 2,9 ms |
| 1 shot, 20 rectangles | 3,1 ms |
| 5 shots `tilt3d` | 4,0 ms |
| **1 shot, 1 zone floutée** | **372 ms** |
| 1 shot, 2 zones floutées | 373 ms *(le coût est par frame, pas par zone)* |
| 1 shot, 1 zone floutée, `grain: 0` | 171 ms |
| Rendu + encodage PNG, `grain: 0` | 370 ms |
| **Rendu + encodage PNG, `grain: 0.35`** | **1 118 ms** |
| Grain : `createPattern` + `setTransform` | 470 ms |
| Grain : tuile pré-mise à l'échelle, blittée en boucle | **69 ms** |
| Démarrage `node cli/main.ts --help` | 180 ms *(dont 104 ms de `require('@napi-rs/canvas')`)* |
| `pnpm test` (178 tests) | 5,5 s |
| Bundle web | 97,7 Ko gzip JS · 7,5 Ko CSS · 84 Ko polices |

Le bundle, les tests et la structure des composants ne sont pas des problèmes.
Tout le gain est dans quatre endroits.

Côté tokens (comptés sur le contenu réel, ≈ 4 caractères par token) :

| Surface | Coût | Relu quand |
|---|---|---|
| `CLAUDE.md` | ~4 000 tok | **chaque tour**, toute session sur le dépôt |
| `.claude/rules/shotframe-conventions.md` | ~630 tok | **chaque tour**, et répète largement le précédent |
| Schémas MCP (`tools/list`) | ~1 660 tok | **chaque tour**, tout client connecté au serveur |
| — dont `shotframe_render` | ~1 034 tok | |
| — dont `shotframe_inspect` | ~522 tok | |
| — dont `shotframe_list_styles` | ~107 tok | |
| `cli/README.md` | ~1 285 tok | à la demande seulement |
| `node cli/main.ts --help` | ~300 tok | à la demande seulement |

Le CLI est déjà sobre (chemins et messages courts, pas d'image en base64 dans les
réponses MCP) : il n'y a rien à y prendre. Tout le poids est résident.

## Plan

### 1. Le floutage ne relit plus le canvas de destination — `src/lib/layers.ts`

`downsample()` échantillonne avec `layer.drawImage(ctx.canvas, …)`
(`layers.ts:77`) : lire le canvas de destination force le rasteriseur à vider
toute la frame en cours, puis le reste de la frame se rasterise une seconde fois.
D'où 2,9 ms → 372 ms dès qu'**une** zone existe. C'est le premier poste, de loin,
et il frappe autant la preview que l'export web, le CLI et le MCP.

Correction : échantillonner **le screenshot source**, jamais la destination.

- Extraire `screenRect(box, geometry, settings)` dans **`src/lib/frame.ts`** :
  le rectangle où le screenshot atterrit dans sa fenêtre. La règle existe déjà
  trois fois, dispersée — `renderFrame` (`frame.ts:176` pour browser/none,
  `drawDeviceShell` pour le bezel macbook/iphone) et `inspect()`
  (`cli/api.ts:209`). La factoriser est un prérequis, pas un bonus.
- `renderRedactions` mappe le rect du calque (fractions de largeur de fenêtre,
  via `toPixels`) vers les pixels de `shot.image` avec ce rectangle, borne au
  cadre de l'image, et dessine la tuile réduite **sous `windowTransform`** au
  lieu de la poser en espace écran.
- `renderRedactions` a donc besoin du `shot`, pas seulement de ses annotations :
  ajuster l'appel dans `render.ts:236`.
- Une zone qui déborde de l'image (barre de titre, bezel) est bornée ; si elle
  n'a plus d'intersection, elle retombe sur l'aplat `#0B0B0F` déjà utilisé par
  le mode `solid`. Laisser un commentaire `ponytail:` qui nomme ce choix.

Deux effets de bord bienvenus : le plafond documenté dans `CLAUDE.md` (« la zone
floutée est échantillonnée sans la rotation de la fenêtre ») disparaît, puisque
la tuile suit désormais la transformation ; et `inspect()` cesse de renvoyer un
`screen` faux pour `frame: 'macbook'` et `'iphone'`, où il ignore aujourd'hui le
bezel.

Mettre à jour la section « Reste à faire » de `CLAUDE.md` en conséquence.

### 2. Le grain se blitte au lieu de se peindre en motif — `src/lib/noise.ts`

`applyGrain` remplit tout le canvas avec un `CanvasPattern` mis à l'échelle
(`noise.ts:51-60`). L'ombrage par motif coûte 470 ms sur 7,7 Mpx ; la même tuile
pré-mise à l'échelle et blittée en boucle coûte 69 ms, pixel pour pixel
identique (mêmes origines entières, même répétition).

- `noiseTile()` garde son cache actuel ; ajouter à côté un cache d'une seule
  entrée `{ scale, canvas }` pour la tuile de `128 × scale` px, dessinée une fois
  avec `imageSmoothingEnabled = false`.
- `applyGrain` conserve son `globalCompositeOperation = 'overlay'` et son alpha,
  et remplace le `fillRect` par une double boucle `drawImage`. Le mode de fusion
  n'est pas en cause — mesuré à 535-640 ms quel que soit le mode.

### 3. Le fond est mis en cache entre deux frames — `src/lib/background.ts`

`renderBackground` refait à chaque frame l'aplat, les blobs (canvas hors écran
+ ré-agrandissement) et le grain plein canvas. Pendant qu'on déplace un calque,
rien de tout ça ne change. Et comme `applyGrain` est appelé **avant** que les
fenêtres soient dessinées (`render.ts:226` après `renderBackground`), le fond
complet, grain compris, est une image indépendante : elle se cache telle quelle.

- Cache à une seule entrée `{ key, canvas }` dans `background.ts`. Clé =
  chaîne des seuls champs lus : `width`, `height`, `scale`, `settings.background`,
  `blur`, `shapes`, `shapeOpacity`, `saturation`, `contrast`, `grain`, `seed`,
  `palette.base`, `palette.accents`, et l'identité de `backgroundImage`.
- Succès de cache → `ctx.drawImage(cache, 0, 0)`. Échec → on peint dans le canvas
  hors écran, puis on le blitte.
- La clé doit être exhaustive : un champ oublié fige le fond. Le test de
  `background.test.ts` doit couvrir « changer `seed` change les pixels » et
  « ne rien changer réutilise le cache ».

### 4. Un `pointermove` par frame — `src/components/Preview.tsx`

Un seul `pointermove` déclenche aujourd'hui trois passes de rendu React :
`setDrag` local, puis `onTranslate` qui remonte l'état des shots jusqu'à `App`,
puis l'effet de `useHistory` qui appelle `setHistory` (`useHistory.ts:58`). Une
souris à 1000 Hz produit donc ~3000 rendus/s pour 60 dessins de canvas — le
`requestAnimationFrame` de `useCanvasScene:113` est correctement annulé et
replanifié, lui, donc le canvas ne dessine pas plus que nécessaire.

- Dans `Preview.tsx`, `onPointerMove` ne fait plus qu'écrire le dernier point
  dans une ref et planifier un `requestAnimationFrame` s'il n'y en a pas déjà un
  en vol ; le corps actuel du handler s'exécute dans cette frame. `lastPoint`
  existe déjà pour cette raison (`Preview.tsx:215-219`), la ref s'y ajoute
  naturellement. Annuler la frame en attente sur `pointerup` et au démontage.
- Dans `useCanvasScene.ts:109`, ne pas appeler `setGeometry` quand la géométrie
  est identique à la précédente (comparer `width`, `height` et les champs de
  `window`) : `computeGeometry` renvoie un objet neuf à chaque dessin, ce qui
  force aujourd'hui un rendu React de plus par frame.

### 5. Finitions

| # | Fichier | Correction |
|---|---|---|
| 5.1 | `cli/main.ts` | `await import('./api.ts')` après le parsing des arguments. `--help`, `--version` et `styles` ne chargent plus l'addon natif : 180 ms → ~30 ms. La sonde WebP de `dom-shim.ts:54` ne coûte qu'1 ms — la laisser. |
| 5.2 | `cli/api.ts:116-127` | `buildScene()` décode les shots en série. `Promise.all` sur les `decode()`. |
| 5.3 | `cli/styles-dir.ts:42-52` | `resolveStyle()` relit et reparse tout `~/.shotframe/styles/` à chaque appel. Cache mémoire invalidé par le `mtime` du dossier (un `stat` par appel) — le MCP est un processus long, un cache sans garde masquerait un style ajouté en cours de session. |
| 5.4 | `src/lib/render.ts:236,242` | `visible(shot)` appelle `flatten()` deux fois par fenêtre et par frame. Le calculer une fois par fenêtre, réutiliser pour les deux boucles. |
| 5.5 | `src/lib/store.ts:126` | `historyBytes()` fait un `getAll()` sur le magasin de métadonnées, qui porte les vignettes en dataURL : ~1 Mo de base64 désérialisé pour faire une somme. Parcourir au curseur, ou sommer depuis les entrées déjà chargées par `useLibrary`. |
| 5.6 | `src/lib/image.ts:70` | `makeThumbnail` génère 320 px pour un affichage à 208 px. Passer le défaut à 240. |
| 5.7 | `index.html` | Ajouter `<link rel="preload" as="font" type="font/woff2" crossorigin>` sur `space-grotesk-latin.woff2` et `jetbrains-mono-latin.woff2` (pas les `-ext`). |
| 5.8 | `package.json` | Ajouter `"typecheck": "tsc -b"`. `tsc --noEmit` ne vérifie rien ici et le piège est déjà documenté dans `CLAUDE.md` — autant le rendre injouable. |

### 6. Consommation de tokens par l'IA

Une session vaut `taille du contexte × nombre de tours`. Aujourd'hui ce dépôt
impose ~4 630 tokens résidents par tour, plus ~1 660 si le serveur MCP est
connecté. Cible : ~1 200 + ~1 150. Sur une session de 60 tours, ~200 k tokens de
`cache_read` en moins.

#### 6.1 Le contexte résident du projet

`CLAUDE.md` et `.claude/rules/shotframe-conventions.md` sont **tous deux
résidents** et répètent les mêmes cinq règles (un seul chemin de rendu, aucun
appel réseau, pas de dépendance sans demander, TS strict sans `any`, commentaires
`ponytail:`). Un seul des deux survit — `CLAUDE.md`, canal par défaut du projet ;
`.claude/rules/shotframe-conventions.md` est supprimé après avoir versé ce qu'il
apporte en propre (organisation des fichiers, `dom-shim.ts` seul lieu de
polyfill, emplacement des tests) dans les sections correspondantes.

`CLAUDE.md` retombe à ~1 200 tokens et ne garde que ce qui casse le produit s'il
est ignoré : le pitch, `Constraints`, `Code Conventions`, `Key Commands`, et
trois lignes de pointeurs vers les skills. Le reste part dans
`.claude/skills/`, où il ne coûte que son nom et sa description tant qu'il n'est
pas invoqué :

| Skill | Reçoit | Description déclenchante sur |
|---|---|---|
| `shotframe-da` | « Direction artistique — Afterglow », « Écrans », « Raccourcis », « Références visuelles » | couleur, token, icône, composant, écran, raccourci, accent, sélection, typographie |
| `shotframe-moteur` | l'arbre `src/`, les invariants de rendu détaillés (fractions de largeur, `windowMatrix`, `bounds()`, `inkOn()`, PRNG, flou par downscale) | `renderScene`, canvas, calque, annotation, floutage, export, géométrie, palette |
| `shotframe-machine` | « Pilotage par une machine », le format de scène, `~/.shotframe/styles/` | CLI, MCP, `render(spec)`, `inspect`, scène JSON |

Le risque est réel et nommé : un agent qui écrit du composant sans invoquer
`shotframe-da` diverge de la direction artistique. Deux garde-fous, tous les deux
nécessaires — la description du skill est écrite pour se déclencher sur les mots
qui apparaissent naturellement dans la demande, et `CLAUDE.md` garde la phrase
qui rend l'oubli visible : « toucher à un composant, une couleur, une icône ou un
raccourci sans avoir lu `shotframe-da`, c'est faire diverger la DA ».

L'arbre d'architecture (~830 tok) est le plus gros poste et le plus déductible :
`ls src/lib` donne les mêmes noms. Ce qui n'est pas déductible — `render.ts` est
le moteur unique, `tree.ts` est le seul chemin de manipulation de l'arbre,
`spec.ts` valide une donnée externe — tient en trois lignes qui restent
résidentes.

#### 6.2 Les schémas d'outils du serveur MCP — `cli/mcp.ts`

- Le bloc `REPERE` (`mcp.ts:20-28`, ~230 tok) est interpolé **mot pour mot** dans
  les descriptions de `shotframe_render` et de `shotframe_inspect`. Il ne reste
  que dans `shotframe_inspect`, dont c'est la raison d'être ; `shotframe_render`
  le remplace par une ligne qui renvoie vers l'outil. Le commentaire d'en-tête du
  fichier (« la description des outils est la seule documentation que le modèle
  lira ») reste vrai : la prose de placement n'est pas supprimée, elle cesse
  d'être payée deux fois.
- Le schéma `settings` (`mcp.ts:59-75`, 14 champs) est inliné dans les deux
  outils. `inspect()` ne lit que la géométrie : il ne prend plus que `frame`,
  `ratio`, `padding`, `radius`, `rotateY` et `titleBar`. Les huit autres
  (`grain`, `seed`, `format`, `theme`, `url`, `shadow`, `background`) n'ont aucun
  effet sur sa réponse — les exposer coûte des tokens et laisse croire l'inverse.
  Scinder en `geometrySettings` et `settings = geometrySettings.extend({…})`.
- Ne pas toucher aux `.describe()` par champ du schéma `layer` : c'est ce qui
  rend les annotations justes, et c'est le seul endroit où cette prose existe.

## Ce qu'on ne fait pas, et pourquoi

- **Découpage de bundle par écran.** 97,7 Ko gzip au total, React compris. Les
  quatre écrans partagent l'essentiel de leur code ; le gain serait de quelques
  kilo-octets contre une frontière `Suspense` sur un outil mono-canvas.
- **`React.memo` sur les gros composants.** Sans callbacks stables sur les 28
  props d'`EditorScreen`, `memo` ne fait rien. La coalescence du point 4 supprime
  la cause ; à mesurer de nouveau ensuite, pas avant.
- **Virtualisation des listes** (`Filmstrip`, `LayersPanel`, `HistoryScreen`).
  Aucune ne dépasse quelques dizaines d'éléments en usage réel.
- **Worker + `OffscreenCanvas` pour le lot.** Déjà inscrit dans « Reste à faire ».
  Les points 1 à 3 divisent le coût par item d'abord ; le worker se juge après.
- **Mise en cache des dégradés, `save`/`restore` groupés, `measureText`.**
  Mesurés sous le bruit (20 rectangles coûtent 0,2 ms de plus que zéro).
- **`crc32`, copies de tampons du zip.** Une passe linéaire par fichier, aucun
  chiffre ne la désigne.
- **Alléger le CLI ou les réponses MCP côté tokens.** Déjà sobres : `--help`
  tient en 26 lignes, les erreurs en une phrase, et `shotframe_render` renvoie un
  chemin plutôt qu'une image en base64 — le commentaire de `mcp.ts:123` dit
  pourquoi. Rien à prendre.
- **Compresser `ovrsee/`** (61 tickets, 400 Ko). Rien n'y est résident : les
  tickets ne se lisent qu'à travers leur skill, à la demande.

## Vérification

1. `pnpm test` — la suite doit rester verte. Les tests de rendu headless de
   `cli/__tests__/render.test.ts` couvrent déjà l'homothétie export/preview.
2. Ajouter deux tests : `background.test.ts` sur l'invalidation du cache de fond
   (même réglages = mêmes pixels et cache réutilisé ; `seed` changée = pixels
   différents), et un test de `screenRect()` sur les quatre cadres.
3. **Non-régression visuelle du floutage** : rendre par le CLI un screenshot avec
   une zone floutée, avant et après, aux échelles 1 et 3, et comparer les fichiers
   à l'œil — la zone doit couvrir exactement le même rectangle, et rester
   illisible.
4. Rejouer le banc : `render(spec)` sur un shot avec une zone floutée et
   `grain: 0.35` doit passer sous ~120 ms là où il est à ~1 100 ms aujourd'hui.
5. `time node cli/main.ts --help` — attendu sous 50 ms.
6. `pnpm dev`, puis dans le navigateur : glisser un calque sur une scène avec
   floutage et vérifier au profileur que la frame tient sous 16 ms, et que le
   nombre de rendus React par seconde plafonne à ~60. **Les mesures ci-dessus
   sont côté Node/skia** ; le navigateur accélère une partie du dessin, donc les
   gains 2 et 3 doivent être reconfirmés là — le gain 1, lui, tient dans les deux
   cas puisqu'il supprime une relecture, pas un calcul.
7. `pnpm build` et `pnpm typecheck`.
8. **Tokens résidents** : `wc -c CLAUDE.md` doit tomber sous ~5 000 caractères,
   et `.claude/rules/shotframe-conventions.md` ne doit plus exister. Vérifier
   qu'aucune règle des cinq invariants n'a disparu au passage — elle doit être
   soit dans `CLAUDE.md`, soit dans un skill, jamais nulle part.
9. **Tokens MCP** : rejouer la sonde qui a produit le tableau —
   `initialize` puis `tools/list` sur `node cli/mcp.ts`, et mesurer le
   `JSON.stringify` de chaque outil. Attendu : total sous ~4 800 caractères
   (~1 150 tok) contre 6 654 aujourd'hui.
10. **Non-régression de justesse du MCP** : demander à un modèle, via le serveur,
    de flouter une zone lue en pixels sur un screenshot, sans autre indication.
    Il doit appeler `shotframe_inspect` d'abord et poser la zone au bon endroit —
    c'est ce que le `REPERE` déplacé doit continuer de garantir.
