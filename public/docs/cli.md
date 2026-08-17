# CLI

```text
screenmat <image…> [options]     render one or more images
screenmat --spec scene.json      full scene, annotations included
screenmat inspect <image>        dimensions and the layer coordinate frame
screenmat styles                 saved styles
```

From a clone of the repository, use `pnpm cli` — it is `node cli/main.ts`:

```bash
pnpm cli screenshot.png --frame macbook --ratio 16:9 --scale 3
```

The package declares `bin.screenmat`, so a linked or installed copy answers to
`screenmat` directly. Both forms are the same file.

Called with no image and no `--spec`, the CLI prints its help and exits 0.

## Options

Only the flags you actually pass are applied. An absent flag lets the style — or
the default — speak; it is never overwritten with `undefined`.

| Flag | Value | Default | Notes |
| --- | --- | --- | --- |
| `-o, --out` | path | `<image>-screenmat.<format>` | Exact output file. |
| `--out-dir` | directory | current directory | Where generated names land. |
| `--spec` | path | — | A [scene file](#scene). Flags override its settings. |
| `--style` | name or path | — | A [saved style](#styles), applied underneath the flags. |
| `--scale` | `1` `2` `3` | `2` | Export scale. Anything else falls back to `2`. |
| `--format` | `png` `webp` | `webp` | Falls back to PNG where the WebP encoder is missing. |
| `--frame` | `browser` `macbook` `iphone` `none` | `browser` | |
| `--background` | `mesh` `gradient` `solid` | `mesh` | `image` needs a scene file. |
| `--ratio` | `auto` `4:3` `1:1` `16:9` `9:16` | `4:3` | |
| `--theme` | `auto` `light` `dark` | `auto` | Frame chrome, not the background. |
| `--url` | text | `example.com` | Address bar text, `frame=browser` only. Truncated at 200 characters. |
| `--padding` | 0 to 0.3 | `0.065` | Fraction of the canvas width. |
| `--radius` | 0 to 0.08 | `0.01` | Window corner radius, same unit. |
| `--seed` | integer | `1` | Same seed, same background, exactly. |
| `--shadow` | 0 to 2 | `1` | Multiplier on the artwork's own shadow. |
| `--grain` | 0 to 1 | `0.35` | Film grain over the background. |
| `--rotate-y` | −24 to 24 | `0` | Degrees of window tilt. |
| `--no-title-bar` | flag | title bar shown | Removes the window chrome bar. |
| `--json` | flag | human line | Machine-readable result on stdout. |
| `-h, --help` | flag | — | |

Out-of-range numbers are clamped, not rejected: `--padding 5` renders at `0.3`.
An unknown value for an enumerated flag falls back to the default. The two
exceptions that do fail are an unknown flag (rejected by `parseArgs`) and a
`--style` name that does not exist — see [Errors](#cli-errors).

Five settings have no flag, because they are background-tuning dials that a
command line rarely needs: `blur`, `shapes`, `shapeOpacity`, `saturation` and
`contrast`. They live in a [scene file](#scene) or a [style](#styles).

## Rendering images

```bash
# One image, defaults.
pnpm cli screenshot.png

# Several, into a folder, with a saved style underneath.
pnpm cli shots/*.png --style docs --out-dir ./build/visuals

# A device frame, tilted, at export scale 3.
pnpm cli app.png --frame iphone --rotate-y -12 --scale 3 --format png
```

Each positional image is rendered in turn and written on its own. `--out` names
a single file, so pass one image with it; with several images, use `--out-dir`.

Without either, the file is written to the **current directory** under
`<basename>-screenmat.<format>` — the input's folder is not reused.

## Rendering a scene

A scene file carries what flags cannot: layers, composition, watermark, frozen
palette, background image. Flags still apply on top of the file's settings,
which makes one scene reusable at several scales.

```bash
pnpm cli --spec scene.json --scale 3 --out hero@3x.webp
```

Without `--out` or `--out-dir`, the output name is derived from the **first
shot's** `input`. The full format is documented in [Scene format](#scene).

## inspect

Prints where the screenshot lands inside its window — the frame you need before
computing any layer position. See [Coordinates](#coordinates).

```bash
pnpm cli inspect screenshot.png --json
```

```json
{
  "imageWidth": 2880,
  "imageHeight": 1800,
  "screen": { "x": 0, "y": 0.035, "w": 1, "h": 0.625 },
  "titleBar": 0.035,
  "canvas": { "width": 1600, "height": 1200 },
  "input": "screenshot.png"
}
```

The geometry flags apply here too: `--frame`, `--ratio`, `--padding`,
`--radius`, `--rotate-y` and `--no-title-bar` all move the screenshot inside its
window, so pass the same ones you will pass to the render.

## styles

Lists what is in the styles directory, and where that directory is.

```bash
pnpm cli styles --json
```

```json
{
  "directory": "/Users/you/.screenmat/styles",
  "styles": [
    { "name": "docs", "label": "Docs", "frame": "macbook", "background": "mesh", "ratio": "16:9", "format": "webp" }
  ]
}
```

`name` is what `--style` takes. See [Styles](#styles).

## Output

A render prints one line per file:

```text
screenshot-screenmat.webp  3200×2400  188464 octets
```

With `--json`, the same render prints an object — this is the form to parse:

| Field | Meaning |
| --- | --- |
| `output` | Path actually written. |
| `width`, `height` | Final pixel size, scale included. |
| `bytes` | File size. |
| `format` | The real format — `png` if the WebP encoder was missing. |
| `settings` | The complete resolved settings, defaults and style merged in. |

`inspect` and `styles` print JSON either way: `--json` makes it a single line,
without it the same object is pretty-printed.

> **Note** — `format` in the result is the authoritative one. When a build of
> Node has no WebP encoder, screenmat falls back to PNG rather than writing a
> file whose extension lies about its contents.

## Errors

Messages go to **stderr** and the process exits with code **1**. Everything on
stdout is either the report or the JSON, so a pipeline can read stdout safely.

| Message | Cause |
| --- | --- |
| `inspect attend le chemin d'une image` | `inspect` called with no path. |
| `Impossible de lire <path> : …` | File missing or unreadable. |
| `Impossible de décoder <path> : …` | Not an image, or an unsupported codec. |
| `Style « x » introuvable dans <dir> — disponibles : …` | Unknown `--style`. The available names are listed for you. |
| `Scène illisible : ce n'est pas du JSON` | `--spec` file is not valid JSON. |
| `Une scène a besoin d'au moins un shot…` | No entry in `shots` had a usable `input`. |

Unlike the MCP server, the CLI writes wherever you point it and **overwrites an
existing file**. That is the contract of a command-line tool; the guard rails
are on the [MCP side](#mcp-writing-safely), where a remote model picks the path.
