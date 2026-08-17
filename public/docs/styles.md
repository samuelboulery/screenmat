# Styles

A style is a full set of settings, tuned by eye in the app and recalled by name
from a machine. It exists so that no setting is ever duplicated between the app
and the CLI: you get it right once, visually, and scripts refer to it.

```text
  app  →  Styles screen  →  Export .json  →  ~/.screenmat/styles/docs.screenmat.json
                                                        │
                                    --style docs ───────┤
                                    style: "docs" ──────┘
```

## Saving one

1. Set up a shot the way you want it in the app.
2. Go to **Styles**, name it, save it.
3. Export it — you get a `.json` file.
4. Drop that file into `~/.screenmat/styles/`.

`SCREENMAT_STYLES` moves that directory somewhere else. Putting it inside a
repository is a good idea when several people, or several machines, must produce
the same visuals.

## Recalling one

```bash
pnpm cli screenshot.png --style docs
pnpm cli screenshot.png --style ./design/house.screenmat.json
```

```ts
await render({ input: 'screenshot.png', style: 'docs' })
```

The **name** is the file name without its extension: both `docs.json` and
`docs.screenmat.json` answer to `docs`. Anything containing a `/`, or ending in
`.json`, is treated as a path instead of a name.

List what is available — the same call the MCP tool `screenmat_list_styles`
makes:

```bash
pnpm cli styles
```

```json
{
  "directory": "/Users/you/.screenmat/styles",
  "styles": [
    { "name": "docs", "label": "Docs", "frame": "macbook", "background": "mesh", "ratio": "16:9", "format": "webp" }
  ]
}
```

`name` is what you pass; `label` is what the style calls itself in the app.

## Precedence

Three layers, each overriding the one below:

```text
  explicit settings   ← flags, or the `settings` you passed
  ────────────────────────────────────────────────────────
  the named style     ← --style / style:
  ────────────────────────────────────────────────────────
  defaults            ← frame browser · ratio 4:3 · background mesh · seed 1 …
```

Only the keys you actually pass count as explicit. An absent flag lets the style
speak; it is never overwritten with an empty value.

```bash
# The style says macbook / 16:9. This render keeps macbook and takes 1:1.
pnpm cli screenshot.png --style docs --ratio 1:1
```

A style may also carry a frozen `palette`. The scene's own `palette` wins if it
has one; otherwise the style's is used; otherwise the colours are extracted from
the first screenshot.

## The file

Nothing new was invented for the machine door: this is exactly what the app
exports and imports.

```json
{
  "kind": "screenmat-style",
  "version": 1,
  "style": {
    "id": "style-1",
    "name": "Docs",
    "settings": { "frame": "macbook", "ratio": "16:9", "seed": 5 },
    "palette": { "base": "#101018", "accents": ["#7DE2FF"] }
  }
}
```

It is validated field by field like any external input: missing settings fall
back to defaults, out-of-range numbers are clamped, and a file that is not a
style at all is ignored rather than allowed to break the listing.

A style may also embed a `watermark` as a data URL, which is how the app carries
a logo between sessions. In a scene, a watermark points at a **file** instead —
a machine passes paths, not base64. See [Scene format](#scene-watermark).

## Caching

The directory is re-read on every call, but each file is parsed only when its
modification time changed. A batch of twenty shots sharing one style does not
re-validate the same JSON twenty times, and a style you fix while a long-lived
MCP server is running is picked up on the next call.

## Errors

An unreadable or malformed file is skipped: it never hides the others. A name
that does not resolve fails loudly, and the message lists what is available:

```text
Style « dcos » introuvable dans /Users/you/.screenmat/styles — disponibles : docs, marketing
```

If the directory does not exist at all, there are simply no styles. That is not
an error.
