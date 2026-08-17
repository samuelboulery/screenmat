# Overview

shotframe turns a raw screenshot into a shareable visual: a rounded macOS-style
window, a generative background derived from the screenshot's own colours,
annotations, redaction, multi-shot compositions, high-resolution export.

The web app is one door. This documentation is about the other one — the
**machine door**: the same engine, callable from a build script, a docs
generator, or an AI agent in another project.

```text
                    render(spec) → Buffer
                    inspect(input) → geometry
                          cli/api.ts
                              ▲
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   cli/main.ts           cli/mcp.ts            import
   command line          MCP over stdio        from a script
```

The three façades are wrappers with no logic of their own. `api.ts` holds
everything, and `api.ts` calls `renderScene()` — the very same function that
draws the live preview in the browser. There is one rendering path in this
project, so a file produced here is identical to what the app would export.

## What you can drive

- Frame a screenshot (`browser`, `macbook`, `iphone`, or no frame at all).
- Generate a deterministic background (`mesh`, `gradient`, `solid`, or an image).
- Place annotations: text, badges, arrows, lines, boxes, ellipses.
- Redact a region — blurred, pixelated, or filled, **baked into the pixels**.
- Compose several shots (`stack`, `side`, `tilt3d`) in one visual.
- Stamp a watermark.
- Recall a style saved from the app by name, so a machine never restates a
  dozen settings.

## Requirements

- **Node 24 or newer.** It runs TypeScript directly, so `cli/` has no build step.
- **`@napi-rs/canvas`**, which provides Canvas 2D outside the browser. It ships
  as an `optionalDependency`, together with `@modelcontextprotocol/sdk` and
  `zod` for the MCP server. The web bundle contains none of them.

```bash
pnpm install
```

`cli/dom-shim.ts` installs `document`, `DOMMatrix` and friends on top of
`@napi-rs/canvas`, and `src/lib/` runs unchanged. That shim is the only place in
the project where a browser global is polyfilled.

## Quickstart

Three ways in, same engine, same output.

```bash
# Command line — defaults are already good.
pnpm cli screenshot.png
# → screenshot-shotframe.webp  3200×2400  188464 octets
```

```ts
// Node script — the direct import.
import { render } from 'shotframe/node'
import { writeFile } from 'node:fs/promises'

const { buffer, width, height } = await render({
  input: 'docs/screenshot.png',
  settings: { frame: 'macbook', ratio: '16:9' },
  scale: 2,
})

await writeFile('docs/hero.png', buffer)
```

```bash
# AI agent — register the MCP server once.
claude mcp add shotframe -- node /absolute/path/to/shotframe/cli/mcp.ts
```

## Which façade reaches what

Every façade goes through the same validator, but they do not expose the same
surface. When a setting is missing from the one you are using, the scene file
(`--spec`) or the Node API always has it.

| Capability | CLI | MCP | Node API |
| --- | --- | --- | --- |
| Frame, ratio, padding, radius, rotation, theme, URL, seed, grain, shadow | yes | yes | yes |
| `blur`, `shapes`, `shapeOpacity`, `saturation`, `contrast` | `--spec` only | `--spec` only | yes |
| Annotation layers | `--spec` only | yes | yes |
| `radius`, `arrowHead`, `invert`, `hidden` on a layer | `--spec` only | no | yes |
| Multi-shot composition | `--spec` only | `layout` + `spread` | yes |
| Watermark, frozen palette, background image | `--spec` only | no | yes |
| Named style | yes | yes | yes |

## Guarantees

- **No network call, ever.** Not in the app, not here. Everything is local.
- **One rendering path.** Preview, web export, CLI and MCP all call
  `renderScene()`. The export matches the preview by construction.
- **External JSON is validated field by field.** A scene produced by a model is
  untrusted input: every value is checked, clamped, or replaced by its default.
  See [Scene format](#scene).
- **Redaction is baked into the pixels** under the window clip, never applied in
  CSS. Masked data is unreadable in the exported file.

## Where to go next

- [CLI](#cli) — every flag, with its default and its bounds.
- [MCP server](#mcp) — the three tools an agent sees, and the write guard.
- [Node API](#api) — `render()` and `inspect()` signatures.
- [Scene format](#scene) — the full JSON, field by field.
- [Coordinates](#coordinates) — read this before placing a single layer.
- [Styles](#styles) — set it once in the app, recall it by name.
- [Recipes](#recipes) — short, runnable examples, and troubleshooting.
