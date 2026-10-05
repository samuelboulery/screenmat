import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { execFile } from 'node:child_process'
import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

/* Le paquet tel qu'un utilisateur le reçoit : construit, empaqueté, installé
   dans un projet vide, puis exécuté. C'est le seul test qui voit `dist-npm/` —
   tous les autres exécutent les `.ts` du dépôt. */

const exec = promisify(execFile)
const ROOT = resolve(import.meta.dirname, '../..')

let work: string
let project: string
let tarball: string

async function run(bin: string, args: string[], cwd = project) {
  return exec(join(project, 'node_modules/.bin', bin), args, { cwd })
}

function fixture(): Buffer {
  const canvas = createCanvas(400, 300)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1d4ed8'
  ctx.fillRect(0, 0, 400, 300)
  return canvas.toBuffer('image/png')
}

beforeAll(async () => {
  work = resolve(await mkdtemp(join(tmpdir(), 'screenmat-pack-')))
  // `prepack` lance `build:cli` : empaqueter, c'est aussi construire.
  await exec('pnpm', ['pack', '--pack-destination', work], { cwd: ROOT })
  tarball = join(work, (await readdir(work)).find((name) => name.endsWith('.tgz'))!)

  project = join(work, 'project')
  await exec('mkdir', ['-p', project])
  await writeFile(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }))
  await exec('pnpm', ['add', tarball, '--prefer-offline'], { cwd: project })
  await writeFile(join(project, 'shot.png'), fixture())
}, 180_000)

afterAll(async () => {
  await rm(work, { recursive: true, force: true })
})

describe('paquet npm', () => {
  it('ne contient que dist-npm/, les polices et les métadonnées', async () => {
    const { stdout } = await exec('tar', ['-tzf', tarball])
    const entries = stdout.split('\n').filter(Boolean)
    expect(entries).toContain('package/dist-npm/cli/main.js')
    expect(entries).toContain('package/dist-npm/cli/capture-child.js')
    expect(entries.some((entry) => entry.startsWith('package/dist-npm/public/fonts/'))).toBe(true)
    // `dist-npm/src/lib/wallpapers.js` est le catalogue des identifiants, du code :
    // ce sont les images de `public/wallpapers/` qui ne doivent pas partir.
    expect(entries.filter((entry) => /public\/wallpapers|src\/components|__tests__|\.ts$/.test(entry) && !entry.endsWith('.d.ts'))).toEqual([])
  })

  it('répond à --help', async () => {
    const { stdout } = await run('screenmat', ['--help'])
    expect(stdout).toContain('screenmat')
  })

  it('rend une image', async () => {
    await run('screenmat', ['shot.png', '-o', 'out.webp'])
    expect((await stat(join(project, 'out.webp'))).size).toBeGreaterThan(0)
  })

  it('expose l’API Node', async () => {
    const { stdout } = await exec(
      process.execPath,
      ['--input-type=module', '-e', "const m = await import('screenmat/node'); console.log(Object.keys(m).sort().join())"],
      { cwd: project },
    )
    expect(stdout.trim().split(',')).toEqual(expect.arrayContaining(['capture', 'inspect', 'render']))
  })

  it('démarre le serveur MCP', async () => {
    // Sur stdio, le serveur attend un client : vivant au bout d'une seconde,
    // c'est qu'il a démarré sans planter.
    const child = execFile(join(project, 'node_modules/.bin/screenmat-mcp'), { cwd: project })
    let stderr = ''
    child.stderr?.on('data', (chunk) => (stderr += chunk))
    await new Promise((done) => setTimeout(done, 1000))
    expect(child.exitCode).toBeNull()
    child.kill()
    expect(stderr).toBe('')
  })

  it('capture une URL avec le processus enfant compilé', async () => {
    const { createServer } = await import('node:http')
    const server = createServer((_, response) => response.end('<body style="background:#0f0"></body>'))
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
    const { port } = server.address() as import('node:net').AddressInfo
    try {
      await run('screenmat', [`http://127.0.0.1:${port}/`, '-o', 'url.webp'])
      expect((await stat(join(project, 'url.webp'))).size).toBeGreaterThan(0)
    } catch (error) {
      // Sans navigateur, seul le message d'absence est toléré — et pas en CI.
      const text = String((error as { stderr?: string }).stderr ?? error)
      if (process.env.CI || !/aucun navigateur trouvé|n’est pas installé/.test(text)) throw error
    } finally {
      server.close()
    }
  })

  it('dit pourquoi un fond macOS ou Windows manque', async () => {
    await expect(run('screenmat', ['shot.png', '--background', 'tahoe-dark', '-o', 'bg.webp'])).rejects.toMatchObject({
      stderr: expect.stringContaining('paquet npm'),
    })
  })

  it('dit quoi installer quand @napi-rs/canvas manque', async () => {
    const bare = join(work, 'bare')
    await exec('mkdir', ['-p', bare])
    await writeFile(join(bare, 'package.json'), JSON.stringify({ name: 'bare', private: true, type: 'module' }))
    await exec('pnpm', ['add', tarball, '--prefer-offline', '--no-optional'], { cwd: bare })
    await writeFile(join(bare, 'shot.png'), fixture())
    await expect(
      exec(join(bare, 'node_modules/.bin/screenmat'), ['shot.png'], { cwd: bare }),
    ).rejects.toMatchObject({ stderr: expect.stringContaining('`@napi-rs/canvas` n’est pas installé') })
  })
}, 180_000)
