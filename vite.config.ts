import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ponytail: config vitest fusionnée ici — un seul fichier tant qu'aucun réglage
// de test ne diverge de celui du build.
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
