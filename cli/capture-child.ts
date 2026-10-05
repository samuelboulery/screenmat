/**
 * Le processus qui pilote le navigateur pour `capture()`. Il ne charge jamais
 * `dom-shim.ts` — c'est sa raison d'exister, voir `capture.ts`.
 *
 * Entrée : un JSON `{ url, options }` déjà validé, en premier argument.
 * Sortie : le PNG sur stdout ; en cas d'échec, un message lisible sur stderr
 * et le code 1. Rien d'autre n'est écrit sur stdout.
 */
import type { Browser, Page } from 'playwright-core'
import { NAVIGATION_TIMEOUT, fullPageHeight, type ResolvedCapture } from './capture.ts'

type CaptureRequest = { url: string; options: ResolvedCapture }

/** Première ligne d'une erreur : Playwright y ajoute un journal d'appels. */
function firstLine(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split('\n')[0]!
}

async function playwright(): Promise<typeof import('playwright-core')> {
  try {
    return await import('playwright-core')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error('`playwright-core` n’est pas installé : `pnpm add playwright-core`')
    }
    throw error
  }
}

/**
 * Le Chrome installé d'abord — rien à télécharger —, sinon le Chromium que
 * Playwright gère. Toujours avec son bac à sable : la page chargée n'est pas
 * digne de confiance, et Playwright le retire par défaut.
 */
async function launch(): Promise<Browser> {
  const { chromium } = await playwright()
  const options = { chromiumSandbox: true, timeout: NAVIGATION_TIMEOUT }
  try {
    return await chromium.launch({ ...options, channel: 'chrome' })
  } catch {
    // Chrome absent est le cas courant : c'est l'échec du repli qui compte.
    try {
      return await chromium.launch(options)
    } catch (error) {
      throw new Error(
        `aucun navigateur trouvé — installer Google Chrome, ou lancer \`pnpm exec playwright-core install chromium\` (${firstLine(error)})`,
      )
    }
  }
}

/** Un contexte vierge, sans téléchargement ni service worker, qui refuse toute
 *  requête hors http(s) — y compris celle d'une redirection, que `captureTarget`
 *  ne voit pas. */
async function openPage(browser: Browser, options: ResolvedCapture): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: options.width, height: options.height },
    deviceScaleFactor: options.density,
    colorScheme: options.colorScheme,
    acceptDownloads: false,
    serviceWorkers: 'block',
  })
  await context.route('**/*', (route) =>
    /^https?:/.test(route.request().url()) ? route.continue() : route.abort(),
  )
  return context.newPage()
}

async function shoot(page: Page, { url, options }: CaptureRequest): Promise<Buffer> {
  await page.goto(url, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT })
  if (typeof options.waitFor === 'string') {
    await page.waitForSelector(options.waitFor, { timeout: NAVIGATION_TIMEOUT })
  } else if (typeof options.waitFor === 'number') {
    await page.waitForTimeout(options.waitFor)
  }
  if (!options.fullPage) return page.screenshot({ type: 'png', timeout: NAVIGATION_TIMEOUT })

  // Une page infinie se coupe sous `MAX_PIXELS` plutôt que d'épuiser la mémoire.
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  const clip = { x: 0, y: 0, width: options.width, height: fullPageHeight(scrollHeight, options) }
  return page.screenshot({ type: 'png', fullPage: true, clip, timeout: NAVIGATION_TIMEOUT })
}

async function run(request: CaptureRequest): Promise<Buffer> {
  const browser = await launch()
  try {
    return await shoot(await openPage(browser, request.options), request)
  } finally {
    // Un navigateur déjà mort refuse de se fermer : l'erreur qui compte est
    // celle d'avant, que cet échec masquerait.
    await browser.close().catch((error: unknown) => process.stderr.write(`fermeture : ${firstLine(error)}\n`))
  }
}

try {
  process.stdout.write(await run(JSON.parse(process.argv[2] ?? '') as CaptureRequest))
} catch (error) {
  process.stderr.write(`${firstLine(error)}\n`)
  process.exitCode = 1
}
