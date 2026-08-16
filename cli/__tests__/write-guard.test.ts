import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { resolveUnder, writeNew, writeRoot } from '../write-guard.ts'

/* La garde qui sépare le serveur MCP du reste du disque. C'est un modèle
   distant qui fournit `output` : ce qui se teste ici, c'est ce qui arrive
   quand il se trompe. */

let dir: string

beforeAll(async () => {
  // `mkdtemp` sur macOS rend un chemin sous /var, lien symbolique vers
  // /private/var : on résout une fois pour que les comparaisons portent sur la
  // même forme que celle que `writeRoot` produira.
  dir = resolve(await mkdtemp(join(tmpdir(), 'shotframe-guard-')))
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
  delete process.env.SHOTFRAME_OUT
})

describe('writeRoot', () => {
  it('prend le dossier du screenshot fourni', () => {
    delete process.env.SHOTFRAME_OUT
    expect(writeRoot(join(dir, 'shot.png'))).toBe(dir)
  })

  it('cède à SHOTFRAME_OUT quand il est posé', () => {
    process.env.SHOTFRAME_OUT = join(dir, 'ailleurs')
    expect(writeRoot(join(dir, 'shot.png'))).toBe(join(dir, 'ailleurs'))
    delete process.env.SHOTFRAME_OUT
  })
})

describe('resolveUnder', () => {
  it('accepte un nom simple et un sous-dossier', () => {
    expect(resolveUnder(dir, 'a.png')).toBe(join(dir, 'a.png'))
    expect(resolveUnder(dir, 'sous/a.png')).toBe(join(dir, 'sous', 'a.png'))
  })

  it('refuse ce qui sort de la racine', () => {
    expect(() => resolveUnder(dir, '../evil.png')).toThrow(/doit rester sous/)
    expect(() => resolveUnder(dir, '../../evil.png')).toThrow(/doit rester sous/)
    expect(() => resolveUnder(dir, '/etc/evil.png')).toThrow(/doit rester sous/)
    // Un `..` au milieu remonte tout autant — c'est pour lui que la
    // comparaison se fait après `resolve`, jamais sur la chaîne brute.
    expect(() => resolveUnder(dir, 'sous/../../evil.png')).toThrow(/doit rester sous/)
  })

  it('ne se laisse pas avoir par un dossier voisin au nom préfixé', () => {
    // `<dir>/x` ne doit pas laisser passer `<dir>/xy` : un `startsWith` sans
    // séparateur l'aurait accepté.
    expect(() => resolveUnder(join(dir, 'x'), join(dir, 'xy', 'a.png'))).toThrow(/doit rester sous/)
  })
})

describe('writeNew', () => {
  it('écrit, puis suffixe au lieu d’écraser', async () => {
    const target = join(dir, 'shot-shotframe.png')

    expect(await writeNew(target, Buffer.from('un'))).toBe(target)
    expect(await writeNew(target, Buffer.from('deux'))).toBe(join(dir, 'shot-shotframe-2.png'))
    expect(await writeNew(target, Buffer.from('trois'))).toBe(join(dir, 'shot-shotframe-3.png'))

    // Le premier fichier n'a pas bougé : c'est tout l'objet de la garde.
    expect(await readFile(target, 'utf8')).toBe('un')
  })

  it('suffixe avant l’extension, pas après', async () => {
    const target = join(dir, 'archive.tar.gz')
    await writeNew(target, Buffer.from('a'))
    expect(await writeNew(target, Buffer.from('b'))).toBe(join(dir, 'archive.tar-2.gz'))
  })

  it('gère un chemin sans extension', async () => {
    const target = join(dir, 'sans-extension')
    await writeNew(target, Buffer.from('a'))
    expect(await writeNew(target, Buffer.from('b'))).toBe(join(dir, 'sans-extension-2'))
  })

  it('remonte une erreur qui n’est pas un EEXIST', async () => {
    // Dossier inexistant : ENOENT doit sortir, pas être confondu avec un
    // fichier déjà pris et relancer la boucle de suffixage.
    await expect(writeNew(join(dir, 'absent', 'a.png'), Buffer.from('a'))).rejects.toThrow()
  })
})
