---
{
  "id": "T-0073",
  "titre": "Page lecteur /docs, rendu markdown sans dépendance",
  "colonne": "revue",
  "priorite": "haute",
  "tags": [
    "docs",
    "build"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "plan": "2026-08-16-documentation-de-la-porte-machine-lien-docs-dans-la-barre-ha.md"
}
---

## Contexte

La documentation de la porte machine doit se lire dans un navigateur, hors
ligne, sans que le contenu soit dupliqué entre une version « jolie » et une
version donnable à un LLM. Le contenu vit donc en `.md` sous `public/docs/` et
une page lecteur le met en forme.

Pas de dépendance markdown : un sous-ensemble suffit, et le dépôt tient à sa
propriété « zéro `innerHTML` » — le rendu construit des nœuds DOM.

## Critères d'acceptation

- [ ] `/docs/` répond en `pnpm dev` **et** après `pnpm build && pnpm preview`
      (2e entrée Vite, `dist/docs/index.html` produit).
- [ ] La page réutilise les tokens Afterglow — aucune couleur redéclarée à la
      main, `src/index.css` est la source.
- [ ] Rail de sommaire : les pages, puis les titres de la page courante ; les
      ancres `#…` sont partageables et survivent au rechargement.
- [ ] Chaque bloc de code a un bouton de copie ; `json`, `bash` et `ts` sont
      colorés a minima.
- [ ] Deux boutons de copie en Markdown : la page courante, et la doc entière.
- [ ] `src/docs/md.ts` ne contient aucun `innerHTML` ; un `<script>` écrit dans
      un `.md` ressort en texte.
- [ ] `src/docs/__tests__/md.test.ts` couvre titres et ancres, bloc de code avec
      langue, tableau, liste, lien, et le cas `<script>` ci-dessus.
- [ ] `pnpm exec tsc -b` et `pnpm test` verts.
- [ ] Aucun appel réseau sortant : vérifié dans l'onglet Réseau.
