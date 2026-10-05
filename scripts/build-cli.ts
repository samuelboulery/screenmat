/**
 * Construit le paquet npm : vide `dist-npm/`, compile la porte machine, copie les
 * polices que `dom-shim.ts` lit par `../public/fonts/`. Seul le paquet en a
 * besoin — dans le dépôt, `cli/` tourne tel quel.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, rmSync } from 'node:fs'

// Un fichier d'un build précédent partirait sinon dans le tarball.
rmSync('dist-npm', { recursive: true, force: true })
execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.publish.json'], { stdio: 'inherit' })
cpSync('public/fonts', 'dist-npm/public/fonts', { recursive: true })
