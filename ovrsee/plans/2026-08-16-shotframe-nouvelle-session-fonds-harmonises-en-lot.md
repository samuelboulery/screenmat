---
{
  "status": "open",
  "title": "shotframe — nouvelle session + fonds harmonisés en lot",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# shotframe — nouvelle session + fonds harmonisés en lot

## Contexte

Deux manques constatés à l'usage :

1. **Aucun moyen de repartir de zéro.** Une fois des shots chargés, seul un
   rechargement de la page vide l'éditeur. `useShots.reset()` existe déjà
   (`src/hooks/useShots.ts:288`) mais n'est appelé nulle part.
2. **Les fonds d'un même projet divergent.** Le fond est dérivé de la palette de
   *chaque* screenshot (`extractPalette` → `Scene.palette`). Sur un lot issu d'un
   seul produit, un écran pâle et un écran très coloré sortent avec des fonds
   d'intensités très différentes. L'override de palette par un style existe déjà,
   mais il uniformise *tout* : on perd la teinte propre à chaque écran. Il manque
   l'entre-deux — garder la teinte, aligner saturation et luminance.

## 1. Nouvelle session

- `src/components/icons.tsx` — exporter `FilePlus2 as NewSessionIcon` (seul
  fichier autorisé à importer `lucide-react`).
- `src/components/TopBar.tsx` — prop `onNewSession: () => void` ; `IconButton`
  (`ui.tsx`) dans le groupe droit, avant la nav, rendu seulement si `showModes`
  (rien à réinitialiser sur l'écran d'import).
- `src/App.tsx` — handler `newSession` :
  `shots.reset()` + `setSettings(DEFAULT_SETTINGS)` +
  `setComposition(DEFAULT_COMPOSITION)` + `setBackgroundImage(null)` +
  `setBatchRatios(['16:9'])` + `setScale(2)` + `setView('editor')` +
  `setMode('compose')` + `setFailure(null)` + `batch.reset()`.
  Garde-fou : `window.confirm()` natif si des shots sont chargés — l'image de
  fond importée n'est pas dans le snapshot d'annulation, un ⌘Z ne la rendrait
  pas. Pas de modale maison.
- `src/hooks/useBatch.ts` — ajouter `reset()` (vide `queue`, `rendered`, `total`,
  `error`) : sans lui la file affiche la progression du lot précédent, dont les
  `shotId` n'existent plus.

La bibliothèque (styles, historique IndexedDB) n'est **pas** touchée : elle
survit à la session, c'est son rôle.

## 2. Harmonisation des fonds d'un lot

Fonction pure dans `src/lib/palette.ts` — `harmonizePalettes(palettes)` :

- moyenne de la saturation et de la luminance des `base` du lot ; idem sur
  l'ensemble des `accents` (deux cibles distinctes) ;
- chaque couleur est ramenée à ces deux cibles **en gardant sa teinte** :
  `withSaturation` (helper local : le canal max ne bouge pas, les deux autres se
  rapprochent ou s'écartent de lui — la teinte dépend des rapports d'écarts)
  puis `withLuminance` (existe déjà, `src/lib/color.ts:22`, et une mise à
  l'échelle multiplicative préserve la saturation HSV).
- Réutilise `saturation()`/`toHex()` de `palette.ts`, `hexToRgb`/`luminance`/
  `withLuminance` de `color.ts`. Aucune dépendance ajoutée.

Câblage :

- `src/lib/export.ts` — `buildBatchJobs(..., palette?, harmonize = false)` :
  quand le drapeau est levé, les palettes des shots passent par
  `harmonizePalettes` avant d'alimenter chaque job. Un override de palette par
  un style reste prioritaire (il uniformise déjà tout).
- `src/App.tsx` — état `harmonizeBackgrounds` (défaut **off**, c'est une option
  à cocher), passé à `buildBatchJobs` dans `startBatch` et à `BatchScreen`.
- `src/components/BatchScreen.tsx` — section « Consistency » avec une case,
  libellé `Harmonize backgrounds`, sous-ligne mono expliquant
  « same saturation and contrast across the batch ». La liste « Ratio set »
  répète déjà ce balisage de case : en extraire un `CheckRow` local et le
  réutiliser pour les deux (net négatif en lignes).

## 3. Tickets ovrsee

Le gate d'édition exige un ticket lié au plan actif. À créer avant la première
édition, colonne `backlog`, `plan` = le fichier de plan capturé :

- `T-0016` — Nouvelle session sans rechargement.
- `T-0017` — Option d'harmonisation des fonds en lot.

## Vérification

- `pnpm test` — nouveau test dans `src/lib/__tests__/palette.test.ts` :
  deux palettes d'intensités opposées → après `harmonizePalettes`, luminances et
  saturations des `base` égales à ε près, et teinte de chacune conservée
  (`hue()` inchangé). Test aussi le cas gris (saturation 0, pas de division par
  zéro) et le lot d'une seule palette (inchangé).
- `pnpm exec tsc -b` — TypeScript strict (`tsc --noEmit` ne vérifie rien ici).
- `pnpm dev` puis à la main : charger 3 screenshots d'intensités différentes,
  cocher l'option, `Export all`, comparer les fonds du zip avec et sans l'option ;
  cliquer « New session » → écran d'import, styles toujours présents.
