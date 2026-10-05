# CLI

```text
screenmat <image|url…> [options] render images — a URL is captured first
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
| `--frame` | `browser` `macbook` `iphone` `none` | `none` | |
| `--background` | `mesh` `gradient` `solid`, a dithered pattern such as `halftone` or `atkinson`, or a macOS or Windows wallpaper such as `tahoe-dark` or `windows-11-dark` | `mesh` | `image` needs a scene file. Full lists: `--help`, or the scene reference. |
| `--ratio` | `auto` `4:3` `1:1` `16:9` `9:16` | `4:3` | |
| `--theme` | `auto` `light` `dark` | `auto` | Frame chrome, not the background. |
| `--url` | text | `example.com` | Address bar text, `frame=browser` only. Truncated at 200 characters. |
| `--padding` | 0 to 0.3 | `0.065` | Fraction of the canvas width. |
| `--radius` | 0 to 0.08 | `0.018` | Window corner radius, same unit. |
| `--seed` | integer | `1` | Same seed, same background, exactly. |
| `--shadow` | 0 to 2 | `1` | Multiplier on the artwork's own shadow. |
| `--grain` | 0 to 1 | `0.35` | Film grain over the background. |
| `--rotate-y` | −24 to 24 | `0` | Degrees of window tilt. |
| `--no-title-bar` | flag | title bar shown | Removes the window chrome bar. |
| `--device-ratio` | flag | off | `frame=macbook` or `iphone`: the screen keeps the device ratio (16:10, 19.5:9) and crops the screenshot. |
| `--screen-ratio` | `auto` `16:10` `16:9` `4:3` `1:1` | `auto` | `frame=browser` or `none`: ratio of the screen. Anything but `auto` crops the screenshot. |
| `--island-side` | `left` `right` | `left` | `frame=iphone` with a landscape screenshot: the short edge that carries the island. |
| `--pan` | `x,y`, each 0 to 1 | `0.5,0.5` | Which part of a cropped screenshot shows: 0 start, 1 end. |
| `--json` | flag | human line | Machine-readable result on stdout. |
| `-h, --help` | flag | — | |

Out-of-range numbers are clamped, not rejected: `--padding 5` renders at `0.3`.
An unknown value for an enumerated flag falls back to the default. What does
fail: an unknown flag (rejected by `parseArgs`), a `--style` name that does not
exist, and a `--screen-ratio`, `--island-side` or `--pan` value outside what the
table lists — see [Errors](#cli-errors).

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

## Capturing a URL

A positional argument that starts with `http://` or `https://` is opened in a
headless browser, captured, then rendered like any image.

```bash
# The page as it loads, framed in a browser window.
pnpm cli https://example.com --frame browser

# Your dev server, full height, in dark mode, once the app has mounted.
pnpm cli http://localhost:5173 --full-page --color-scheme dark --wait '#app'
```

The browser runs on your machine: the installed Google Chrome first, otherwise a
Chromium managed by Playwright. Capture needs `playwright-core`, an optional
dependency; with neither browser present, install one with
`pnpm exec playwright-core install chromium`.

| Flag | Value | Default | Notes |
| --- | --- | --- | --- |
| `--viewport` | `<width>x<height>` | `1440x900` | CSS pixels. Width 320–3840, height 240–2160. |
| `--density` | 1–3 | `2` | `deviceScaleFactor`: 2 keeps the capture sharp at export scale 3. |
| `--full-page` | flag | off | The whole page height, not only the viewport. |
| `--color-scheme` | `light`, `dark` | `light` | What the page reads in `prefers-color-scheme`. Not the window `--theme`. |
| `--wait` | selector or ms | — | A CSS selector to wait for, or a delay in milliseconds (≤ 30000). |

Unlike the render flags, capture values out of range are **rejected**, not
clamped: a capture at the wrong size only shows once the file is open.

The address bar shows the captured host and path (`example.com/pricing`) unless
`--url` says otherwise, and the default output name follows the URL:
`example-com-pricing-screenmat.webp`. Navigation and waiting each time out after
30 seconds. A full page is cut so the capture stays under 100 million pixels.
Chrome runs with its sandbox on; on Linux that needs unprivileged user
namespaces (Ubuntu 24.04: `sysctl kernel.apparmor_restrict_unprivileged_userns=0`). `localhost` and private addresses are allowed — capturing your own
dev server is the first use case. Only `http:` and `https:` are accepted.

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
pnpm cli inspect screenshot.png --frame browser --json
```

```json
{
  "imageWidth": 2880,
  "imageHeight": 1800,
  "screen": { "x": 0, "y": 0.035, "w": 1, "h": 0.625 },
  "source": { "x": 0, "y": 0, "w": 2880, "h": 1800 },
  "titleBar": 0.035,
  "canvas": { "width": 1600, "height": 1200 },
  "input": "screenshot.png"
}
```

The geometry flags apply here too: `--frame`, `--ratio`, `--padding`,
`--radius`, `--rotate-y`, `--no-title-bar`, `--device-ratio`, `--screen-ratio`
and `--pan` all move the screenshot inside its window, so pass the same ones you
will pass to the render.

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
| `--screen-ratio attend … — reçu « x »` | `--screen-ratio` outside the listed ratios. |
| `--island-side attend left ou right — reçu « x »` | `--island-side` is neither `left` nor `right`. |
| `--pan attend deux nombres…` | `--pan` is not `x,y`. |
| `--full-page ne s'applique qu'à une URL http(s)` | A capture flag was passed with no URL among the arguments. |
| `--viewport attend <largeur>x<hauteur>…` | `--viewport` is not `1440x900`-shaped. |
| `width attend un entier entre 320 et 3840 — reçu « x »` | A capture option out of range — the field is named. |
| `Impossible de capturer <url> : …` | Navigation failed, timed out, or a `--wait` selector never appeared. |
| `… playwright-core n'est pas installé…` | The optional dependency is missing. |
| `… aucun navigateur trouvé…` | Neither Chrome nor Playwright's Chromium is installed. |
| `Scène illisible : ce n'est pas du JSON` | `--spec` file is not valid JSON. |
| `Une scène a besoin d'au moins un shot…` | No entry in `shots` had a usable `input`. |

Unlike the MCP server, the CLI writes wherever you point it and **overwrites an
existing file**. That is the contract of a command-line tool; the guard rails
are on the [MCP side](#mcp-writing-safely), where a remote model picks the path.
