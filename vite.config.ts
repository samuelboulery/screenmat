import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { docsPrerender } from './vite-docs-prerender.ts'

/**
 * L'origine du site, sans barre finale. C'est la seule place où le domaine
 * s'écrit : `canonical`, `og:url`, le sitemap et `robots.txt` en descendent.
 *
 * `SCREENMAT_SITE_URL` la surcharge : un domaine propre le jour où il arrive,
 * sans toucher au code. Les déploiements de préversion de Vercel répondent sur
 * d'autres sous-domaines — le `canonical` les renvoie tous ici, et c'est le but.
 */
const SITE_URL = (process.env.SCREENMAT_SITE_URL ?? 'https://screenmat.vercel.app').replace(/\/+$/, '')

// ponytail: config vitest fusionnée ici — un seul fichier tant qu'aucun réglage
// de test ne diverge de celui du build.
export default defineConfig({
  plugins: [react(), tailwindcss(), docsPrerender({ siteUrl: SITE_URL })],
  build: {
    // Deux pages : l'app, et le lecteur de documentation servi sur `/docs/`.
    // Le contenu, lui, vit en Markdown dans `public/docs/` et se sert tel quel.
    rollupOptions: { input: { main: 'index.html', docs: 'docs/index.html' } },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'cli/**/*.test.ts'],
  },
})
