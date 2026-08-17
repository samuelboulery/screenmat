<div align="center">

# screenmat

**Turn a raw screenshot into a visual worth sharing.**
A rounded macOS-style window, a background generated from the screenshot's own
colours, annotations, redaction — rendered entirely in your browser.

[![CI](https://github.com/samuelboulery/screenmat/actions/workflows/ci.yml/badge.svg)](https://github.com/samuelboulery/screenmat/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-7DE2FF.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-A378FF.svg)](https://react.dev)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org)
[![No backend](https://img.shields.io/badge/backend-none-2ea043.svg)](#privacy-by-construction)

English · [Français](README.fr.md)

<img src="docs/assets/hero.webp" alt="The screenmat editor, framed by screenmat itself" width="900">

</div>

---

## Why

- **Nothing leaves the machine.** No backend, no account, no upload, not a single
  network request once the page is loaded — fonts included. Your screenshots stay
  where they were taken.
- **One rendering path.** The live preview, the web export, the CLI and the MCP
  server all call the same `renderScene()`. A 3× export is the exact homothety of
  what you saw, by construction rather than by vigilance.
- **Redaction is baked into the pixels**, never applied as a CSS filter. What is
  masked is genuinely unreadable in the exported file.
- **Deterministic output.** Same seed, same background, pixel for pixel — so a
  docs pipeline can regenerate a whole set and get byte-identical results.
- **Two doors.** A human opens the app; a build script, a docs generator or an AI
  agent goes through the CLI, the MCP server or the Node API.

## What it does

| | |
| --- | --- |
| **Frames** | `browser` (macOS chrome with an editable address bar), `macbook`, `iphone`, or `none`. Title bar optional, corner radius and Y-axis tilt (−24° to 24°) adjustable. |
| **Backgrounds** | `mesh`, `gradient`, `solid` or your own image — all derived from the dominant colours of the screenshot, with dials for blur, shape count, opacity, saturation, contrast and film grain. |
| **Annotations** | Seven layer kinds: text labels, ranked badges, arrows, lines, boxes, ellipses and redaction. Colour, size, stroke, fill, opacity and inverted contrast per layer. |
| **Redaction** | `blur`, `pixel` or `solid`, baked under the window clip. |
| **Compositions** | Up to 24 shots in one visual: `single`, `stack`, `side` or `tilt3d`, with spread, convergence and elevation. |
| **Layers** | A real tree — groups, reordering, hide, lock, multi-selection, undo/redo. |
| **Styles** | Save a full set of settings under a name, recall it from the app, the CLI, MCP or Node. Share it as a `.json` file. |
| **Batch** | Queue a folder of screenshots, render them with one style, download a single `.zip`. |
| **History** | Past exports live in IndexedDB with their thumbnails, reopenable with every setting intact. |
| **Export** | WebP by default (7–10× lighter than PNG at equal grain), PNG on demand, at 1× / 2× / 3× — 1600, 3200 or 4800 px wide. |

### Before · after

| The raw screenshot | The same one, framed and annotated |
| --- | --- |
| <img src="docs/assets/before.webp" alt="A raw, unedited screenshot" width="420"> | <img src="docs/assets/annotated.webp" alt="The same screenshot with a generated background, badges, a callout and a baked blur" width="420"> |

Badges, a callout arrow and a blur over the address bar — the blur is in the
pixels, not on top of them.

## Quickstart

```bash
pnpm install
pnpm dev
```

Then paste a screenshot (`⌘V`) or drop a file. That is the whole setup — there is
nothing to configure and nowhere to sign in.

Requirements: **Node 24 or newer** and **pnpm**. Node 24 runs the TypeScript in
`cli/` directly, so the machine door has no build step.

## The machine door

The same engine, called by something other than a human. `render(spec)` is the
core; the CLI, the MCP server and a direct import are thin wrappers around it.

```bash
# Command line — the defaults are already good.
pnpm cli screenshot.png
# → screenshot-screenmat.webp  3200×2400  188464 bytes

# A whole folder, one style, one destination.
pnpm cli shots/*.png --style docs --out-dir ./build

# A full scene: annotations, redaction, composition.
pnpm cli --spec scene.json --scale 3 -o hero@3x.webp
```

```ts
// Node script — the direct import.
import { render } from 'screenmat/node'
import { writeFile } from 'node:fs/promises'

const { buffer, width, height } = await render({
  input: 'screenshot.png',
  settings: { frame: 'macbook', ratio: '16:9' },
  scale: 2,
})

await writeFile('docs/hero.webp', buffer)
```

```bash
# AI agent — register the MCP server once.
claude mcp add screenmat -- node /absolute/path/to/screenmat/cli/mcp.ts
```

Three MCP tools: `screenmat_render` (writes a file, returns its path — never the
image bytes), `screenmat_inspect` (the layer coordinate frame, to call before
placing an annotation) and `screenmat_list_styles`. Nothing is ever overwritten,
and every written path is confined to the configured output root.

**Full documentation lives in [`public/docs/`](public/docs/)** — one source,
served two ways: the `/docs` page of the app renders it, and the raw `.md` files
read fine on GitHub, through `curl`, or handed to a model.

| Page | What is in it |
| --- | --- |
| [overview.md](public/docs/overview.md) | The tour, the requirements, a 60-second start |
| [cli.md](public/docs/cli.md) | Every flag, with its default and its bounds |
| [mcp.md](public/docs/mcp.md) | Wiring, the write guard, the three tools |
| [api.md](public/docs/api.md) | `render()` and `inspect()`, return types, errors |
| [scene.md](public/docs/scene.md) | The scene JSON, field by field |
| [coordinates.md](public/docs/coordinates.md) | The layer coordinate frame — read before placing one |
| [styles.md](public/docs/styles.md) | Set it once in the app, recall it by name |
| [recipes.md](public/docs/recipes.md) | Runnable examples, then troubleshooting |
| [llms.txt](public/docs/llms.txt) | The index to hand to a model |

## Keyboard shortcuts

Modifier combinations work anywhere in the app; bare keys apply when the canvas
has focus, so no single-key shortcut ever steals a keystroke from a panel.

| | |
| --- | --- |
| `⌘E` / `⌘C` | Export · copy to clipboard |
| `⌘Z` / `⇧⌘Z` | Undo · redo |
| `⌘D` · `⌘A` | Duplicate · select every layer |
| `⌘G` / `⇧⌘G` | Group · ungroup |
| `⌘↑` / `⌘↓` | Move the layer up or down the stack |
| `⌘V` | Paste a screenshot |
| `R` | Shuffle — a new seed, a new background |
| `1` `2` `3` | Export scale |
| Arrows (`⇧` for a large step) | Nudge the selection |
| `⌫` · `Esc` | Delete · deselect |

## Privacy by construction

The app makes no network request after load, has no analytics, no telemetry and
no third-party runtime beyond React and Lucide icons. Preferences live in
`localStorage`, styles and history in IndexedDB, fonts are bundled. Sharing a
style means exporting a `.json` file — there is no server to share it through.

## Project layout

```
src/lib/          the engine: pure logic and Canvas 2D, no React import
src/components/   the interface, one PascalCase component per file
src/hooks/        use* hooks
cli/              the machine door: api.ts, main.ts (CLI), mcp.ts (MCP server)
public/docs/      the documentation source, in Markdown
```

`src/lib/render.ts` holds the one and only rendering engine, `src/lib/tree.ts`
the one and only path for manipulating the layer tree, and `src/lib/spec.ts`
validates every piece of external data — an imported style or a scene written by
a model is untrusted input, checked field by field and clamped to its bounds.

## Development

```bash
pnpm dev          # dev server
pnpm build        # tsc -b && vite build
pnpm typecheck    # tsc -b, across app, node and cli
pnpm test         # Vitest — pure logic plus headless CLI rendering
```

Only two runtime dependencies: React and `lucide-react`. Colour handling, canvas
work, zip writing and the UI components are all written by hand, on purpose.

## Contributing

Issues and pull requests are welcome. Open an issue before a large change, keep
`pnpm typecheck` and `pnpm test` green, and write commits in the
[Conventional Commits](https://www.conventionalcommits.org) style. Code and
identifiers are in English; comments in this codebase are in French.

## License

[MIT](LICENSE) © Samuel Boulery
