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
| `frame` | `browser` `macbook` `iphone` `none` | `none` | |
| `ratio` | `auto` `4:3` `1:1` `16:9` `9:16` | `4:3` | |
| `background` | `mesh` `gradient` `solid` `image` | `mesh` | `image` needs the top-level `background`. |
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

`blur`, `shapes`, `shapeOpacity`, `saturation` and `contrast` tune the generated
background: how soft the mesh is, how many blobs it has, and how the whole
backdrop is graded. They have no CLI flag and no MCP parameter — a scene file or
a style is where they live.

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

`placement` retouches one window on top of the layout: `scale` multiplies the
common window width the composition computed, `dx` and `dy` shift that window in
**window widths**. The title bar and corner radius of a scaled window scale with
it.

A placement is deliberately invisible to framing: the canvas is sized and the
composition centred on the layout alone. Move one window and nothing else moves
or resizes — which also means a large enough offset pushes it past the edge, and
that is your call, not a bug.

## layers

Seven kinds: `text`, `badge`, `arrow`, `line`, `box`, `ellipse`, `redaction`.

Every layer is placed in fractions of **its own window's width**, origin at that
window's top-left corner — not the canvas. Read [Coordinates](#coordinates)
before writing a single one.

| Field | Type | Default | Bounds |
| --- | --- | --- | --- |
| `kind` | one of the seven | required | An unknown kind drops the layer. |
| `rect` | `{ x, y, w, h }` | `{0,0,0,0}` | `x`/`y`: −2 to 3. `w`/`h`: −3 to 3, **signed**. |
| `text` | string | `""` | ≤ 280 characters. `kind=text`. |
| `labelStyle` | `pill` `plain` `badge` | `pill` | |
| `redaction` | `blur` `pixel` `solid` | `blur` | `kind=redaction`. |
| `color` | `#RRGGBB` | `#7DE2FF` | Six hex digits, or the default. `red` is not a colour here. |
| `size` | number | `0.011` | 0.005 to 0.04 — font size. |
| `strokeWidth` | number | `0.0022` | 0.0005 to 0.012 |
| `radius` | number | `0.006` | 0 to 0.06 — box corners. |
| `arrowHead` | number | `0.012` | 0.004 to 0.04 |
| `fill` | number | `0` | 0 to 1. `0` is outline only. |
| `opacity` | number | `1` | 0.1 to 1 |
| `invert` | boolean | `false` | Flips a label's ink and plate. |
| `hidden` | boolean | `false` | Not drawn, and not exported either. |
| `locked` | boolean | `false` | App only: not selectable by click. |
| `name` | string | `""` | App only: the label in the layer stack. |

### What each kind uses

| Kind | Reads | Ignores |
| --- | --- | --- |
| `text` | `text`, `labelStyle`, `size`, `color`, `invert`, `rect.x`/`rect.y` | `rect.w`/`rect.h` — a label sizes itself around its text. An empty `text` draws nothing. |
| `badge` | `size`, `color`, `invert`, `rect.x`/`rect.y` | `text` — a badge shows its **rank** among the badges of that shot, and the number is never stored. |
| `arrow` | `rect` (signed), `strokeWidth`, `arrowHead`, `color` | `fill`, `radius` — the head is filled with `color`. |
| `line` | `rect` (signed), `strokeWidth`, `color` | `fill`, `radius`, `arrowHead` |
| `box` | `rect`, `strokeWidth`, `radius`, `fill`, `color` | `arrowHead` |
| `ellipse` | `rect`, `strokeWidth`, `fill`, `color` | `radius`, `arrowHead` |
| `redaction` | `rect`, `redaction` | `color`, `radius`, `strokeWidth`, `opacity` — it hides, it does not draw. |

`opacity` applies to every kind except `redaction`: a half-transparent mask
would not be a mask. A `rect` smaller than one pixel is skipped.

`invert` swaps plate and ink: a badge becomes an outlined disc with its number
in the layer colour, a label becomes a coloured plate with black or white text
picked by real WCAG contrast. It has no effect on `labelStyle: "plain"`, which
has no plate to fill.

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
for a batch that must look like one family. Each entry must be a `#RRGGBB`
string; anything else is dropped, and an invalid `base` discards the whole
palette so extraction takes over. Up to 8 accents are kept.
