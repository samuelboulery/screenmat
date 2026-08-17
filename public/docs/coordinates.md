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

**Rule 3 — the screenshot does not start at `y = 0`.** The title bar sits above
it; a device frame adds a bezel on all four sides. That offset is exactly what
`inspect()` reports.

## What inspect gives you

```bash
pnpm cli inspect screenshot.png --json
```

```json
{
  "imageWidth": 2880,
  "imageHeight": 1800,
  "screen": { "x": 0, "y": 0.035, "w": 1, "h": 0.625 },
  "titleBar": 0.035,
  "canvas": { "width": 1600, "height": 1200 }
}
```

`screen` is the rectangle the screenshot occupies **in the layer coordinate
frame**. Here it starts 0.035 below the top of the window — the title bar — and
is 0.625 tall, because the source image is 1800 ÷ 2880 = 0.625 as tall as it is
wide.

With `--frame macbook --ratio 16:9`, the same image answers differently:

```json
{
  "screen": { "x": 0.011, "y": 0.011, "w": 0.978, "h": 0.603 },
  "titleBar": 0,
  "canvas": { "width": 1600, "height": 900 }
}
```

The bezel pushed the screenshot in on every side, and there is no title bar. Any
position computed against the first answer would be wrong here — which is why
`inspect` takes the geometry settings you intend to render with.

## Pixel to fraction

You found something at `(px, py)` in the screenshot's own pixels. Convert it:

```text
x = screen.x + (px / imageWidth)  × screen.w
y = screen.y + (py / imageHeight) × screen.h
```

This holds for every frame, ratio and padding — the screenshot is drawn to fill
`screen` exactly, so mapping through `screen` is always right. When there is no
bezel, `screen.x` is 0 and `screen.w` is 1, and it collapses to the shorter form
you will see in the MCP tool description: `x = px / imageWidth`.

## A worked example

The screenshot is 2880 × 1800. A button sits at `(200, 300)` and measures
1200 × 700 pixels. Default settings, so `screen` is the first answer above.

```text
x = 0     + (200  / 2880) × 1     = 0.0694
y = 0.035 + (300  / 1800) × 0.625 = 0.1392
w =         (1200 / 2880) × 1     = 0.4167
h =         (700  / 1800) × 0.625 = 0.2431
```

```json
{
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
| `strokeWidth` | `0.0022` | A hairline outline. |
| `arrowHead` | `0.012` | About the height of a line of text. |
| `radius` | `0.006` | A softly rounded box. |

## Rotation

`rotateY` tilts the window, and layers tilt with it — an annotation belongs to
its screenshot and follows it. Your coordinates are always given in the
window's own upright frame; the engine applies the tilt afterwards.

> **Note** — The redaction sampler does not account for that rotation. Below
> about ±16° the difference is invisible; past that, expect a slight offset in
> what a blur samples.
