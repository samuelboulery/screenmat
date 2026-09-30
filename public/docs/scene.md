# Scene format

A scene is a serialisable JSON document that describes a whole visual: which
images, with which settings, in which composition, and which layers on each. It
is what `--spec` reads and what `render()` accepts.

A style only carries settings. A scene carries the document — which is how the
machine door reaches everything the app can do, annotations and redaction
included.

## The smallest scene

```json
{ "shots": [{ "input": "screenshot.png" }] }
```

Everything else has a default. `shots` is the only required field, and it needs
at least one entry with a usable `input`.

**Every path in a scene is resolved from the working directory the command runs
in — never from the folder the scene file sits in.** That holds for
`shots[].input`, `background` and `watermark.path` alike, and a leading `./`
changes nothing. So a scene stored next to its images is run from that folder:

```bash
cd assets && screenmat --spec scene.json
```

Anywhere else, write the paths from where the command runs.

## A complete one

```jsonc
{
  "style": "docs",
  "settings": { "frame": "macbook", "ratio": "16:9", "seed": 42 },
  "composition": { "layout": "single" },
  "scale": 2,
  "shots": [
    {
      "name": "login",
      "input": "./screenshot.png",
      "layers": [
        {
          "kind": "redaction",
          "redaction": "blur",
          "rect": { "x": 0.10, "y": 0.22, "w": 0.30, "h": 0.03 }
        },
        {
          "kind": "arrow",
          "color": "#7DE2FF",
          "rect": { "x": 0.62, "y": 0.28, "w": -0.18, "h": 0.06 }
        },
        { "kind": "box", "fill": 0.15, "rect": { "x": 0.40, "y": 0.50, "w": 0.22, "h": 0.10 } },
        { "kind": "text", "text": "Sign in here", "rect": { "x": 0.44, "y": 0.46 } }
      ]
    }
  ],
  "watermark": { "path": "./logo.png", "position": "bottom-right", "opacity": 0.6 }
}
```

## How validation works

A JSON produced by a machine is external input, exactly like a file dragged into
the app. Three rules, applied everywhere:

- **Out of range is clamped**, not rejected. `"opacity": 42` renders at `1`.
- **An unknown enum value falls back to its default.** `"frame": "tablet"`
  renders an unframed screenshot.
- **An unknown layer `kind` is dropped**, and the rest of the scene renders. A
  visual missing one arrow beats a failed build because a model invented a
  layer type.

Only three things actually fail: a string that is not JSON, a top level that is
not an object, and a `shots` array with no usable `input` in it.

## Top level

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `shots` | array, 1 to 24 | required | Extra entries beyond 24 are dropped. |
| `settings` | object | see below | |
| `composition` | object | `single` | Only matters with several shots. |
| `scale` | `1` \| `2` \| `3` | `2` | Anything else becomes `2`. |
| `style` | string | — | A [saved style](#styles), applied **under** `settings`. |
| `palette` | `{ base, accents }` | extracted | Freeze the colours instead of deriving them from the first shot. |
| `watermark` | object | — | Ignored unless it has a `path`. |
| `background` | path or bytes | — | Required when `settings.background` is `image`. |

## settings

Every length is a fraction of the canvas width — never a pixel count. That is
what makes an export at scale 3 the exact homothety of the preview.

| Field | Values | Default | Bounds |
| --- | --- | --- | --- |
| `frame` | `browser` `macbook` `iphone` `none` | `none` | A landscape screenshot lays the `iphone` on its side. |
| `deviceRatio` | boolean | `false` | `macbook`, `iphone` only: the screen keeps the device ratio (16:10, 19.5:9) and crops the screenshot. |
| `screenRatio` | `auto` `16:10` `16:9` `4:3` `1:1` | `auto` | `browser`, `none` only: ratio of the screen. Anything but `auto` crops the screenshot. |
| `islandSide` | `left` `right` | `left` | `iphone` lying on its side: the short edge that carries the island. Moves nothing else. |
| `ratio` | `auto` `4:3` `1:1` `16:9` `9:16` | `4:3` | |
| `background` | see [below](#background-series) | `mesh` | `image` needs the top-level `background`. |
| `theme` | `auto` `light` `dark` | `auto` | |
| `format` | `png` `webp` | `webp` | |
| `titleBar` | boolean | `true` | |
| `url` | string | `example.com` | Truncated at 200 characters. `frame=browser` only. |
| `padding` | number | `0.065` | 0 to 0.3 |
| `radius` | number | `0.018` | 0 to 0.08 |
| `rotateY` | degrees | `0` | −24 to 24 |
| `shadow` | number | `1` | 0 to 2 |
| `grain` | number | `0.35` | 0 to 1 |
| `seed` | integer | `1` | Rounded. Same seed, same background. |
| `blur` | number | `8` | 1 to 32 |
| `shapes` | integer | `4` | 0 to 12 |
| `shapeOpacity` | number | `0.75` | 0 to 1 |
| `saturation` | number | `1` | 0 to 2 |
| `contrast` | number | `1` | 0 to 2 |
| `ditherCell` | number | `0.006` | 0.002 to 0.03. Dithered backgrounds only. |
| `ditherAngle` | degrees | `45` | 0 to 90. `halftone`, `scanlines`, `crosshatch` and `riso` only. |
| `palette` | `{ base, accents }` | absent | Frozen background colours — see [palette](#palette). |

`blur`, `shapes`, `shapeOpacity`, `saturation` and `contrast` tune the generated
background: how soft the mesh is, how many blobs it has, and how the whole
backdrop is graded. They have no CLI flag and no MCP parameter — a scene file or
a style is where they live. So do `ditherCell` and `ditherAngle`.

### Background series

A generated background is drawn by the engine from the palette, and the same
`seed` always gives the same pixels. A macOS or Windows wallpaper is an image
shipped with screenmat: it ignores the palette and the seed.

| Series | Values | Reads |
| --- | --- | --- |
| From the screenshot | `mesh` `gradient` `solid` | `blur`, `shapes`, `shapeOpacity` (mesh); `shapeOpacity` (gradient) |
| macOS wallpapers | `golden-gate-light` `golden-gate-dark` `golden-gate-bridge` `tahoe-light` `tahoe-dark` `sequoia-light` `sequoia-dark` `sonoma-light` `sonoma-dark` `ventura-light` `ventura-dark` `monterey-light` `monterey-dark` `big-sur-day` `big-sur-night` | nothing — the image is drawn as is |
| Windows wallpapers | `windows-11-light` `windows-11-dark` `windows-10` `windows-8` `windows-7` `windows-xp` | nothing — the image is drawn as is |
| Dithered | `bayer` `halftone` `scanlines` `atkinson` `stipple` `crosshatch` `contours` `ridgelines` `riso` `glyphs` `truchet` | `ditherCell`, `ditherAngle`, `shapes`, `blur`, `seed` |

The generated ones read `saturation` and `contrast`. `grain` applies to every
background except the dithered ones, where it would blur the pattern, and the
wallpapers, which are shown as they look on a desktop. They are © Apple Inc. and
© Microsoft Corporation, and are not covered by screenmat's MIT licence. Only
`windows-11-*` is 3840 px wide: `windows-10`, `-8` and `-7` are 1920 px and
`windows-xp` 800 px, so they soften at scale 3. A dithered
background is two tones — the lightest and the darkest colour of the palette —
laid over the mesh: `ditherCell` is the cell size as a fraction of the width.

| Pattern | What it draws |
| --- | --- |
| `bayer` | Ordered 4×4 dither, square cells |
| `halftone` | Dots that grow with the light |
| `scanlines` | Engraving lines that thicken with the shade |
| `atkinson` | Atkinson error diffusion, the MacPaint look — exactly two colours |
| `stipple` | Fixed-size dots, variable density |
| `crosshatch` | Crossed engraving strokes, one more direction per level |
| `contours` | Contour lines, the mesh read as terrain |
| `ridgelines` | Horizontal lines lifted by the light, each hiding the ones behind |
| `riso` | Two misregistered dot screens; the second ink is the palette accent |
| `glyphs` | Monospace characters picked by density |
| `truchet` | Quarter-circle tiles, oriented by the seed, thickened by the light |

## composition

| Field | Values | Default | Bounds |
| --- | --- | --- | --- |
| `layout` | `single` `stack` `side` `tilt3d` | `single` | |
| `spread` | number | `0.64` | 0 to 1 |
| `converge` | degrees | `11` | 0 to 24 |
| `elevation` | number | `0.0225` | 0 to 0.1 |
| `columns` | integer | `0` | 0 to 8. `0` picks the count itself. |
| `offsetY` | number | `0` | −0.5 to 0.5, in window widths |

`spread` sets how far apart the windows sit, `converge` the perspective angle of
`tilt3d`, `elevation` the vertical offset between them. With a single shot the
whole object is inert.

`side` is a grid, not a row: past a certain count the windows wrap, and the last
row is centred on its own tally — five shots in three columns render 3 + 2, the
pair centred under the trio. `columns` at `0` picks whatever fits the canvas
ratio best, which is why two shots stack vertically in a `9:16` canvas and sit
side by side in `16:9`. Set it to `1` to force a column whatever the ratio.

Whatever the layout, the composition is centred on its own bounding box, so a
stack never drifts low. `offsetY` is the one knob that contradicts that, moving
the whole composition up or down.

## shots

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `input` | path or bytes | required | A string path, or a `Uint8Array` from an in-memory caller. |
| `name` | string | `shot-1`, `shot-2`… | Truncated at 64 characters. |
| `layers` | array, 0 to 64 | `[]` | Extra layers are dropped. |
| `placement` | `{ scale, dx, dy }` | `{1, 0, 0}` | `scale`: 0.2 to 3. `dx`/`dy`: −3 to 3. |
| `pan` | `{ x, y }` | `{0.5, 0.5}` | 0 to 1 per axis. |

`placement` retouches one window on top of the layout: `scale` multiplies the
common window width the composition computed, `dx` and `dy` shift that window in
**window widths**. The title bar and corner radius of a scaled window scale with
it.

A placement is deliberately invisible to framing: the canvas is sized and the
composition centred on the layout alone. Move one window and nothing else moves
or resizes — which also means a large enough offset pushes it past the edge, and
that is your call, not a bug.

`pan` only matters when a locked ratio (`deviceRatio`, `screenRatio`) crops the
screenshot. It works like CSS `object-position`: per axis, 0 shows the start of
the image, 1 the end, 0.5 the middle. An axis that fits is unaffected. Layers
stay in the window frame — they do not follow a `pan` you change by hand, so ask
[`inspect`](#coordinates) with the same `pan` before placing them.

## layers

Seven kinds: `text`, `badge`, `arrow`, `line`, `box`, `ellipse`, `redaction`.

Every layer is placed in fractions of **its own window's width**, origin at that
window's top-left corner — not the canvas. Read [Coordinates](#coordinates)
before writing a single one.

| Field | Type | Default | Bounds |
| --- | --- | --- | --- |
| `kind` | one of the seven | required | An unknown kind drops the layer. |
| `rect` | `{ x, y, w, h }` | `{0,0,0,0}` | `x`/`y`: −2 to 3. `w`/`h`: −3 to 3, **signed**. |
| `text` | string | `""` | ≤ 280 characters. `kind=text`. `\n` starts a new line. |
| `font` | `sans` `mono` | `sans` | `kind=text`. Space Grotesk or JetBrains Mono, both bundled. |
| `weight` | number | `600` | 400 to 700, rounded to the hundred. |
| `align` | `left` `center` `right` | `left` | Lines inside the text box. |
| `background` | object | see below | The plate behind a text. |
| `redaction` | `blur` `pixel` `solid` | `blur` | `kind=redaction`. |
| `redactionShape` | `rect` `ellipse` | `rect` | `kind=redaction`. The ellipse is inscribed in `rect`; its corners stay readable. |
| `color` | `#RRGGBB` | `#FFD479` | Six hex digits, or the default. `red` is not a colour here. The stroke of a shape, the ink of a text. |
| `size` | number | `0.024` text · `0.011` badge | 0.005 to 0.08 — font size. |
| `strokeWidth` | number | `0.004` arrow · `0.003` line, box, ellipse · `0.0022` otherwise | 0.0005 to 0.012 |
| `radius` | number | `0.012` box · `0.006` otherwise | 0 to 0.06 — box corners. |
| `arrowHead` | number | `0.016` arrow · `0.012` otherwise | 0.004 to 0.04 |
| `fill` | number | `0` | 0 to 1 — opacity of the fill. `0` is outline only. |
| `fillColor` | `#RRGGBB` | same as `color` | `box`, `ellipse`: colour of the fill, independent of the stroke. |
| `stroke` | boolean | `true` | `box`, `ellipse`: draws the outline. `false` needs `fill > 0` — a shape with neither would be invisible, so the outline is drawn anyway, at full opacity if `strokeOpacity` is `0`. |
| `strokeOpacity` | number | `1` | 0 to 1 — `box`, `ellipse`: opacity of the outline, as `fill` is for the fill. The outline is centred on the edge, so its inner half sits over the fill. |
| `opacity` | number | `1` | 0.1 to 1 — the whole layer, on top of `fill` and `strokeOpacity`. |
| `shadow` | number | `0.4` text · `0` otherwise | 0 to 1. A drop shadow, scaled with the window. |
| `invert` | boolean | `false` | Turns a badge into an outlined disc. |
| `hidden` | boolean | `false` | Not drawn, and not exported either. |
| `locked` | boolean | `false` | App only: not selectable by click. |
| `name` | string | `""` | App only: the label in the layer stack. |

### What each kind uses

| Kind | Reads | Ignores |
| --- | --- | --- |
| `text` | `text`, `font`, `weight`, `align`, `size`, `color`, `background`, `shadow`, `rect.x`/`rect.y`, `rect.w` | `rect.h` — the box grows with its lines. `rect.w > 0` wraps at that width, `0` fits the longest line. An empty `text` draws nothing. |
| `badge` | `size`, `color`, `invert`, `rect.x`/`rect.y` | `text` — a badge shows its **rank** among the badges of that shot, and the number is never stored. |
| `arrow` | `rect` (signed), `strokeWidth`, `arrowHead`, `color` | `fill`, `radius` — the head is filled with `color`. |
| `line` | `rect` (signed), `strokeWidth`, `color` | `fill`, `radius`, `arrowHead` |
| `box` | `rect`, `strokeWidth`, `radius`, `fill`, `fillColor`, `stroke`, `strokeOpacity`, `color` | `arrowHead` |
| `ellipse` | `rect`, `strokeWidth`, `fill`, `fillColor`, `stroke`, `strokeOpacity`, `color` | `radius`, `arrowHead` |
| `redaction` | `rect`, `redaction`, `redactionShape` | `color`, `radius`, `strokeWidth`, `opacity` — it hides, it does not draw. |

`opacity` applies to every kind except `redaction`: a half-transparent mask
would not be a mask. A `rect` smaller than one pixel is skipped.

`invert` turns a badge into an outlined disc with its number in the layer
colour.

A text's `background` is `{ on, color, opacity, padding, radius }`. Default:
`on: true`, `#000000` at `0.85`, `padding: 0.5` and `radius: 0.3` — both in
**ems**, so the plate follows the font size. `color` is the colour of the text
itself.

Scenes written before the text layer still render: a layer with `labelStyle`
or `invert` and no `font` is read as the old label — monospace, `size 0.011`,
a dark plate for `pill` and `badge`, none for `plain`, and a coloured plate
with contrasting ink when it was inverted.

> **Warning** — Redaction is baked into the pixels under the window clip, never
> applied as a filter on top. What it covers is genuinely unreadable in the
> exported file. A `hidden` redaction hides nothing: the layer is skipped
> entirely, so the pixels underneath stay in the export.

### Signed rects

`w` and `h` keep their sign. That is what lets an arrow point into any of the
four quadrants: it runs from `(x, y)` to `(x + w, y + h)`.

```json
{ "kind": "arrow", "rect": { "x": 0.62, "y": 0.28, "w": -0.18, "h": 0.06 } }
```

That arrow starts at the right and points down-left. Never normalise a rect
before sending it — a negative width is information, not a mistake.

## watermark

| Field | Type | Default | Bounds |
| --- | --- | --- | --- |
| `path` | path or bytes | required | Without it the whole watermark is ignored. |
| `position` | `top-left` `top-center` `top-right` `bottom-left` `bottom-center` `bottom-right` | `bottom-right` | |
| `opacity` | number | `0.6` | 0 to 1 |
| `size` | number | `0.09` | 0.01 to 0.5 — width, as a fraction of the canvas. |

The watermark is drawn last, over everything else.

## palette

```json
{ "palette": { "base": "#101018", "accents": ["#7DE2FF", "#A378FF"] } }
```

Freeze the colours instead of extracting them from the first screenshot. Useful
for a batch that must look like one family. The same object may live in
`settings.palette` — that is where the app and a style keep it. Order of
precedence: a valid `settings.palette`, then the top-level `palette`, then the
style's. Each entry must be a `#RRGGBB`
string; anything else is dropped, and an invalid `base` discards the whole
palette so extraction takes over. Up to 8 accents are kept.
