# Publication npm de la porte machine — design

Date : 2026-10-05 · Statut : à relire

## Pourquoi

La capture d'URL (#24) rend la porte machine utile hors du dépôt : un script,
une CI ou un agent veut `pnpm dlx screenmat https://… -o hero.webp` sans cloner
screenmat. Aujourd'hui le paquet est `private`, ses commandes pointent vers des
`.ts` que Node refuse d'exécuter depuis `node_modules`, et ses `dependencies`
tireraient React chez chaque utilisateur du CLI.

**Réussi quand** : un tag `v0.1.0` poussé publie `screenmat` sur npm avec
provenance, et dans un dossier vide `pnpm dlx screenmat --help`,
`pnpm dlx screenmat shot.png` et `import { render } from 'screenmat/node'`
fonctionnent.

## Décisions prises

- Nom : `screenmat` (libre sur npm au 2026-10-05). Version initiale `0.1.0`.
- Build : `tsc` émet du JS, sans dépendance nouvelle (approche A). Écartés : un
  bundler (dépendance, addon natif de `@napi-rs/canvas` et import paresseux de
  Playwright à gérer) ; publier les `.ts` (Node ne retire pas les types sous
  `node_modules`).
- Publication par la CI sur tag, `pnpm publish --provenance`. Personne ne
  publie depuis une machine.
- Les fonds macOS et Windows (© Apple, © Microsoft) ne sont **pas** dans le
  paquet.

## Le paquet

| Champ | Valeur |
| --- | --- |
| `private` | retiré |
| `version` | `0.1.0` |
| `bin` | `screenmat` → `dist/cli/main.js` ; `screenmat-mcp` → `dist/cli/mcp.js` |
| `exports["./node"]` | `{ types: ./dist/cli/api.d.ts, default: ./dist/cli/api.js }` |
| `files` | `dist/`, `README.md`, `LICENSE` |
| `engines.node` | `>=24` (inchangé) |
| `dependencies` | aucune |
| `optionalDependencies` | `@napi-rs/canvas`, `@modelcontextprotocol/sdk`, `zod`, `playwright-core` (inchangé) |
| `devDependencies` | + `react`, `react-dom`, `lucide-react` (déplacés : Vite les embarque dans le bundle web) |

Les optionnelles s'installent par défaut, `pnpm dlx` compris : un utilisateur
du CLI les a sans rien faire, et une plateforme sans binaire `@napi-rs/canvas`
installe quand même le reste.

`.npmignore` n'est pas utilisé : `files` est une liste blanche, rien d'autre ne
sort.

## Le build — `pnpm build:cli`

1. `tsc -p tsconfig.publish.json` :
   - `files` : `cli/main.ts`, `cli/mcp.ts`, `cli/api.ts`, `cli/capture-child.ts`.
     Seul ce qu'ils importent est émis (≈ 45 fichiers, 560 Ko avec les `.d.ts`) :
     ni `src/hooks/`, ni composants, ni tests.
   - `outDir: dist`, `rootDir: .` — la structure est conservée
     (`dist/cli/`, `dist/src/lib/`), donc tout chemin relatif à
     `import.meta.url` reste juste.
   - `rewriteRelativeImportExtensions`, `declaration`, mêmes options strictes
     que `tsconfig.cli.json`.
2. `scripts/build-cli.ts` (Node, sans dépendance) porte tout le build : vide
   `dist/` (un fichier d'un build précédent partirait sinon dans le tarball),
   lance l'étape 1, puis copie `public/fonts/` → `dist/public/fonts/`, que
   `dom-shim.ts` lit par `../public/fonts/`.

`prepack` lance `pnpm build:cli` : `pnpm pack` et `pnpm publish` construisent
toujours ce qu'ils empaquettent.

Le shebang `#!/usr/bin/env node` de `main.ts` et `mcp.ts` passe tel quel.
`dist/` est ignoré par git.

Dans le dépôt rien ne change : `pnpm cli`, `pnpm mcp` et les tests exécutent
toujours les `.ts` directement.

## Ce qui change dans le code

- **`cli/capture.ts`** : le processus enfant prend l'extension du module
  courant — `capture-child.ts` dans le dépôt, `capture-child.js` dans le
  paquet. Une chaîne passée à `new URL()` n'est pas réécrite par `tsc`.
- **`cli/api.ts`** : un fond d'écran dont le fichier manque jette
  « Les fonds macOS et Windows ne sont pas inclus dans le paquet npm (© Apple,
  © Microsoft) : les utiliser depuis un clone du dépôt » au lieu de
  `Impossible de lire …`.
- **`cli/main.ts`** : l'aide le signale sous `--background`.

## Release — `.github/workflows/release.yml`

Sur `push` d'un tag `v*` :

1. checkout, pnpm, Node 24 avec `registry-url: https://registry.npmjs.org`.
2. Garde : le tag sans `v` égale `version` de `package.json`, sinon échec.
3. `pnpm install --frozen-lockfile`, `pnpm typecheck`, Chromium (comme `ci.yml`),
   `pnpm test`, `pnpm build:cli`.
4. `pnpm publish --provenance --access public --no-git-checks`, avec
   `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`.

Permissions du job : `contents: read`, `id-token: write` (provenance).

## Vérification avant publication

`cli/__tests__/package.test.ts`, lent, exécuté par `pnpm test` :

1. `pnpm build:cli` puis `pnpm pack` dans un dossier temporaire.
2. Le tarball ne contient ni `public/wallpapers`, ni `src/components`,
   ni `__tests__`, et contient `dist/public/fonts/`.
3. Installation du tarball dans un projet temporaire
   (`pnpm add <tarball>`), puis :
   - `screenmat --help` sort 0 ;
   - `screenmat shot.png -o out.webp` écrit un fichier ;
   - `node -e "import('screenmat/node')"` trouve `render`, `inspect`, `capture` ;
   - `--background tahoe-dark` échoue avec le message des fonds absents.

Le test s'installe depuis le store pnpm déjà peuplé (`--prefer-offline`) :
la CI n'a pas besoin du réseau npm au-delà de l'install normale. Pas
`--offline` : une résolution hors ligne échoue sans métadonnées en cache, et
une install `--frozen-lockfile` ne les garantit pas.

## Documentation

- `README.md` / `README.fr.md`, `public/docs/overview.md` (Requirements,
  Quickstart) : `pnpm dlx screenmat …`, `pnpm add -D screenmat`, et le serveur
  MCP par `claude mcp add screenmat -- pnpm dlx -p screenmat screenmat-mcp`.
- `public/docs/mcp.md` (Connecting) : la même ligne.
- `CLAUDE.md` et skill `screenmat-machine` : « `cli/` n'a pas d'étape de
  build » devient « tourne tel quel dans le dépôt ; `pnpm build:cli` ne sert
  qu'au paquet npm ».

## Hors périmètre

- `screenmat serve` et l'image Docker (cycle suivant).
- L'extension navigateur.
- Un changelog automatisé : la release GitHub du tag suffit pour l'instant.

## Ce qui revient au propriétaire

- Créer un jeton npm « Automation » (ou configurer la publication de
  confiance par OIDC) et l'ajouter au dépôt en secret `NPM_TOKEN`.
- Pousser le tag `v0.1.0`.
