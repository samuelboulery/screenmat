# Recipes

Short, runnable examples. Every one of them was executed before it was written
down.

## One screenshot for a README

```bash
pnpm cli screenshot.png --ratio 16:9 --scale 2
```

Nothing else needed: the frame, the background and its colours all come from the
screenshot itself.

## A whole folder in one command

```bash
pnpm cli docs/raw/*.png --style docs --out-dir docs/images --format png
```

The shell expands the glob, and each image is rendered and written on its own.
`--style` keeps the whole set consistent — see [Styles](#styles).

## A landing hero

```bash
pnpm cli app.png --frame macbook --rotate-y -14 --ratio 16:9 --scale 3 --padding 0.09
```

`--rotate-y` tilts the window; layers tilt with it. Past ±16° the redaction
sampler drifts slightly, so keep annotations modest on a strongly tilted shot.

## The same background, every time

```bash
pnpm cli screenshot.png --seed 42
```

The background is generated from a seeded PRNG. The same seed gives the same
image down to the pixel, which is what you want when a doc is regenerated in CI
and you do not want a noisy diff. Drop the seed and you get a new one each run.

## Hide a secret

```json
{
  "shots": [
    {
      "input": "dashboard.png",
      "layers": [
        { "kind": "redaction", "redaction": "blur", "rect": { "x": 0.10, "y": 0.22, "w": 0.30, "h": 0.03 } },
        { "kind": "redaction", "redaction": "solid", "rect": { "x": 0.62, "y": 0.71, "w": 0.22, "h": 0.04 } }
      ]
    }
  ]
}
```

```bash
pnpm cli --spec redact.json
```

`blur` and `pixel` sample the pixels underneath; `solid` covers them flat. All
three are **baked into the exported pixels**, so what they hide is genuinely
gone from the file — not merely covered by a filter someone could peel off.

## Point at something

Get the frame first, then place the layers.

```bash
pnpm cli inspect signup.png --json
# {"imageWidth":2880,"imageHeight":1800,"screen":{"x":0,"y":0.035,"w":1,"h":0.625},…}
```

```json
{
  "shots": [
    {
      "input": "signup.png",
      "layers": [
        { "kind": "box", "rect": { "x": 0.0694, "y": 0.1392, "w": 0.4167, "h": 0.2431 } },
        { "kind": "arrow", "rect": { "x": 0.62, "y": 0.10, "w": -0.14, "h": 0.06 } },
        { "kind": "text", "text": "Start here", "rect": { "x": 0.63, "y": 0.09 } }
      ]
    }
  ]
}
```

The arrow's negative `w` makes it point down-left. The maths behind those
numbers is in [Coordinates](#coordinates-a-worked-example).

## Number the steps

```json
{
  "shots": [
    {
      "input": "flow.png",
      "layers": [
        { "kind": "badge", "rect": { "x": 0.08, "y": 0.16 } },
        { "kind": "badge", "rect": { "x": 0.41, "y": 0.33 } },
        { "kind": "badge", "rect": { "x": 0.74, "y": 0.52 } }
      ]
    }
  ]
}
```

A badge shows its rank among the badges of that shot — 1, 2, 3 in reading order
of the array. The number is never stored, so reordering the array renumbers
them.

## Two screenshots, one visual

```json
{
  "settings": { "ratio": "16:9", "seed": 7 },
  "composition": { "layout": "side", "spread": 0.7 },
  "shots": [{ "input": "before.png" }, { "input": "after.png" }]
}
```

`layout` also takes `stack` and `tilt3d`. Layers stay attached to their own
shot, and each shot keeps its own coordinate frame.

## Add a logo

```json
{
  "shots": [{ "input": "screenshot.png" }],
  "watermark": { "path": "brand/logo.png", "position": "bottom-right", "opacity": 0.6, "size": 0.09 }
}
```

The watermark is drawn last, over everything. `size` is its width as a fraction
of the canvas.

## From a browser test, without touching disk

```ts
import { chromium } from 'playwright'
import { render } from 'shotframe/node'
import { writeFile } from 'node:fs/promises'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173')

const { buffer } = await render({
  input: await page.screenshot(),
  settings: { frame: 'browser', url: 'localhost:5173', seed: 1 },
  scale: 2,
})

await writeFile('docs/images/home.webp', buffer)
await browser.close()
```

`input` accepts raw bytes, so a screenshot that was just produced in memory never
has to be written out first.

## Regenerate a docs set in CI

```ts
import { render } from 'shotframe/node'
import { readdir, writeFile } from 'node:fs/promises'

for (const file of await readdir('docs/raw')) {
  if (!file.endsWith('.png')) continue
  const { buffer, format } = await render({ input: `docs/raw/${file}`, style: 'docs', scale: 2 })
  await writeFile(`docs/images/${file.replace(/\.png$/, `.${format}`)}`, buffer)
}
```

Pin a `seed` in the style and the output is byte-stable across runs, so the
diff only moves when a screenshot actually changed.

## Troubleshooting

**Every layer sits too high.** You converted from image pixels without going
through `inspect()`. The screenshot starts below the title bar, or inside the
bezel. See [Coordinates](#coordinates-pixel-to-fraction).

**A layer is off by a lot vertically, and the shot is not 4:3.** `y` is divided
by the **width**, never by the height. A 16:9 screenshot only reaches `y` 0.5625.

**My arrow points the wrong way.** `w` and `h` are signed, and the arrow runs
from `(x, y)` to `(x + w, y + h)`. Do not normalise the rect.

**I got a PNG and I asked for WebP.** This build of Node has no WebP encoder.
The returned `format` says so, and the file name follows it — better than a
`.webp` that is really a PNG.

**A setting I passed had no effect.** Check it exists on the façade you used:
`blur`, `shapes`, `shapeOpacity`, `saturation` and `contrast` have no CLI flag
and no MCP parameter. See the [capability table](#overview-which-facade-reaches-what).

**A value came out different from what I sent.** Out-of-range values are
clamped, and unknown enum values fall back to their default. The resolved
`settings` are in the render result, and in `--json` output.

**One of my layers vanished.** An unknown `kind` is dropped rather than failing
the whole scene. Check the spelling against the seven kinds in
[Scene format](#scene-layers). `hidden: true` also removes a layer completely —
including a redaction, which then hides nothing.

**The MCP server refused to write.** `output` must resolve under the write root:
the folder of the first screenshot, or `SHOTFRAME_OUT`. Pass a relative path, or
widen the root. See [Writing safely](#mcp-writing-safely).

**The MCP server wrote to a path I did not ask for.** It never overwrites; an
existing file makes it try `-2`, `-3`, and so on. The path it actually used is
in the return value.

**A style name is not found.** The name is the file name without extension, and
the error message lists what is available. Check `SHOTFRAME_STYLES` if the
directory is not the default one.
