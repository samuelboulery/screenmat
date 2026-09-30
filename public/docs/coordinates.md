# Coordinates

Read this before writing a single layer. Almost every misplaced annotation comes
from one of the three rules below.

## The frame

A layer's `rect` is expressed in **fractions of its window's width**, with the
origin at that window's **top-left corner** — not the canvas, not the
screenshot.

```text
  canvas
 ┌───────────────────────────────────────────────┐
 │            generative background              │
 │      ┌───────────────────────────────┐        │
 │      │ ● ● ●        example.com      │ ← title bar
 │      ├───────────────────────────────┤        │
 │      │                               │        │
 │      │        the screenshot         │        │
 │      │                               │        │
 │      └───────────────────────────────┘        │
 │      ↑                               ↑        │
 │   x = 0                            x = 1      │
 └───────────────────────────────────────────────┘

  x = 0 ────────── window width ─────────► x = 1
  y = 0 at the top of the window, in the SAME unit
```

**Rule 1 — `y` is divided by the width too, never by the height.** The unit is
one, and it is the window's width. A 16:9 screenshot therefore occupies `y` from
0 to 0.5625, not 0 to 1.

**Rule 2 — `w` and `h` are signed.** An arrow runs from `(x, y)` to
`(x + w, y + h)`, which is how it points into any of the four quadrants. Never
normalise a rect before sending it.

**Rule 3 — the screenshot does not start at `y = 0`.** A browser frame puts a
title bar above it; a device frame adds a bezel on all four sides. That offset is
exactly what `inspect()` reports.

**Rule 4 — a locked ratio crops the screenshot.** With `deviceRatio` or a
`screenRatio` other than `auto`, the screen keeps its own shape and the
screenshot fills it at a single scale: the axis that overflows is cropped.
`inspect()` reports which part stays visible.

**Rule 5 — a layer does not follow its image.** Layers are fractions of the
window, and `render()` draws them where the scene says. Change the frame, the
ratio, `pan`, or — in a composition — which shot comes first, and the screenshot
moves under them: a redaction then covers other pixels. Every window of a
composition takes the ratio of the first shot, so the other shots are cropped to
it, and `inspect()` only describes an image rendered alone. Recompute positions
whenever one of these changes; the app does it for you, the machine door does not.

## What inspect gives you

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
  "canvas": { "width": 1600, "height": 1200 }
}
```

`screen` is the rectangle the screenshot occupies **in the layer coordinate
frame**. Here it starts 0.035 below the top of the window — the title bar of the
browser frame — and is 0.625 tall, because the source image is 1800 ÷ 2880 =
0.625 as tall as it is wide. With the default frame, `none`, there is no title
bar and `screen.y` is 0.

`source` is the part of the screenshot visible in `screen`, **in the image's own
pixels**. Here it is the whole image.

With `--frame macbook --ratio 16:9`, the same image answers differently:

```json
{
  "screen": { "x": 0.011, "y": 0.011, "w": 0.978, "h": 0.61125 },
  "source": { "x": 0, "y": 0, "w": 2880, "h": 1800 },
  "titleBar": 0,
  "canvas": { "width": 1600, "height": 900 }
}
```

The bezel pushed the screenshot in on every side, and there is no title bar. The
screen keeps the image's own shape — 0.61125 ÷ 0.978 = 0.625 — so nothing is
stretched. Any position computed against the first answer would be wrong here,
which is why `inspect` takes the geometry settings you intend to render with.

A locked ratio changes `source`. A 2880 × 9000 full-page capture with
`--frame browser --screen-ratio 16:9`:

```json
{
  "screen": { "x": 0, "y": 0.035, "w": 1, "h": 0.5625 },
  "source": { "x": 0, "y": 3690, "w": 2880, "h": 1620 },
  "titleBar": 0.035,
  "canvas": { "width": 1600, "height": 1200 }
}
```

Only 1620 of the 9000 rows fit the 16:9 screen, and by default they are the
middle ones. `pan` picks another part: `--pan 0.5,0` shows the top of the page
(`source.y` becomes 0), `--pan 0.5,1` the bottom.

## Pixel to fraction

You found something at `(px, py)` in the screenshot's own pixels. Convert it:

```text
k = screen.w / source.w
x = screen.x + (px − source.x) × k
y = screen.y + (py − source.y) × k
```

A length in pixels is multiplied by `k`. This holds for every frame, ratio and
padding: the screenshot is drawn at one scale on both axes, never stretched, and
`source` says which part of it lands in `screen`. When nothing is cropped,
`source` is the whole image and `k` is `screen.w / imageWidth`. A point outside
`source` is not visible: it converts to a position outside `screen`.

## A worked example

The screenshot is 2880 × 1800. A button sits at `(200, 300)` and measures
1200 × 700 pixels. The browser frame, so `screen` is the first answer above.

```text
k = 1 / 2880
x = 0     + (200 − 0) × k = 0.0694
y = 0.035 + (300 − 0) × k = 0.1392
w =         1200      × k = 0.4167
h =         700       × k = 0.2431
```

```json
{
  "settings": { "frame": "browser" },
  "shots": [
    {
      "input": "screenshot.png",
      "layers": [
        { "kind": "box", "rect": { "x": 0.0694, "y": 0.1392, "w": 0.4167, "h": 0.2431 } },
        { "kind": "arrow", "rect": { "x": 0.62, "y": 0.10, "w": -0.14, "h": 0.06 } },
        { "kind": "text", "text": "Start here", "rect": { "x": 0.63, "y": 0.09 } }
      ]
    }
  ]
}
```

The arrow has a negative `w`: it starts on the right, under the label, and
points down-left at the box.

## Sizes are fractions too

`size`, `strokeWidth`, `radius` and `arrowHead` are all fractions of the window
width, exactly like `rect`. Nothing in a layer is ever a pixel count.

That is what makes an export at scale 3 the exact homothety of the preview: the
whole scene is described relative to one width, and the scale multiplies that
width. Write a pixel value anywhere and the two stop matching.

| Setting | Default | Roughly |
| --- | --- | --- |
| `size` | `0.011` | Body text, readable at any export scale. |
| `strokeWidth` | `0.004` arrow · `0.003` line, box, ellipse | A stroke that reads at a glance. |
| `arrowHead` | `0.016` | A little taller than a line of text. |
| `radius` | `0.012` | A softly rounded box. |

Defaults depend on the kind — [the layer table](#scene-layers) lists them per field.

## Rotation

`rotateY` tilts the window, and layers tilt with it — an annotation belongs to
its screenshot and follows it. Your coordinates are always given in the
window's own upright frame; the engine applies the tilt afterwards.

> **Note** — The redaction sampler does not account for that rotation. Below
> about ±16° the difference is invisible; past that, expect a slight offset in
> what a blur samples.
