/**
 * Capture d'une URL — la seule porte de `cli/` qui touche au réseau, et
 * seulement vers l'URL qu'on lui donne.
 *
 * Le navigateur tourne dans un processus à part (`capture-child.ts`) : à son
 * import, `playwright-core` lit `document.currentScript`, et le `document` posé
 * par `dom-shim.ts` jette sur toute propriété qu'il ne connaît pas. Plutôt que
 * d'affaiblir le shim, le processus enfant ne le charge jamais.
 *
 * Ce module ne fait que valider et lancer : il n'importe ni Playwright ni le
 * moteur, et se charge donc sans aucune dépendance optionnelle.
 */
import { execFile, type ExecFileException } from 'node:child_process'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'

export type ColorScheme = 'light' | 'dark'

export type CaptureOptions = {
  /** Largeur du viewport, en pixels CSS. */
  width?: number
  /** Hauteur du viewport, en pixels CSS. */
  height?: number
  /** `deviceScaleFactor` : 2 donne une capture nette à l'export 3×. */
  density?: number
  /** Toute la hauteur de la page, pas seulement le viewport. */
  fullPage?: boolean
  /** Ce que la page lit dans `prefers-color-scheme`. */
  colorScheme?: ColorScheme
  /** Un sélecteur CSS à attendre, ou un délai en millisecondes. */
  waitFor?: string | number
}

export type ResolvedCapture = Required<Omit<CaptureOptions, 'waitFor'>> & Pick<CaptureOptions, 'waitFor'>

const LIMITS = {
  width: [320, 3840],
  height: [240, 2160],
  density: [1, 3],
  waitFor: [0, 30_000],
} as const

const DEFAULTS: ResolvedCapture = { width: 1440, height: 900, density: 2, fullPage: false, colorScheme: 'light' }

/** Au-delà, la navigation ou l'attente échoue : une page qui ne charge pas
 *  ne bloque pas un script de build indéfiniment. */
export const NAVIGATION_TIMEOUT = 30_000

function reject(field: string, expected: string, value: unknown): never {
  throw new Error(`\`${field}\` attend ${expected} — reçu « ${String(value)} »`)
}

function bounded(field: keyof typeof LIMITS, value: unknown, integer: boolean): number {
  const [min, max] = LIMITS[field]
  const valid = typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
  if (!valid || (integer && !Number.isInteger(value))) {
    reject(field, `${integer ? 'un entier' : 'un nombre'} entre ${min} et ${max}`, value)
  }
  return value
}

function waitFor(value: unknown): string | number | undefined {
  if (value === undefined) return undefined
  // `"500"` est un délai, pas le sélecteur `500` qu'on attendrait 30 s pour rien.
  if (typeof value === 'string' && /^\d+$/.test(value)) return bounded('waitFor', Number(value), true)
  if (typeof value === 'string' && value.trim() !== '' && value.length <= 500) return value
  if (typeof value === 'number') return bounded('waitFor', value, true)
  return reject('waitFor', 'un sélecteur CSS ou un délai en millisecondes', value)
}

/**
 * Valide champ par champ, comme `parseStyle` : les options viennent d'un flag,
 * d'un script ou d'un modèle, jamais d'une source sûre. Un champ faux jette
 * en le nommant plutôt que de retomber sur le défaut — une capture à la
 * mauvaise taille ne se remarque qu'après coup.
 */
export function parseCaptureOptions(raw: unknown): ResolvedCapture {
  if (raw === undefined) return DEFAULTS
  if (typeof raw !== 'object' || raw === null) reject('options', 'un objet', raw)
  const input = raw as Record<string, unknown>
  const pick = <T>(key: keyof CaptureOptions, read: (value: unknown) => T, fallback: T): T =>
    input[key] === undefined ? fallback : read(input[key])

  const options: ResolvedCapture = {
    width: pick('width', (value) => bounded('width', value, true), DEFAULTS.width),
    height: pick('height', (value) => bounded('height', value, true), DEFAULTS.height),
    density: pick('density', (value) => bounded('density', value, false), DEFAULTS.density),
    fullPage: pick(
      'fullPage',
      (value) => (typeof value === 'boolean' ? value : reject('fullPage', 'un booléen', value)),
      DEFAULTS.fullPage,
    ),
    colorScheme: pick(
      'colorScheme',
      (value) => (value === 'light' || value === 'dark' ? value : reject('colorScheme', '`light` ou `dark`', value)),
      DEFAULTS.colorScheme,
    ),
  }
  const wait = waitFor(input.waitFor)
  return wait === undefined ? options : { ...options, waitFor: wait }
}

/** Seuls `http:` et `https:` passent : `file:` lirait le disque, `javascript:`
 *  exécuterait le texte donné. `localhost` et les IP privées restent permis —
 *  capturer son serveur de dev est le premier usage, sur la machine de celui
 *  qui lance la commande. */
export function captureTarget(url: string): URL {
  // L'URL voyage en argument de ligne de commande : une URL géante y échouerait
  // (E2BIG) avec un message qui ne dirait rien.
  if (url.length > 2048) reject('url', 'une URL de 2048 caractères au plus', `${url.slice(0, 60)}…`)
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return reject('url', 'une URL http(s)', url)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') reject('url', 'une URL http(s)', url)
  return parsed
}

/** Le texte de la barre d'adresse : l'hôte et le chemin, comme un navigateur
 *  l'affiche — sans schéma, requête ni ancre. Même plafond que `settings.url`. */
export function addressText(url: URL): string {
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
  return `${url.host}${path}`.slice(0, 200)
}

/** Un nom de fichier tiré de l'hôte et du chemin : `example-com-pricing`. */
export function captureName(url: URL): string {
  const slug = `${url.host}${url.pathname}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '')
  return slug || 'screenmat'
}

/** Les flags du CLI propres à la capture. */
export type CaptureFlags = {
  viewport?: string
  density?: string
  'full-page'?: boolean
  'color-scheme'?: string
  wait?: string
}

const FLAG_NAMES = ['viewport', 'density', 'full-page', 'color-scheme', 'wait'] as const

/**
 * Traduit les flags en options, sans les borner — `parseCaptureOptions` s'en
 * charge, une seule fois pour toutes les portes. `given` liste les flags
 * présents : le CLI refuse une capture demandée sans URL à capturer.
 */
export function captureFlags(flags: CaptureFlags): { options: CaptureOptions; given: string[] } {
  const given = FLAG_NAMES.filter((name) => flags[name] !== undefined).map((name) => `--${name}`)
  let options: CaptureOptions = {}
  if (flags.viewport !== undefined) {
    const match = /^(\d+)x(\d+)$/.exec(flags.viewport)
    if (!match) reject('--viewport', '<largeur>x<hauteur>, par exemple 1440x900', flags.viewport)
    options = { ...options, width: Number(match[1]), height: Number(match[2]) }
  }
  if (flags.density !== undefined) options = { ...options, density: Number(flags.density) }
  if (flags['full-page']) options = { ...options, fullPage: true }
  if (flags['color-scheme'] !== undefined) options = { ...options, colorScheme: flags['color-scheme'] as ColorScheme }
  if (flags.wait !== undefined) options = { ...options, waitFor: flags.wait }
  return { options, given }
}

/** Plafond de pixels d'une capture : au-delà, le décodage en RGBA dans
 *  `render` réclamerait des gigaoctets. Le viewport le plus grand
 *  (3840 × 2160 × 3²) tient dessous ; seule une page entière peut l'atteindre. */
export const MAX_PIXELS = 100_000_000

/** La hauteur à capturer en page entière, en pixels CSS : celle de la page,
 *  coupée pour que l'image tienne sous `MAX_PIXELS`. */
export function fullPageHeight(scrollHeight: number, { width, density }: Pick<ResolvedCapture, 'width' | 'density'>): number {
  return Math.min(scrollHeight, Math.floor(MAX_PIXELS / (width * density * density)))
}

/** `capture-child.ts` dans le dépôt, `.js` dans le paquet npm : `tsc` réécrit
 *  les imports, pas une chaîne passée à `new URL()`. */
const CHILD = fileURLToPath(new URL(`./capture-child${extname(fileURLToPath(import.meta.url))}`, import.meta.url))

/** Le lancement, la navigation, l'attente et la capture ont chacun leur
 *  délai de 30 s dans le processus enfant : le sien les couvre tous, pour que
 *  ce soit l'erreur précise de l'enfant qui remonte, pas un SIGTERM. */
const PROCESS_TIMEOUT = NAVIGATION_TIMEOUT * 4 + 30_000

/** Un PNG de `MAX_PIXELS` d'une page web en pèse bien moins : la marge ne
 *  sert qu'aux pages très bruitées. */
const MAX_PNG = 128 * 1024 * 1024

/**
 * Ce que l'appelant lit quand l'enfant échoue. Jamais la ligne de commande
 * d'`execFile` : elle recopie la requête JSON sans rien expliquer. stderr
 * peut commencer par un avertissement de Node — la dernière ligne est celle
 * de l'enfant.
 */
export function explainFailure(error: ExecFileException, stderr: string): string {
  if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
    return `capture trop lourde (plus de ${MAX_PNG / 1024 / 1024} Mo), abandonnée`
  }
  if (error.killed) return `délai de ${PROCESS_TIMEOUT / 1000} s dépassé, capture abandonnée`
  const lines = stderr.split('\n').map((line) => line.trim()).filter(Boolean)
  return lines.at(-1) ?? `le processus de capture a échoué (code ${String(error.code)})`
}

/** Une capture à la fois : un modèle qui en lance dix en parallèle ouvrirait
 *  dix Chrome. ponytail: file unique et globale ; un sémaphore à N places si
 *  `serve` doit tenir du débit. */
let queue: Promise<unknown> = Promise.resolve()

/**
 * Capture `url` et renvoie un PNG. Options validées ici, avant tout
 * lancement, pour qu'une faute de frappe ne coûte pas un navigateur.
 *
 * ponytail: un navigateur lancé par capture (~1 s). Garder une instance
 * ouverte dans le serveur MCP ou `serve` si le débit finit par compter.
 */
export async function capture(url: string, options?: CaptureOptions): Promise<Buffer> {
  const target = captureTarget(url).href
  const request = JSON.stringify({ url: target, options: parseCaptureOptions(options) })
  const run = queue.then(() => spawnCapture(target, request))
  // La file n'attend que la fin de la capture précédente, réussie ou non ;
  // l'erreur, elle, revient à l'appelant par `run`.
  queue = run.catch(() => undefined)
  return run
}

function spawnCapture(target: string, request: string): Promise<Buffer> {
  return new Promise((resolve, fail) => {
    execFile(
      process.execPath,
      [CHILD, request],
      { encoding: 'buffer', maxBuffer: MAX_PNG, timeout: PROCESS_TIMEOUT },
      (error, stdout, stderr) => {
        if (!error) return resolve(stdout)
        fail(new Error(`Impossible de capturer ${target} : ${explainFailure(error, stderr.toString())}`))
      },
    )
  })
}
