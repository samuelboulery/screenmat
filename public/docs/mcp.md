# MCP server

`cli/mcp.ts` speaks the Model Context Protocol over stdio. It is the door for an
agent that has no shell — three tools, no logic of its own: each one calls
`render()` or `inspect()`.

## Connecting

```bash
claude mcp add screenmat -- node /absolute/path/to/screenmat/cli/mcp.ts
```

Any MCP client works. The equivalent JSON configuration:

```json
{
  "mcpServers": {
    "screenmat": {
      "command": "node",
      "args": ["/absolute/path/to/screenmat/cli/mcp.ts"],
      "env": { "SCREENMAT_OUT": "/absolute/path/to/your/project/docs/images" }
    }
  }
}
```

| Variable | Effect |
| --- | --- |
| `SCREENMAT_OUT` | The only directory the server may write into. Default: the folder of the screenshot it was given. |
| `SCREENMAT_STYLES` | Where saved styles live. Default: `~/.screenmat/styles`. |

The server needs `@modelcontextprotocol/sdk`, `zod` and `@napi-rs/canvas` — all
three are `optionalDependencies`, installed by a plain `pnpm install`.

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
| `shots` | array, 1 to 24 | `{ input: string, layers?: Layer[] }`. Up to 64 layers per shot. |
| `output` | string | Optional. Default `<input>-screenmat.<format>`, resolved under the write root. |
| `style` | string | Optional. A name from `screenmat_list_styles`. |
| `settings` | object | Optional. See below. |
| `composition` | object | Optional. `{ layout, spread? }`. No effect on a single shot. |
| `scale` | `1` \| `2` \| `3` | Optional, default `2`. |

`settings` accepts `frame`, `ratio`, `padding`, `radius`, `rotateY`, `titleBar`,
`background`, `theme`, `url`, `shadow`, `grain`, `seed`, `format` — the same
values and bounds as the [CLI flags](#cli-options). `composition.layout` is one
of `single`, `stack`, `side`, `tilt3d`, and `spread` runs 0 to 1.

A `Layer` is a subset of the [scene layer](#scene-layers):

| Field | Type | Notes |
| --- | --- | --- |
| `kind` | `text` `badge` `arrow` `line` `box` `ellipse` `redaction` | Required. |
| `rect` | `{ x, y, w?, h? }` | Required. Fractions of the **window width**. `w` and `h` are signed and default to 0. |
| `text` | string, ≤ 280 | `kind=text` only. |
| `redaction` | `blur` `pixel` `solid` | `kind=redaction` only. |
| `color` | `#RRGGBB` | Six hex digits. |
| `labelStyle` | `pill` `plain` `badge` | |
| `size` | 0.005 to 0.04 | Font size, fraction of the window width. |
| `strokeWidth` | 0.0005 to 0.012 | |
| `fill` | 0 to 1 | Fill opacity. `0` means outline only. |
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
| `settings` | object | Optional: `frame`, `ratio`, `padding`, `radius`, `rotateY`, `titleBar`. |

Only geometry settings are accepted here — those are the ones that move the
screenshot inside its window. Grain, seed or format would not change the answer,
and exposing them would suggest otherwise.

```json
{
  "imageWidth": 2880,
  "imageHeight": 1800,
  "screen": { "x": 0, "y": 0.035, "w": 1, "h": 0.625 },
  "titleBar": 0.035,
  "canvas": { "width": 1600, "height": 1200 }
}
```

The full frame, with the pixel-to-fraction conversion, is in
[Coordinates](#coordinates). This tool's description carries it too, so an agent
reads it without being told.

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
1. screenmat_list_styles     → is there a house style? → "docs"
2. screenmat_inspect         → screen.y = 0.0405, screen.h = 0.625
3. screenmat_render          → style "docs", one arrow, one redaction
                             → /project/docs/images/login-screenmat.webp
```

Steps 1 and 2 are cheap and each removes a way to get it wrong: the first
avoids restating settings, the second avoids misplacing every layer by the
height of the title bar.
