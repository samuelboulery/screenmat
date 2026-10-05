# MCP server

`cli/mcp.ts` speaks the Model Context Protocol over stdio. It is the door for an
agent that has no shell — four tools, no logic of its own: each one calls
`render()`, `inspect()` or `capture()`.

## Connecting

```bash
claude mcp add screenmat -- pnpm dlx --package=screenmat screenmat-mcp
```

From a clone: `claude mcp add screenmat -- node /absolute/path/to/screenmat/cli/mcp.ts`.

Any MCP client works. The equivalent JSON configuration:

```json
{
  "mcpServers": {
    "screenmat": {
      "command": "pnpm",
      "args": ["dlx", "--package=screenmat", "screenmat-mcp"],
      "env": { "SCREENMAT_OUT": "/absolute/path/to/your/project/docs/images" }
    }
  }
}
```

| Variable | Effect |
| --- | --- |
| `SCREENMAT_OUT` | The only directory the server may write into. Default: the folder of the screenshot it was given — or, for `screenmat_capture`, the server's working directory. |
| `SCREENMAT_STYLES` | Where saved styles live. Default: `~/.screenmat/styles`. |

The server needs `@modelcontextprotocol/sdk`, `zod` and `@napi-rs/canvas` — all
three are `optionalDependencies`, installed by a plain `pnpm install`.
`screenmat_capture` also needs `playwright-core` (optional too) and a browser:
the installed Google Chrome, or `pnpm exec playwright-core install chromium`.

## Writing safely

The CLI and the MCP server are not the same trust boundary. On the command line
`--out` writes where you said, because that is what a CLI is for. Over MCP a
remote model picks the path, and a mistake there would clobber a file nobody
pointed at. So:

- **A single write root.** `SCREENMAT_OUT` if set, otherwise the directory of the
  first shot's `input`. An `output` that resolves outside it fails the call, and
  nothing is written. Absolute paths and `../..` are both caught: the path is
  normalised before the comparison.
- **Nothing is ever overwritten.** The file is opened with `wx`; if it exists,
  the server tries `-2`, `-3`, and so on, up to 100.
- **The written path is returned.** It may differ from the one requested, and
  the return value is how the model learns the real one.
- **A path is returned, never the image.** A base64 PNG would cost thousands of
  tokens per call for a picture the model does not need to see again.

## screenmat_render

Renders one or more screenshots and writes a file.

| Parameter | Type | Notes |
| --- | --- | --- |
| `shots` | array, 1 to 24 | `{ input: string, layers?: Layer[], placement?, pan? }`. Up to 64 layers per shot. |
| `output` | string | Optional. Default `<input>-screenmat.<format>`, resolved under the write root. |
| `style` | string | Optional. A name from `screenmat_list_styles`. |
| `settings` | object | Optional. See below. |
| `composition` | object | Optional. `{ layout, spread? }`. No effect on a single shot. |
| `scale` | `1` \| `2` \| `3` | Optional, default `2`. |

`settings` accepts `frame`, `ratio`, `padding`, `radius`, `rotateY`, `titleBar`,
`deviceRatio`, `screenRatio`, `islandSide`, `background`, `theme`, `url`, `shadow`, `grain`, `seed`, `format` — the same
values and bounds as the [CLI flags](#cli-options). `composition.layout` is one
of `single`, `stack`, `side`, `tilt3d`, and `spread` runs 0 to 1.

A `Layer` is a subset of the [scene layer](#scene-layers):

| Field | Type | Notes |
| --- | --- | --- |
| `kind` | `text` `badge` `arrow` `line` `box` `ellipse` `redaction` | Required. |
| `rect` | `{ x, y, w?, h? }` | Required. Fractions of the **window width**. `w` and `h` are signed and default to 0. |
| `text` | string, ≤ 280 | `kind=text` only. `\n` breaks lines; `rect.w > 0` wraps at that width. |
| `redaction` | `blur` `pixel` `solid` | `kind=redaction` only. |
| `redactionShape` | `rect` `ellipse` | `kind=redaction` only. The ellipse is inscribed in `rect`. |
| `color` | `#RRGGBB` | Six hex digits. |
| `font` | `sans` `mono` | `kind=text` only. |
| `weight` | 400 to 700 | |
| `align` | `left` `center` `right` | |
| `background` | `{ on?, color?, opacity? }` | Plate behind a text. Default on, `#000000` at 0.85. |
| `shadow` | 0 to 1 | Text defaults to 0.4, shapes to 0. |
| `size` | 0.005 to 0.08 | Font size, fraction of the window width. |
| `strokeWidth` | 0.0005 to 0.012 | |
| `fill` | 0 to 1 | Fill opacity. `0` means outline only. |
| `fillColor` | `#RRGGBB` | `box`, `ellipse`. Defaults to `color`. |
| `stroke` | boolean | `box`, `ellipse`. `false` needs `fill > 0`. |
| `strokeOpacity` | 0 to 1 | `box`, `ellipse`. Outline opacity, default `1`. |
| `opacity` | 0.1 to 1 | |

Unlike a scene file, the MCP schema does not expose `radius`, `arrowHead`,
`invert`, `hidden`, `locked` or `name`. They exist, they are simply not worth
the tokens their descriptions would cost in every turn.

The result is a JSON string:

```json
{ "output": "/abs/path/screenshot-screenmat.webp", "width": 2048, "height": 1536, "bytes": 184320 }
```

> **Tip** — Called with no settings at all it already produces a good visual.
> Passing nothing is the nominal case; add layers only when someone asked to
> point at or hide something.

## screenmat_inspect

Says where the screenshot lands inside its window. Call it **before** placing
any layer: a position computed from the image's own pixels lands too high by the
height of the title bar.

| Parameter | Type | Notes |
| --- | --- | --- |
| `input` | string | Required. Path to the screenshot. |
| `settings` | object | Optional: `frame`, `ratio`, `padding`, `radius`, `rotateY`, `titleBar`, `deviceRatio`, `screenRatio`. |
| `pan` | `{ x?, y? }` | Optional, 0 to 1 per axis. The same `pan` as the shot you will render. |

Only geometry settings are accepted here — those are the ones that move the
screenshot inside its window. Grain, seed or format would not change the answer,
and exposing them would suggest otherwise.

With `settings: { "frame": "browser" }`:

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

The full frame, with the pixel-to-fraction conversion, is in
[Coordinates](#coordinates). This tool's description carries it too, so an agent
reads it without being told.

## screenmat_capture

Opens a URL in a headless browser on the machine running the server and writes
the capture as a PNG. That PNG is then the `input` of `screenmat_inspect` and
`screenmat_render`: capture once, then place layers on and render the same pixels.

| Parameter | Type | Notes |
| --- | --- | --- |
| `url` | string | Required. `http:` or `https:` only; `localhost` is allowed. |
| `width`, `height` | integer | Optional. Viewport in CSS pixels: 320–3840 × 240–2160. Default `1440` × `900`. |
| `density` | number | Optional, 1–3. `deviceScaleFactor`. Default `2`. |
| `fullPage` | boolean | Optional. The whole page height. |
| `colorScheme` | `light`, `dark` | Optional. What the page reads in `prefers-color-scheme`. Default `light`. |
| `waitFor` | string or number | Optional. A CSS selector to wait for, or a delay in ms (≤ 30000). |
| `output` | string | Optional. Must end in `.png` and not start with a dot. Default `<host-path>.png`, resolved under the write root. |

Out-of-range values fail the call rather than being clamped. The URL and
`output` are checked before any browser is launched. Captures run one at a time,
in a sandboxed browser with no downloads, no service workers and no request
outside `http:`/`https:` — redirects included.

> **Warning** — `localhost` and private addresses are reachable, because
> capturing your own dev server is the point. A model steered by a malicious
> page or prompt can therefore capture an internal page and read it back. The
> tool carries `openWorldHint`, so a client can ask before each call; set
> `SCREENMAT_OUT` to keep the files it writes in one folder.

```json
{ "output": "/abs/path/example-com.png", "width": 2880, "height": 1800, "address": "example.com" }
```

`address` is the text to pass as `settings.url` to `screenmat_render`, so the
browser frame shows the page that was captured.

## screenmat_list_styles

No parameters. Lists the styles that were tuned by hand in the app and dropped
into the styles directory.

```json
{
  "directory": "/Users/you/.screenmat/styles",
  "styles": [{ "name": "docs", "label": "Docs", "frame": "macbook", "background": "mesh", "ratio": "16:9" }]
}
```

`name` is what goes into `screenmat_render`'s `style`. One name replaces a dozen
settings — see [Styles](#styles).

## A typical exchange

```text
0. screenmat_capture         → only when starting from a URL
                             → /project/docs/images/localhost-5173-login.png
1. screenmat_list_styles     → is there a house style? → "docs"
2. screenmat_inspect         → screen.y = 0.011, screen.h = 0.61125
3. screenmat_render          → style "docs", one arrow, one redaction
                             → /project/docs/images/login-screenmat.webp
```

Steps 1 and 2 are cheap and each removes a way to get it wrong: the first
avoids restating settings, the second avoids misplacing every layer by the
height of the title bar.
