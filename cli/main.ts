#!/usr/bin/env node
/**
 * L'enveloppe en ligne de commande. Aucune logique : elle traduit des arguments
 * en scène et appelle `render()` / `inspect()`.
 *
 * Ce qui compte pour un appelant qui n'est pas humain :
 * `screenmat capture.png` sans autre argument doit déjà donner un bon visuel,
 * et `--json` doit sortir un objet à lire plutôt qu'une phrase à parser.
 */
import { parseArgs } from 'node:util'
import { basename, extname, join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { STYLES_DIR, listStyles } from './styles-dir.ts'
import type { RenderResult } from './api.ts'
import type { Settings } from '../src/types.ts'

/** `api.ts` tire `@napi-rs/canvas`, dont le chargement de l'addon natif coûte
 *  une centaine de millisecondes. `--help` et `styles` n'en ont pas besoin :
 *  l'import attend d'avoir une image à rendre. */
const engine = () => import('./api.ts')

const OPTIONS = {
  out: { type: 'string', short: 'o' },
  'out-dir': { type: 'string' },
  spec: { type: 'string' },
  style: { type: 'string' },
  scale: { type: 'string' },
  format: { type: 'string' },
  frame: { type: 'string' },
  background: { type: 'string' },
  ratio: { type: 'string' },
  theme: { type: 'string' },
  url: { type: 'string' },
  padding: { type: 'string' },
  radius: { type: 'string' },
  seed: { type: 'string' },
  shadow: { type: 'string' },
  grain: { type: 'string' },
  'rotate-y': { type: 'string' },
  'no-title-bar': { type: 'boolean' },
  json: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
} as const

const HELP = `screenmat — un screenshot brut, un visuel prêt à partager.

  screenmat <image…> [options]     rendu direct
  screenmat --spec scene.json      scène complète, annotations comprises
  screenmat inspect <image>        dimensions et repère des calques
  screenmat styles                 styles disponibles

Options
  -o, --out <path>       fichier de sortie (défaut : <image>-screenmat.<ext>)
      --out-dir <dir>    dossier de sortie pour plusieurs images
      --style <nom|path> style enregistré, appliqué sous les autres options
      --scale 1|2|3      échelle d'export (défaut : 2)
      --format png|webp
      --frame browser|macbook|iphone|none
      --background mesh|gradient|solid
      --ratio auto|4:3|1:1|16:9|9:16
      --theme auto|light|dark
      --url <texte>      texte de la barre d'adresse
      --padding <n> --radius <n> --seed <n> --shadow <n> --grain <n>
      --rotate-y <deg>   inclinaison de la fenêtre (-24 à 24)
      --no-title-bar
      --json             résultat machine sur stdout
  -h, --help

Les styles se règlent dans l'app web, s'exportent en .json et se déposent dans
${STYLES_DIR} pour être rappelés par leur nom.`

type Flags = Partial<Record<keyof typeof OPTIONS, string | boolean>>

/** Ne retient que les réglages réellement passés : un champ absent doit laisser
 *  parler le style ou les défauts, pas être écrasé par `undefined`. */
function settingsFromFlags(flags: Flags): Partial<Settings> {
  const settings: Record<string, unknown> = {}
  const put = (key: string, value: unknown) => {
    if (value !== undefined) settings[key] = value
  }
  const asNumber = (value: string | boolean | undefined) =>
    typeof value === 'string' ? Number(value) : undefined

  put('format', flags.format)
  put('frame', flags.frame)
  put('background', flags.background)
  put('ratio', flags.ratio)
  put('theme', flags.theme)
  put('url', flags.url)
  put('padding', asNumber(flags.padding))
  put('radius', asNumber(flags.radius))
  put('seed', asNumber(flags.seed))
  put('shadow', asNumber(flags.shadow))
  put('grain', asNumber(flags.grain))
  put('rotateY', asNumber(flags['rotate-y']))
  if (flags['no-title-bar']) settings.titleBar = false

  return settings as Partial<Settings>
}

function outputPath(input: string, flags: Flags, format: string): string {
  if (typeof flags.out === 'string') return flags.out
  const name = `${basename(input, extname(input))}-screenmat.${format}`
  return typeof flags['out-dir'] === 'string' ? join(flags['out-dir'], name) : name
}

function report(json: boolean, payload: Record<string, unknown>): void {
  process.stdout.write(`${json ? JSON.stringify(payload) : humanize(payload)}\n`)
}

function humanize(payload: Record<string, unknown>): string {
  if (typeof payload.output === 'string') {
    return `${payload.output}  ${payload.width}×${payload.height}  ${payload.bytes} octets`
  }
  return JSON.stringify(payload, null, 2)
}

async function runSpec(specPath: string, flags: Flags): Promise<void> {
  const { render } = await engine()
  const spec = JSON.parse(await readFile(specPath, 'utf8')) as Record<string, unknown>
  const result = await render({
    ...spec,
    settings: { ...(spec.settings as object), ...settingsFromFlags(flags) },
    ...(typeof flags.style === 'string' ? { style: flags.style } : {}),
    ...(typeof flags.scale === 'string' ? { scale: Number(flags.scale) } : {}),
  })

  const first = (spec.shots as { input?: string }[] | undefined)?.[0]?.input ?? 'scene'
  await emit(result, outputPath(first, flags, result.format), Boolean(flags.json))
}

async function emit(result: RenderResult, output: string, json: boolean): Promise<void> {
  await writeFile(output, result.buffer)
  report(json, {
    output,
    width: result.width,
    height: result.height,
    bytes: result.buffer.length,
    format: result.format,
    settings: result.settings,
  })
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: OPTIONS,
    allowPositionals: true,
    args: process.argv.slice(2),
  })
  const flags = values as Flags
  const json = Boolean(flags.json)

  if (flags.help || (positionals.length === 0 && !flags.spec)) {
    process.stdout.write(`${HELP}\n`)
    return
  }

  const [command, ...rest] = positionals

  if (command === 'styles') {
    const styles = await listStyles()
    report(json, { directory: STYLES_DIR, styles: styles.map(toStyleSummary) })
    return
  }

  if (command === 'inspect') {
    const target = rest[0]
    if (!target) throw new Error('`inspect` attend le chemin d’une image')
    const { inspect } = await engine()
    report(json, { ...(await inspect(target, settingsFromFlags(flags))), input: target })
    return
  }

  if (typeof flags.spec === 'string') {
    await runSpec(flags.spec, flags)
    return
  }

  const { render } = await engine()
  for (const input of positionals) {
    const result = await render({
      input,
      settings: settingsFromFlags(flags),
      ...(typeof flags.style === 'string' ? { style: flags.style } : {}),
      ...(typeof flags.scale === 'string' ? { scale: Number(flags.scale) } : {}),
    })
    await emit(result, outputPath(input, flags, result.format), json)
  }
}

function toStyleSummary({ name, style }: Awaited<ReturnType<typeof listStyles>>[number]) {
  const { frame, background, ratio, format } = style.settings
  return { name, label: style.name, frame, background, ratio, format }
}

try {
  await main()
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
