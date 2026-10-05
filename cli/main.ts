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
import { isCanvasMissing } from './canvas-missing.ts'
import {
  addressText,
  capture,
  captureFlags,
  captureName,
  captureTarget,
  type CaptureFlags,
  type CaptureOptions,
} from './capture.ts'
import type { RenderResult } from './api.ts'
import { SCREEN_RATIOS } from '../src/lib/screen.ts'
import { SERIES } from '../src/lib/series.ts'
import { panFromText } from '../src/lib/spec.ts'
import type { Pan, Settings } from '../src/types.ts'

/** `api.ts` tire `@napi-rs/canvas`, dont le chargement de l'addon natif coûte
 *  une centaine de millisecondes. `--help` et `styles` n'en ont pas besoin :
 *  l'import attend d'avoir une image à rendre. `@napi-rs/canvas` est optionnel :
 *  une plateforme sans binaire installe le paquet quand même — le dire plutôt
 *  que laisser passer une trace de module. */
const engine = () =>
  import('./api.ts').catch((error: unknown) => {
    if (!isCanvasMissing(error)) throw error
    throw new Error('`@napi-rs/canvas` n’est pas installé, ou sans binaire pour cette plateforme : `pnpm add @napi-rs/canvas`')
  })

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
  'device-ratio': { type: 'boolean' },
  'screen-ratio': { type: 'string' },
  'island-side': { type: 'string' },
  pan: { type: 'string' },
  viewport: { type: 'string' },
  density: { type: 'string' },
  'full-page': { type: 'boolean' },
  'color-scheme': { type: 'string' },
  wait: { type: 'string' },
  json: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
} as const

/** Une liste trop longue pour une ligne d'aide, repliée par paquets. */
function wrap(items: readonly string[], per: number, indent: string): string {
  const lines: string[] = []
  for (let i = 0; i < items.length; i += per) lines.push(indent + items.slice(i, i + per).join('|'))
  return lines.join('\n')
}

const HELP = `screenmat — un screenshot brut, un visuel prêt à partager.

  screenmat <image|url…> [options] rendu direct, une URL est d'abord capturée
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
      --background ${SERIES.screenshot.join('|')}       depuis la capture
                   tramés :
${wrap(SERIES.dither, 4, '                     ')}
                   vrais fonds d'écran macOS :
${wrap(SERIES.macos, 3, '                     ')}
                   vrais fonds d'écran Windows :
${wrap(SERIES.windows, 3, '                     ')}
                   (macOS et Windows : depuis un clone du dépôt, pas le paquet npm)
      --ratio auto|4:3|1:1|16:9|9:16
      --theme auto|light|dark
      --url <texte>      texte de la barre d'adresse
      --padding <n> --radius <n> --seed <n> --shadow <n> --grain <n>
      --rotate-y <deg>   inclinaison de la fenêtre (-24 à 24)
      --no-title-bar
      --device-ratio     macbook, iphone : l'écran garde le ratio de l'appareil
      --screen-ratio ${SCREEN_RATIOS.join('|')}
                         browser, none : ratio de l'écran
      --island-side left|right
                         iphone couché : bord qui porte l'île (défaut : left)
      --pan <x,y>        part visible d'un screenshot rogné, 0 à 1 par axe
                         (défaut : 0.5,0.5)
      --json             résultat machine sur stdout

Capture d'URL (Chrome installé, ou \`pnpm exec playwright-core install chromium\`)
      --viewport <LxH>   taille de la fenêtre du navigateur (défaut : 1440x900)
      --density 1|2|3    densité de pixels (défaut : 2)
      --full-page        toute la hauteur de la page
      --color-scheme light|dark
                         ce que la page lit dans prefers-color-scheme
      --wait <sélecteur|ms>
                         attendre un élément, ou un délai, avant la capture
      La barre d'adresse reprend l'URL capturée, sauf --url.
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
  if (flags['device-ratio']) settings.deviceRatio = true
  const ratio = flags['screen-ratio']
  // Un ratio inconnu retomberait sur `auto` sans un mot : autre cadrage, même code de sortie.
  if (typeof ratio === 'string' && !(SCREEN_RATIOS as readonly string[]).includes(ratio)) {
    throw new Error(`\`--screen-ratio\` attend ${SCREEN_RATIOS.join(', ')} — reçu « ${ratio} »`)
  }
  put('screenRatio', ratio)
  const side = flags['island-side']
  if (typeof side === 'string' && side !== 'left' && side !== 'right') {
    throw new Error(`\`--island-side\` attend left ou right — reçu « ${side} »`)
  }
  put('islandSide', side)

  return settings as Partial<Settings>
}

/** `--pan x,y`. */
function panFromFlags(flags: Flags): Pan | undefined {
  return typeof flags.pan === 'string' ? panFromText(flags.pan) : undefined
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

  const { options, given } = captureFlags(flags as CaptureFlags)
  // Un flag de capture sans URL ne ferait rien, en silence.
  if (given.length > 0 && !positionals.some(isUrl)) {
    throw new Error(`\`${given[0]}\` ne s'applique qu'à une URL http(s)`)
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
    report(json, { ...(await inspect(target, settingsFromFlags(flags), panFromFlags(flags))), input: target })
    return
  }

  if (typeof flags.spec === 'string') {
    await runSpec(flags.spec, flags)
    return
  }

  const { render } = await engine()
  for (const input of positionals) {
    const shot = await source(input, flags, options)
    const result = await render({
      input: shot.input,
      settings: shot.settings,
      pan: panFromFlags(flags),
      ...(typeof flags.style === 'string' ? { style: flags.style } : {}),
      ...(typeof flags.scale === 'string' ? { scale: Number(flags.scale) } : {}),
    })
    await emit(result, outputPath(shot.name, flags, result.format), json)
  }
}

const isUrl = (input: string): boolean => /^https?:\/\//i.test(input)

/** Une image se lit telle quelle ; une URL se capture d'abord, et prête son
 *  adresse à la barre du navigateur comme son nom au fichier de sortie. */
async function source(input: string, flags: Flags, options: CaptureOptions) {
  const settings = settingsFromFlags(flags)
  if (!isUrl(input)) return { input, settings, name: input }
  const url = captureTarget(input)
  return {
    input: await capture(input, options),
    settings: { url: addressText(url), ...settings },
    name: captureName(url),
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
