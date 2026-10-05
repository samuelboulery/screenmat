# Node API

The direct import — for a build script, a docs generator, a test fixture. Three
functions, all exported by `cli/api.ts`.

```ts
import { render, inspect, capture } from 'screenmat/node'
```

From a checkout, import the file: `import { render } from './cli/api.ts'`. Node
24 runs it as-is; there is nothing to compile.

## render

```ts
function render(input: SceneSpec | SimpleSpec | unknown): Promise<RenderResult>
```

It takes either of two shapes and validates both through the same parser.

**`SimpleSpec`** is sugar for the common case — one image, some settings:

```ts
type SimpleSpec = {
  input: string | Uint8Array
  settings?: Partial<Settings>
  pan?: { x?: number; y?: number }
  style?: string
  scale?: number
}
```

**`SceneSpec`** is the full document: several shots, layers, composition,
watermark. Anything the app can produce, this can describe. It is the same JSON
the CLI reads with `--spec` — see [Scene format](#scene).

The argument is typed `unknown` on purpose: whatever comes in is validated field
by field, so a plain object parsed from a file is a legitimate argument.

```ts
type RenderResult = {
  buffer: Buffer
  width: number
  height: number
  format: 'png' | 'webp'
  settings: Settings
}
```

| Field | Notes |
| --- | --- |
| `buffer` | Encoded image bytes. WebP is written at quality 92, exactly as the web export does. |
| `width`, `height` | Final canvas size, export scale included. |
| `format` | The real format. WebP falls back to PNG where the encoder is missing. |
| `settings` | Every setting resolved: defaults, then style, then what you passed. |

Nothing is written to disk. Writing is the caller's business:

```ts
import { render } from 'screenmat/node'
import { readdir, writeFile } from 'node:fs/promises'

const shots = (await readdir('docs/raw')).filter((file) => file.endsWith('.png'))

for (const file of shots) {
  const { buffer, format } = await render({
    input: `docs/raw/${file}`,
    style: 'docs',
    scale: 2,
  })
  await writeFile(`docs/images/${file.replace(/\.png$/, `.${format}`)}`, buffer)
}
```

`input` also accepts a `Uint8Array`, which is what you want when the screenshot
was just produced in memory — by Playwright, say — and never touched the disk.

## inspect

```ts
function inspect(
  input: string | Uint8Array,
  settings?: Partial<Settings>,
  pan?: { x?: number; y?: number },
): Promise<InspectResult>
```

Returns where the screenshot lands inside its window. Call it before computing
any layer position.

```ts
type InspectResult = {
  imageWidth: number
  imageHeight: number
  screen: { x: number; y: number; w: number; h: number }
  source: { x: number; y: number; w: number; h: number }
  titleBar: number
  canvas: { width: number; height: number }
}
```

`screen` and `titleBar` are in fractions of the **window width** — the frame
layers live in. `source` is the part of the screenshot visible in `screen`, in
the image's own pixels: the whole image, unless a locked ratio crops it.
`imageWidth` and `imageHeight` are the raw pixels of the source image. Pass the
same geometry settings you intend to render with: `frame`, `ratio`, `padding`,
`radius`, `rotateY`, `titleBar`, `deviceRatio` and `screenRatio` all move the
screenshot — and the same `pan`, when a ratio is locked.

```ts
const { screen, source } = await inspect('login.png', { frame: 'macbook' })

// A button found at (1180, 640) in the screenshot's own pixels:
const k = screen.w / source.w
const x = screen.x + (1180 - source.x) * k
const y = screen.y + (640 - source.y) * k
```

The reasoning behind that conversion is in [Coordinates](#coordinates).

## capture

```ts
capture(url: string, options?: CaptureOptions): Promise<Buffer>
```

Opens `url` in a headless browser and resolves with a PNG — bytes `render`
takes as `input` directly.

```ts
const { buffer } = await render({
  input: await capture('http://localhost:5173', { fullPage: true, waitFor: '#app' }),
  settings: { frame: 'browser', url: 'localhost:5173' },
})
```

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `width`, `height` | integer | `1440`, `900` | Viewport in CSS pixels: 320–3840 × 240–2160. |
| `density` | number | `2` | `deviceScaleFactor`, 1–3. |
| `fullPage` | boolean | `false` | The whole page height. |
| `colorScheme` | `'light'`, `'dark'` | `'light'` | What the page reads in `prefers-color-scheme`. |
| `waitFor` | string or number | — | A CSS selector to wait for, or a delay in ms (≤ 30000). |

Requires `playwright-core` (an `optionalDependency`) and a browser: the
installed Google Chrome first, otherwise Playwright's Chromium
(`pnpm exec playwright-core install chromium`). Only `http:` and `https:` URLs
are accepted; `localhost` is. Out-of-range options reject — they are not
clamped. Navigation and waiting each time out after 30 seconds, a full page is
cut under 100 million pixels, and concurrent calls run one after the other.

The browser runs in a child process: Playwright reads browser globals when it
loads, and this process already carries the DOM shim the engine needs.

## Also exported

| Export | Use |
| --- | --- |
| `BASE_WIDTH` | The canvas width the engine renders at before the export scale. |
| `supportsWebp` | Whether this Node build can encode WebP. `false` means every render falls back to PNG. |

## Errors

All three functions reject with an `Error`. There is no silent failure and no
partial result.

| Message | Cause |
| --- | --- |
| `Impossible de lire <source> : …` | The path could not be read. |
| `Impossible de décoder <source> : …` | The bytes are not a decodable image. |
| `background: "image" demande un champ background…` | `settings.background` is `image` but the scene has no `background` source. |
| `Scène illisible : ce n'est pas du JSON` | A string was passed that is not valid JSON. |
| `Une scène est un objet JSON` | The argument is not an object. |
| `Une scène a besoin d'au moins un shot…` | No entry in `shots` had a usable `input`. |
| `url attend une URL http(s) — reçu « x »` | `capture` was given something other than an `http:`/`https:` URL. |
| `width attend un entier entre 320 et 3840 — reçu « x »` | A `capture` option out of range — the field is named. |
| `Impossible de capturer <url> : …` | Navigation failed or timed out, a `waitFor` selector never appeared, `playwright-core` is missing, no browser was found, or the capture outgrew its time or size budget. |
| `Style « x » introuvable dans <dir> — disponibles : …` | Unknown `style` name. |

Out-of-range values do not throw: they are clamped. An unknown enum value falls
back to its default, and an unknown layer `kind` is dropped without taking the
scene down with it. The rule is deliberate — better a visual missing one arrow
than a failed build because a model invented a layer type.
