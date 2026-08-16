# shotframe — Always-On Rules

Ces règles s'appliquent à chaque session Claude sur ce projet. Sans exception.

## Ce que Claude ne doit JAMAIS faire

- Introduire un second chemin de rendu (preview DOM/CSS d'un côté, export canvas
  de l'autre). `renderScene()` est le seul moteur — la fidélité export/preview en
  dépend. **Vaut aussi côté Node** : le CLI et le serveur MCP passent par le même
  `renderScene()`, jamais par un rendu réimplémenté.
- Écrire une dimension en pixels absolus dans le rendu : tout est relatif à la
  largeur du canvas, sinon l'export 3× diverge de la preview.
- Ajouter un appel réseau, quel qu'il soit. L'app doit tourner hors ligne.
- Installer une dépendance sans demande explicite — surtout pas une librairie de
  couleur, de canvas ou de composants UI. `lucide-react` est le seul jeu
  d'icônes sanctionné, importé par le seul `src/components/icons.tsx` : ajouter
  une icône, c'est l'ajouter là, jamais importer `lucide-react` ailleurs.
- Muter un objet de state — toujours de nouvelles copies (spread).

## Organisation des fichiers

- `src/lib/` — logique pure et rendu canvas, un fichier par responsabilité, sans
  import React.
- `src/components/` — composants React en PascalCase, un par fichier.
- `src/hooks/` — hooks `use*`.
- `src/types.ts` — tous les types partagés (`Settings`, `Palette`, `Scene`).
- `cli/` — la porte machine. `api.ts` porte toute la logique ; `main.ts` et
  `mcp.ts` sont des enveloppes qui l'appellent, et rien d'autre. Ne jamais y
  importer React, ni y remettre une règle de rendu.
- **`cli/dom-shim.ts` est le seul endroit où une globale du navigateur se
  polyfille.** Il jette sur toute propriété DOM qu'il ne connaît pas : si un
  crash le nomme, la réponse est de l'ajouter là, jamais de contourner dans
  `src/lib/`.
- Tests dans `src/lib/__tests__/*.test.ts` (logique pure) et
  `cli/__tests__/*.test.ts` (rendu headless).

## Style de code

- TypeScript strict, pas de `any`.
- Fonctions < 50 lignes, fichiers < 400 lignes.
- Erreurs gérées explicitement — pas de `catch` silencieux.
- Commentaires en français, code et identifiants en anglais.
- Les raccourcis assumés portent un commentaire `ponytail:` nommant leur plafond
  et le chemin de mise à niveau.

## Tests

- La logique non triviale laisse un test derrière elle : `quantize()` (palette),
  la géométrie de `renderScene()` à deux échelles.
- Pas de framework E2E ici : l'app est un canvas unique, Vitest suffit.
