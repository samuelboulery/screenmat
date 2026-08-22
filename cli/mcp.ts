#!/usr/bin/env node
/**
 * Serveur MCP — la porte des IA qui n'ont pas de shell. Zéro logique : chaque
 * outil appelle `render()` ou `inspect()`.
 *
 * Le point délicat n'est pas le code, c'est la prose : **la description des
 * outils est la seule documentation que le modèle lira**. Le repère des calques
 * y est décrit en entier, avec un exemple — c'est là que se joue la justesse
 * des annotations produites, pas dans le moteur.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { basename } from 'node:path'
import { inspect, render } from './api.ts'
import { resolveUnder, writeNew, writeRoot } from './write-guard.ts'
import { STYLES_DIR, listStyles } from './styles-dir.ts'
import { ANNOTATION_LIMITS } from '../src/lib/annotate.ts'

const REPERE = `Repère des calques — à lire avant de placer quoi que ce soit.
Un rect est en fractions de la LARGEUR DE LA FENÊTRE (le cadre dessiné autour du
screenshot), origine à son coin haut-gauche. \`y\` est divisé par la largeur lui
aussi, jamais par la hauteur : un screenshot 16:9 occupe donc y de 0 à 0.5625.
\`w\` et \`h\` sont signés — une flèche va de (x, y) vers (x+w, y+h), ce qui lui
permet de pointer dans les quatre directions.
Appeler d'abord screenmat_inspect : il renvoie \`screen\`, le rectangle qu'occupe
le screenshot dans ce repère, décalé de la barre de titre. Pour convertir un
point lu en pixels sur l'image : x = px / imageWidth, y = screen.y + py / imageWidth.`

const rect = z
  .object({
    x: z.number(),
    y: z.number(),
    w: z.number().default(0),
    h: z.number().default(0),
  })
  .describe('Rect en fractions de la largeur de la fenêtre. w/h signés.')

const layer = z.object({
  kind: z.enum(['text', 'badge', 'arrow', 'line', 'box', 'ellipse', 'redaction']),
  rect,
  text: z.string().max(280).optional().describe('Texte, pour kind=text uniquement.'),
  redaction: z
    .enum(['blur', 'pixel', 'solid'])
    .optional()
    .describe('Mode de masquage, pour kind=redaction. Cuit dans les pixels : illisible à l’export.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe('Hex à six chiffres, ex. #7DE2FF.'),
  labelStyle: z.enum(['pill', 'plain', 'badge']).optional(),
  size: z.number().min(ANNOTATION_LIMITS.size.min).max(ANNOTATION_LIMITS.size.max).optional(),
  strokeWidth: z
    .number()
    .min(ANNOTATION_LIMITS.strokeWidth.min)
    .max(ANNOTATION_LIMITS.strokeWidth.max)
    .optional(),
  fill: z.number().min(0).max(1).optional().describe('Opacité du remplissage. 0 = contour seul.'),
  opacity: z.number().min(0.1).max(1).optional(),
})

/** Ce qui déplace le screenshot dans sa fenêtre, et rien d'autre : c'est tout ce
 *  dont `screenmat_inspect` a besoin. Lui exposer le reste coûterait des tokens
 *  à chaque tour et laisserait croire que la graine ou le grain changent sa
 *  réponse. */
const geometrySettings = z.object({
  frame: z.enum(['browser', 'macbook', 'iphone', 'none']).optional(),
  ratio: z.enum(['auto', '4:3', '1:1', '16:9', '9:16']).optional(),
  padding: z.number().min(0).max(0.3).optional(),
  radius: z.number().min(0).max(0.08).optional(),
  rotateY: z.number().min(-24).max(24).optional(),
  titleBar: z.boolean().optional(),
})

const settings = geometrySettings
  .extend({
    background: z.enum(['mesh', 'gradient', 'solid']).optional(),
    theme: z.enum(['auto', 'light', 'dark']).optional(),
    url: z.string().max(200).optional().describe('Texte de la barre d’adresse, pour frame=browser.'),
    shadow: z.number().min(0).max(2).optional(),
    grain: z.number().min(0).max(1).optional(),
    seed: z.number().int().optional().describe('Même graine ⇒ même fond, à l’identique.'),
    format: z.enum(['png', 'webp']).optional(),
  })
  .optional()

const server = new McpServer({ name: 'screenmat', version: '0.1.0' })

server.registerTool(
  'screenmat_render',
  {
    title: 'Embellir un screenshot',
    description: `Transforme un ou plusieurs screenshots en visuel prêt à partager : fenêtre
arrondie, fond génératif dérivé des couleurs dominantes de l'image, annotations,
floutage. Écrit un fichier et renvoie son chemin.

Appelé sans réglages, il produit déjà un bon résultat : ne rien passer est le cas
nominal. N'ajouter des calques que si l'utilisateur a demandé de désigner ou de
masquer quelque chose.

Avant de placer un calque, appeler screenmat_inspect : sa description porte le
repère de coordonnées, et sa réponse dit où le screenshot atterrit.`,
    inputSchema: {
      shots: z
        .array(
          z.object({
            input: z.string().describe('Chemin du screenshot à embellir.'),
            layers: z.array(layer).max(64).optional(),
            placement: z
              .object({
                scale: z.number().min(0.2).max(3).optional(),
                dx: z.number().min(-3).max(3).optional(),
                dy: z.number().min(-3).max(3).optional(),
              })
              .optional()
              .describe('Retouche de cette fenêtre, en largeurs de fenêtre.'),
          }),
        )
        .min(1)
        .max(24),
      output: z.string().optional().describe('Chemin du fichier à écrire. Défaut : <input>-screenmat.<format>.'),
      style: z.string().optional().describe(`Nom d'un style enregistré (voir screenmat_list_styles).`),
      settings,
      composition: z
        .object({
          layout: z.enum(['single', 'stack', 'side', 'tilt3d']),
          spread: z.number().min(0).max(1).optional(),
          columns: z.number().int().min(0).max(8).optional().describe('Grille `side`. 0 = auto.'),
          offsetY: z.number().min(-0.5).max(0.5).optional(),
        })
        .optional()
        .describe('Disposition multi-shot. Sans effet à un seul shot.'),
      scale: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().describe('Défaut : 2.'),
    },
  },
  async (args) => {
    const result = await render(args)
    const root = writeRoot(args.shots[0]!.input)
    // Sans `output`, le défaut se replie sur son seul nom de fichier : la
    // racine décide déjà du dossier, y compris quand SCREENMAT_OUT la déplace.
    const wanted = args.output ?? basename(defaultOutput(args.shots[0]!.input, result.format))
    const output = await writeNew(resolveUnder(root, wanted), result.buffer)

    // On renvoie un chemin, jamais l'image : une PNG en base64 coûterait des
    // milliers de tokens par appel pour une image que le modèle n'a pas besoin
    // de revoir. Ce chemin peut différer de celui demandé — voir `writeNew`.
    return json({ output, width: result.width, height: result.height, bytes: result.buffer.length })
  },
)

server.registerTool(
  'screenmat_inspect',
  {
    title: 'Repère de placement des calques',
    description: `Dit où le screenshot atterrit dans sa fenêtre. À appeler avant de placer une
annotation : sans lui, une position calculée depuis les pixels de l'image se
retrouve décalée de la hauteur de la barre de titre.

${REPERE}`,
    inputSchema: {
      input: z.string().describe('Chemin du screenshot.'),
      settings: geometrySettings.optional(),
    },
  },
  async ({ input, settings: overrides }) => json(await inspect(input, overrides)),
)

server.registerTool(
  'screenmat_list_styles',
  {
    title: 'Styles enregistrés',
    description: `Liste les styles réglés à la main dans l'app screenmat et déposés dans
${STYLES_DIR}. Un style se rappelle par son nom dans screenmat_render, et évite
d'avoir à repasser une dizaine de réglages.`,
    inputSchema: {},
  },
  async () => {
    const styles = await listStyles()
    return json({
      directory: STYLES_DIR,
      styles: styles.map(({ name, style }) => ({
        name,
        label: style.name,
        frame: style.settings.frame,
        background: style.settings.background,
        ratio: style.settings.ratio,
      })),
    })
  },
)

function defaultOutput(input: string, format: string): string {
  return input.replace(/\.[^./]+$/, '') + `-screenmat.${format}`
}

function json(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] }
}

await server.connect(new StdioServerTransport())
