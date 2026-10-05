# Publication npm de la porte machine — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre `screenmat` publiable sur npm — `pnpm dlx screenmat …`,
`import … from 'screenmat/node'`, serveur MCP `screenmat-mcp` — et publier par
la CI sur tag.

**Architecture:** `tsc` émet `cli/` et ce qu'il importe de `src/` vers `dist/`
en conservant l'arborescence (les chemins relatifs à `import.meta.url` restent
justes) et en réécrivant les imports `.ts` en `.js`. Les polices sont copiées à
côté. Un test construit, empaquette, installe le tarball dans un dossier vide
et l'exécute comme un utilisateur. Un workflow publie sur tag `v*`.

**Tech Stack:** TypeScript 6.0.3 (`rewriteRelativeImportExtensions`), Node 24,
pnpm 10.12.1, Vitest 4, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-05-publication-npm-design.md`

## Global Constraints

- Aucune dépendance ajoutée. `pnpm` exclusivement (`npm view` en lecture seule toléré).
- Nom `screenmat`, version `0.1.0`, `engines.node` `>=24`.
- `files` : `dist/`, `README.md`, `LICENSE` — jamais `public/wallpapers` (© Apple, © Microsoft).
- `dependencies` vide ; `react`, `react-dom`, `lucide-react` en `devDependencies` ; les quatre optionnelles inchangées.
- Dans le dépôt, `pnpm cli`, `pnpm mcp` et les tests exécutent toujours les `.ts`.
- Commentaires en français, messages d'erreur du CLI en français, doc `public/docs/` en anglais.
- Personne ne publie depuis une machine : seul `release.yml` lance `pnpm publish`.

## Review Focus

1. **Plateforme sans binaire `@napi-rs/canvas`** (optionnelle, donc l'install réussit sans) — attendu : `screenmat shot.png` sort 1 avec « `@napi-rs/canvas` n'est pas installé… », pas une trace `ERR_MODULE_NOT_FOUND`. → Task 2, test `--no-optional`.
2. **`--background` d'un fond macOS/Windows depuis le paquet** — attendu : message qui dit pourquoi le fond manque et où l'avoir. → Task 2.
3. **Capture d'URL depuis le paquet** — le processus enfant doit être `capture-child.js` ; attendu : la capture marche. → Task 1, test gardé par la présence d'un navigateur.
4. **Fichiers périmés dans `dist/`** (un ancien build, un test compilé) — attendu : le tarball ne contient que ce que le build courant produit. → Task 1 (`dist/` vidé avant build, contrôle du contenu).
5. **Serveur MCP lancé depuis le paquet** — attendu : `screenmat-mcp` est installé et démarre sans erreur. → Task 1.

---

### Task 1: Un paquet qui s'installe et tourne

**Files:**
- Create: `tsconfig.publish.json`
- Create: `scripts/build-cli.ts`
- Create: `cli/__tests__/package.test.ts`
- Modify: `package.json`
- Modify: `cli/capture.ts:179` (chemin du processus enfant)
- Modify: `docs/superpowers/specs/2026-10-05-publication-npm-design.md` (deux écarts, step 9)

**Interfaces:**
- Produces: `pnpm build:cli` (vide `dist/`, compile, copie les polices) ;
  `prepack` qui l'appelle ; dans le test, les helpers `run(bin, args, cwd)` et
  le dossier `project` (projet temporaire où le tarball est installé), réutilisés par la Task 2.

- [ ] **Step 1: Écrire le test du paquet (rouge)**

`cli/__tests__/package.test.ts` :

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { execFile } from 'node:child_process'
import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

/* Le paquet tel qu'un utilisateur le reçoit : construit, empaqueté, installé
   dans un projet vide, puis exécuté. C'est le seul test qui voit `dist/` —
   tous les autres exécutent les `.ts` du dépôt. */

const exec = promisify(execFile)
const ROOT = resolve(import.meta.dirname, '../..')

let work: string
let project: string
let tarball: string

async function run(bin: string, args: string[], cwd = project) {
  return exec(join(project, 'node_modules/.bin', bin), args, { cwd })
}

function fixture(): Buffer {
  const canvas = createCanvas(400, 300)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1d4ed8'
  ctx.fillRect(0, 0, 400, 300)
  return canvas.toBuffer('image/png')
}

beforeAll(async () => {
  work = resolve(await mkdtemp(join(tmpdir(), 'screenmat-pack-')))
  // `prepack` lance `build:cli` : empaqueter, c'est aussi construire.
  await exec('pnpm', ['pack', '--pack-destination', work], { cwd: ROOT })
  tarball = join(work, (await readdir(work)).find((name) => name.endsWith('.tgz'))!)

  project = join(work, 'project')
  await exec('mkdir', ['-p', project])
  await writeFile(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }))
  await exec('pnpm', ['add', tarball, '--prefer-offline'], { cwd: project })
  await writeFile(join(project, 'shot.png'), fixture())
}, 180_000)

afterAll(async () => {
  await rm(work, { recursive: true, force: true })
})

describe('paquet npm', () => {
  it('ne contient que dist/, les polices et les métadonnées', async () => {
    const { stdout } = await exec('tar', ['-tzf', tarball])
    const entries = stdout.split('\n').filter(Boolean)
    expect(entries).toContain('package/dist/cli/main.js')
    expect(entries).toContain('package/dist/cli/capture-child.js')
    expect(entries.some((entry) => entry.startsWith('package/dist/public/fonts/'))).toBe(true)
    expect(entries.filter((entry) => /wallpapers|components|__tests__|\.ts$/.test(entry) && !entry.endsWith('.d.ts'))).toEqual([])
  })

  it('répond à --help', async () => {
    const { stdout } = await run('screenmat', ['--help'])
    expect(stdout).toContain('screenmat')
  })

  it('rend une image', async () => {
    await run('screenmat', ['shot.png', '-o', 'out.webp'])
    expect((await stat(join(project, 'out.webp'))).size).toBeGreaterThan(0)
  })

  it('expose l’API Node', async () => {
    const { stdout } = await exec(
      process.execPath,
      ['--input-type=module', '-e', "const m = await import('screenmat/node'); console.log(Object.keys(m).sort().join())"],
      { cwd: project },
    )
    expect(stdout.trim().split(',')).toEqual(expect.arrayContaining(['capture', 'inspect', 'render']))
  })

  it('démarre le serveur MCP', async () => {
    // Sur stdio, le serveur attend un client : vivant au bout d'une seconde,
    // c'est qu'il a démarré sans planter.
    const child = execFile(join(project, 'node_modules/.bin/screenmat-mcp'), { cwd: project })
    let stderr = ''
    child.stderr?.on('data', (chunk) => (stderr += chunk))
    await new Promise((done) => setTimeout(done, 1000))
    expect(child.exitCode).toBeNull()
    child.kill()
    expect(stderr).toBe('')
  })
}, 180_000)
```

- [ ] **Step 2: Lancer le test, constater le rouge**

Run: `pnpm vitest run cli/__tests__/package.test.ts`
Expected: FAIL — `pnpm pack` refuse un paquet `private`, ou le tarball pointe
vers des `.ts` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`).

- [ ] **Step 3: Configuration de compilation**

`tsconfig.publish.json` :

```json
{
  "extends": "./tsconfig.cli.json",
  "compilerOptions": {
    "noEmit": false,
    "allowImportingTsExtensions": false,
    "rewriteRelativeImportExtensions": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": [],
  "files": ["cli/main.ts", "cli/mcp.ts", "cli/api.ts", "cli/capture-child.ts"]
}
```

`scripts/build-cli.ts` :

```ts
/**
 * Construit le paquet npm : vide `dist/`, compile la porte machine, copie les
 * polices que `dom-shim.ts` lit par `../public/fonts/`. Seul le paquet en a
 * besoin — dans le dépôt, `cli/` tourne tel quel.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, rmSync } from 'node:fs'

// Un fichier d'un build précédent partirait sinon dans le tarball.
rmSync('dist', { recursive: true, force: true })
execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.publish.json'], { stdio: 'inherit' })
cpSync('public/fonts', 'dist/public/fonts', { recursive: true })
```

- [ ] **Step 4: `package.json`**

- Retirer `"private": true`.
- `"bin": { "screenmat": "./dist/cli/main.js", "screenmat-mcp": "./dist/cli/mcp.js" }`
- `"exports": { "./node": { "types": "./dist/cli/api.d.ts", "default": "./dist/cli/api.js" } }`
- `"files": ["dist", "README.md", "LICENSE"]`
- Scripts : `"build:cli": "node scripts/build-cli.ts"`, `"prepack": "pnpm build:cli"`.
- Déplacer `react`, `react-dom`, `lucide-react` de `dependencies` vers
  `devDependencies` (mêmes versions) ; supprimer la clé `dependencies` vide.

Puis : `pnpm install` (met le lockfile à jour, aucun paquet nouveau).

- [ ] **Step 5: Le processus enfant suit l'extension du module**

`cli/capture.ts`, remplacer la ligne 179 :

```ts
/** `capture-child.ts` dans le dépôt, `.js` dans le paquet npm : `tsc` réécrit
 *  les imports, pas une chaîne passée à `new URL()`. */
const CHILD = fileURLToPath(new URL(`./capture-child${extname(fileURLToPath(import.meta.url))}`, import.meta.url))
```

et ajouter `import { extname } from 'node:path'` aux imports.

- [ ] **Step 6: Capture d'URL depuis le paquet (Review Focus 3)**

Ajouter dans `cli/__tests__/package.test.ts`, dans le `describe` :

```ts
  it('capture une URL avec le processus enfant compilé', async () => {
    const { createServer } = await import('node:http')
    const server = createServer((_, response) => response.end('<body style="background:#0f0"></body>'))
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
    const { port } = server.address() as import('node:net').AddressInfo
    try {
      await run('screenmat', [`http://127.0.0.1:${port}/`, '-o', 'url.webp'])
      expect((await stat(join(project, 'url.webp'))).size).toBeGreaterThan(0)
    } catch (error) {
      // Sans navigateur, seul le message d'absence est toléré — et pas en CI.
      const text = String((error as { stderr?: string }).stderr ?? error)
      if (process.env.CI || !/aucun navigateur trouvé|n’est pas installé/.test(text)) throw error
    } finally {
      server.close()
    }
  })
```

- [ ] **Step 7: Lancer, constater le vert**

Run: `pnpm vitest run cli/__tests__/package.test.ts`
Expected: PASS (7 tests). Puis `pnpm typecheck` et `pnpm test` : tout vert.

- [ ] **Step 8: Vérifier que le web n'a rien perdu**

Run: `pnpm build`
Expected: `✓ built` — Vite embarque React depuis les devDependencies.

- [ ] **Step 9: Aligner la spec sur deux écarts**

Dans la spec : `scripts/copy-fonts.ts` → `scripts/build-cli.ts` (vide aussi
`dist/` et lance `tsc`) ; « `--offline` » → « `--prefer-offline` » (une
résolution hors ligne échoue sans métadonnées en cache, qu'une install
`--frozen-lockfile` ne garantit pas) ; et `prepack` lance le build.

- [ ] **Step 10: Commit**

```bash
git add tsconfig.publish.json scripts/build-cli.ts cli/__tests__/package.test.ts cli/capture.ts package.json pnpm-lock.yaml docs/superpowers/specs/2026-10-05-publication-npm-design.md
git commit -m "feat: paquet npm compilé de la porte machine"
```

---

### Task 2: Ce qui manque au paquet se dit

**Files:**
- Modify: `cli/api.ts:82-91` (`wallpaper`)
- Modify: `cli/main.ts:32` (`engine`), `cli/main.ts:92-93` (aide)
- Test: `cli/__tests__/package.test.ts`

**Interfaces:**
- Consumes: `run`, `project`, `tarball` (Task 1).
- Produces: messages `WALLPAPERS_MISSING` (api.ts) et canvas absent (main.ts).

- [ ] **Step 1: Tests rouges**

Ajouter dans le `describe('paquet npm')` :

```ts
  it('dit pourquoi un fond macOS ou Windows manque', async () => {
    await expect(run('screenmat', ['shot.png', '--background', 'tahoe-dark', '-o', 'bg.webp'])).rejects.toMatchObject({
      stderr: expect.stringContaining('paquet npm'),
    })
  })

  it('dit quoi installer quand @napi-rs/canvas manque', async () => {
    const bare = join(work, 'bare')
    await exec('mkdir', ['-p', bare])
    await writeFile(join(bare, 'package.json'), JSON.stringify({ name: 'bare', private: true, type: 'module' }))
    await exec('pnpm', ['add', tarball, '--prefer-offline', '--no-optional'], { cwd: bare })
    await writeFile(join(bare, 'shot.png'), fixture())
    await expect(
      exec(join(bare, 'node_modules/.bin/screenmat'), ['shot.png'], { cwd: bare }),
    ).rejects.toMatchObject({ stderr: expect.stringContaining('`@napi-rs/canvas` n’est pas installé') })
  })
```

Si `pnpm add` refuse `--no-optional` : écrire la dépendance dans le
`package.json` de `bare` (`"dependencies": { "screenmat": "file:<tarball>" }`)
puis `pnpm install --no-optional --prefer-offline`.

Run: `pnpm vitest run cli/__tests__/package.test.ts`
Expected: FAIL ×2 — `Impossible de lire …tahoe-dark.webp` et une trace
`ERR_MODULE_NOT_FOUND`.

- [ ] **Step 2: Fond d'écran absent**

`cli/api.ts` : importer `access` depuis `node:fs/promises`, puis remplacer
`const loading = decode(file)` par `const loading = decodeWallpaper(file)` et
ajouter sous `wallpaper()` :

```ts
/** Les fonds macOS et Windows ne sont pas dans le paquet npm : ils ne sont pas
 *  sous licence MIT (`public/wallpapers/NOTICE.md`). */
const WALLPAPERS_MISSING =
  'Les fonds macOS et Windows ne sont pas inclus dans le paquet npm (© Apple, © Microsoft) : les utiliser depuis un clone du dépôt screenmat.'

async function decodeWallpaper(file: string): Promise<Image> {
  try {
    await access(file)
  } catch {
    throw new Error(WALLPAPERS_MISSING)
  }
  return decode(file)
}
```

- [ ] **Step 3: `@napi-rs/canvas` absent**

`cli/main.ts`, remplacer `const engine = () => import('./api.ts')` :

```ts
/** `@napi-rs/canvas` est optionnel : une plateforme sans binaire installe le
 *  paquet quand même. Le dire plutôt que laisser passer une trace de module. */
const engine = () =>
  import('./api.ts').catch((error: unknown) => {
    const missing = (error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND' && String(error).includes('@napi-rs/canvas')
    if (!missing) throw error
    throw new Error('`@napi-rs/canvas` n’est pas installé, ou sans binaire pour cette plateforme : `pnpm add @napi-rs/canvas`')
  })
```

Et dans `HELP`, sous `${wrap(SERIES.windows, 3, '                     ')}` :

```
                   (macOS et Windows : depuis un clone du dépôt, pas le paquet npm)
```

- [ ] **Step 4: Vert**

Run: `pnpm vitest run cli/__tests__/package.test.ts && pnpm typecheck && pnpm test`
Expected: PASS partout.

- [ ] **Step 5: Commit**

```bash
git add cli/api.ts cli/main.ts cli/__tests__/package.test.ts
git commit -m "feat: messages clairs pour les fonds et le canvas absents du paquet"
```

---

### Task 3: Publication par la CI sur tag

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Le workflow**

```yaml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      # Provenance npm : la signature prouve que le paquet sort de ce dépôt.
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
          registry-url: https://registry.npmjs.org

      # Un tag qui ne dit pas la version du paquet publierait autre chose que
      # ce qu'il annonce.
      - name: Tag et version concordent
        run: |
          version=$(node -p "require('./package.json').version")
          test "${GITHUB_REF_NAME}" = "v${version}" || { echo "tag ${GITHUB_REF_NAME} ≠ version ${version}"; exit 1; }

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck

      - run: pnpm exec playwright-core install --with-deps --only-shell chromium

      - run: sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0

      - run: pnpm test

      # `prepack` reconstruit `dist/` avant d'empaqueter.
      - run: pnpm publish --provenance --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Valider la syntaxe**

Run: `ruby -ryaml -e 'YAML.load_file(".github/workflows/release.yml"); puts "ok"'`
Expected: `ok`. Vérifier le garde à la main :
`GITHUB_REF_NAME=v0.1.0 sh -c 'version=$(node -p "require(\"./package.json\").version"); test "$GITHUB_REF_NAME" = "v$version" && echo match'`
Expected: `match`. Avec `v9.9.9` : rien, code 1.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: publication npm sur tag, avec provenance"
```

---

### Task 4: Documentation

**Files:**
- Modify: `README.md` (section « The machine door », l. 76+), `README.fr.md` (« La porte machine », l. 77+)
- Modify: `public/docs/overview.md:42` (Requirements), Quickstart
- Modify: `public/docs/mcp.md:9-11` (Connecting)
- Modify: `CLAUDE.md` (Key Commands)
- Modify: `.claude/skills/screenmat-machine/SKILL.md` (« `cli/` n'a pas d'étape de build »)

- [ ] **Step 1: README.md** — juste sous le paragraphe d'ouverture de « The machine door » :

````markdown
```bash
# From any project — no clone needed.
pnpm dlx screenmat screenshot.png --frame macbook
pnpm add -D screenmat            # for a build script: import { render } from 'screenmat/node'
```

The npm package ships everything but the macOS and Windows wallpapers, which
are © Apple and © Microsoft: use those from a clone of this repository.
````

Et remplacer la ligne MCP par
`claude mcp add screenmat -- pnpm dlx -p screenmat screenmat-mcp`, en gardant
la forme `node /absolute/path/…/cli/mcp.ts` comme alternative depuis un clone.

- [ ] **Step 2: README.fr.md** — même bloc, en français :

````markdown
```bash
# Depuis n'importe quel projet — sans cloner.
pnpm dlx screenmat capture.png --frame macbook
pnpm add -D screenmat            # pour un script de build : import { render } from 'screenmat/node'
```

Le paquet npm contient tout sauf les fonds d'écran macOS et Windows, © Apple et
© Microsoft : ceux-là s'utilisent depuis un clone du dépôt.
````

Même remplacement de la ligne MCP.

- [ ] **Step 3: `public/docs/overview.md`** — Requirements, remplacer la première puce par :

```markdown
- **Node 24 or newer.** From npm, `pnpm dlx screenmat` or `pnpm add -D screenmat`;
  the package is compiled JavaScript. From a clone, Node runs the TypeScript in
  `cli/` directly — there is no build step.
- **Wallpapers.** The macOS and Windows backgrounds are © Apple and © Microsoft
  and are not in the npm package; they work from a clone only.
```

- [ ] **Step 4: `public/docs/mcp.md`** — Connecting :

````markdown
```bash
claude mcp add screenmat -- pnpm dlx -p screenmat screenmat-mcp
```

From a clone: `claude mcp add screenmat -- node /absolute/path/to/screenmat/cli/mcp.ts`.
````

Et dans l'exemple JSON : `"command": "pnpm", "args": ["dlx", "-p", "screenmat", "screenmat-mcp"]`.

- [ ] **Step 5: `CLAUDE.md`** — Key Commands, ajouter :

```
pnpm build:cli          # paquet npm : dist/ (inutile pour pnpm cli / pnpm mcp)
```

Et dans le skill `screenmat-machine`, remplacer « Node ≥ 24 exécute le
TypeScript tel quel : `cli/` n'a pas d'étape de build. » par :

```markdown
Node ≥ 24 exécute le TypeScript tel quel : dans le dépôt, `cli/` n'a pas
d'étape de build. Le paquet npm, lui, est compilé (`pnpm build:cli`,
`tsconfig.publish.json`) — un chemin passé à `new URL()` n'est pas réécrit par
`tsc` : le construire depuis l'extension du module courant (voir `CHILD` dans
`capture.ts`). Les fonds macOS et Windows n'y sont pas.
```

- [ ] **Step 6: Vérifier la doc**

Run: `pnpm test` (tests `src/docs/__tests__` compris) et `pnpm build`.
Expected: vert.

- [ ] **Step 7: Commit**

```bash
git add README.md README.fr.md public/docs/overview.md public/docs/mcp.md CLAUDE.md .claude/skills/screenmat-machine/SKILL.md
git commit -m "docs: installer screenmat depuis npm"
```

---

### Task 5: Vérification finale et PR

- [ ] **Step 1:** `pnpm typecheck && pnpm test && pnpm build` — vert, sortie constatée.
- [ ] **Step 2:** `pnpm pack --dry-run` — lister le contenu, aucun `wallpapers`, taille annoncée.
- [ ] **Step 3:** Agent `typescript-reviewer` sur `git diff main...HEAD` ; corriger le confirmé.
- [ ] **Step 4:** Pousser, ouvrir la PR (Conventional Commits français, sans attribution), plan de test inclus. Ne **pas** pousser de tag : la publication revient au propriétaire, après création du secret `NPM_TOKEN`.
