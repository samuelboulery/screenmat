---
{
  "status": "open",
  "title": "Documentation de la porte machine + lien `Docs` dans la barre haute",
  "opened": "2026-08-16",
  "closed": null,
  "commits": []
}
---

# Documentation de la porte machine + lien `Docs` dans la barre haute

## Context

shotframe expose une seconde porte d'entrée sur son moteur — `render(spec)` dans
`cli/api.ts`, avec trois façades : CLI (`cli/main.ts`), serveur MCP
(`cli/mcp.ts`), import direct. Aujourd'hui sa seule documentation est
`cli/README.md` (134 lignes) : correcte mais dense, invisible depuis l'app, et
incomplète sur les points où l'on se trompe vraiment (repère de coordonnées des
calques, bornes et défauts de chaque réglage, précédence style/flags).

But : une vraie documentation de référence — exemples, schémas, raccourcis pour
la donner telle quelle à un LLM — atteignable depuis la barre haute, et qui
reste **hors ligne** comme le reste du produit.

Décisions prises avec l'utilisateur : documentation **en anglais** (comme l'UI et
les noms d'outils MCP), périmètre **porte machine seule** (pas l'app, pas les
raccourcis clavier), servie par une **page `/docs` dans le build**.

## Approche

**Une source unique, deux lectures.** Le contenu vit en Markdown dans
`public/docs/*.md` : lisible tel quel par un LLM, par `curl`, et par GitHub. Une
page lecteur (`/docs`) le charge et le met en forme avec les tokens Afterglow.
Aucune duplication, aucun fichier généré à commiter, aucune dépendance ajoutée.

```
public/docs/*.md   ← LA SOURCE (LLM · GitHub · curl)
      │
      ├─ fetch ──▶ /docs   page lecteur, 2e entrée Vite, tokens Afterglow
      └─ lien ───▶ cli/README.md, CLAUDE.md, skill shotframe-machine
```

Pas de dépendance markdown : un mini-rendu maison (~150 lignes) couvrant le
sous-ensemble réellement utilisé. Il construit des nœuds DOM via
`document.createElement`, **jamais `innerHTML`** — l'audit du 2026-08-16 note
« zéro `innerHTML` » comme propriété du dépôt, on la garde.

## Fichiers

### Nouveaux — la page lecteur

| Fichier | Rôle |
|---|---|
| `docs/index.html` | 2e entrée Vite → URL `/docs/`. Préchargement des polices, `<script src="/src/docs/main.ts">` |
| `src/docs/main.ts` | manifeste des pages, chargement `fetch`, sommaire, routage par `#hash`, boutons de copie |
| `src/docs/md.ts` | mini-rendu Markdown → `DocumentFragment`, sans dépendance |
| `src/docs/highlight.ts` | coloration minimale `json` / `bash` / `ts` (~35 lignes, `ponytail:` sur ses limites) |
| `src/docs/docs.css` | importe `../index.css`, ajoute la mise en page (rail, prose, blocs de code, encarts) |
| `src/docs/__tests__/md.test.ts` | Vitest sur le rendu Markdown |

`src/docs/` et non `docs/` pour le TypeScript : `tsconfig.app.json` inclut `src`,
et `vitest.include` couvre `src/**/*.test.ts`. Rien à changer côté tsconfig.

`vite.config.ts` — seule modification :

```ts
build: {
  rollupOptions: { input: { main: 'index.html', docs: 'docs/index.html' } },
},
```

### Nouveaux — le contenu (`public/docs/`, en anglais)

| Page | Contenu |
|---|---|
| `overview.md` | ce qu'est la porte machine, schéma ASCII des trois façades, prérequis (Node ≥ 24, `optionalDependencies`, pas d'étape de build), quickstart 60 s dans les trois modes |
| `cli.md` | les quatre formes (`<image…>`, `--spec`, `inspect`, `styles`), **tableau exhaustif des flags** avec type, défaut et bornes, chemins de sortie, forme de `--json`, codes de sortie |
| `mcp.md` | branchement (`claude mcp add shotframe -- node …/cli/mcp.ts`), `SHOTFRAME_OUT` / `SHOTFRAME_STYLES`, garde-fous d'écriture (racine, jamais d'écrasement, suffixe `-2`), puis les trois outils : paramètres, bornes, forme du retour |
| `api.md` | `render(SimpleSpec \| SceneSpec)`, `inspect(input, settings?)`, types de retour, erreurs jetées, exemple de script de build |
| `scene.md` | le JSON de scène champ par champ : `settings` (18 champs), `composition`, `shots`, `layers` (7 `kind`, chaque propriété avec défaut et bornes), `watermark`, `palette`, `scale`. Rappel des règles de validation : borne appliquée par clamp, `kind` inconnu écarté sans faire tomber la scène |
| `coordinates.md` | **la page qui évite l'erreur classique** : schéma ASCII de la fenêtre, `y` divisé par la largeur, `w`/`h` signés, rôle de `inspect()`, conversion pixel → fraction avec un exemple chiffré |
| `styles.md` | régler dans l'app → exporter `.json` → `~/.shotframe/styles/` → rappeler par nom ; précédence défauts < style < réglages explicites ; cache par `mtime` |
| `recipes.md` | recettes courtes et testables : capture de doc, lot vers un dossier, cadre appareil, fond reproductible par `seed`, floutage d'une zone, filigrane, composition multi-shot. Section « Troubleshooting » en fin de page |
| `llms.txt` | index au format llms.txt : une ligne par page avec son URL `.md` et un résumé |

Tous les chiffres cités (défauts, bornes) se relisent à la source au moment de
l'écriture — `DEFAULT_SETTINGS` et `DEFAULT_COMPOSITION` dans `src/types.ts`,
`ANNOTATION_DEFAULTS` / `ANNOTATION_LIMITS` dans `src/lib/annotate.ts`, les clamps
de `parseSettings` (`src/lib/styles.ts`) et de `parseScene` (`src/lib/spec.ts`),
les flags de `cli/main.ts`, les schémas zod de `cli/mcp.ts`. Aucune valeur
recopiée depuis un résumé.

**Schémas : ASCII dans des blocs ```text**, pas de SVG. C'est ce qui se lit aussi
bien dans la page que dans le `.md` brut donné à un LLM ou affiché par GitHub.

### Modifiés

- `src/components/TopBar.tsx` — le lien, à droite (`ml-auto`), **toujours
  visible**, écran d'import compris : `DocsIcon` + le mot « Docs »,
  `href="/docs/"`, `target="_blank"`, `rel="noreferrer"`, `title="Docs — API, CLI, MCP"`.
  La barre garde une largeur constante d'un écran à l'autre : c'est de la
  navigation, pas une action sur le document.
- `src/components/ui.tsx` — un composant `LinkButton` (`<a>`) ; la recette
  « ghost » (`text-ink-soft hover:text-ink`) est extraite en constante partagée
  avec la variante `ghost` de `Button` plutôt que recopiée. Ni `SWITCH_ON` ni
  `SELECTED` : un lien sortant n'est ni un commutateur ni une sélection.
- `src/components/icons.tsx` — `BookOpen as DocsIcon`, seul endroit qui importe
  `lucide-react`.
- `cli/README.md` — ramené à ~20 lignes : le schéma des trois façades et des
  liens vers `../public/docs/*.md`. Il cesse d'être une seconde source.
- `CLAUDE.md` et `.claude/skills/shotframe-machine/SKILL.md` — le pointeur
  « détail complet : `cli/README.md` » devient « `public/docs/` ».

### Hors périmètre, assumé

- Pas de moteur de recherche dans la page — `⌘F` couvre 8 pages. `ponytail:`.
- Pas de coloration syntaxique complète : trois langages, à la regex.
- Pas de version du site par version du produit.

## Vérification

1. `pnpm exec tsc -b` — vert (app + node + cli).
2. `pnpm test` — la suite passe, `src/docs/__tests__/md.test.ts` compris
   (titres et ancres, bloc de code avec langue, tableau, liste, lien, et
   vérification qu'un `<script>` écrit dans un `.md` ressort en texte, pas en
   nœud exécutable).
3. `pnpm dev` → l'app : le lien « Docs » est en haut à droite sur l'écran
   d'import **et** sur les quatre écrans ; il ouvre `/docs/` dans un onglet.
4. Sur `/docs/` : les 8 pages se chargent, le sommaire suit le défilement, les
   `#ancres` sont partageables, « Copy page » et « Copy all » remplissent le
   presse-papier en Markdown, `/docs/llms.txt` et `/docs/scene.md` répondent en
   brut.
5. `pnpm build && pnpm preview` — `dist/docs/index.html` et `dist/docs/*.md`
   existent ; la page fonctionne le réseau coupé (polices locales, aucun appel
   sortant : à vérifier dans l'onglet Réseau).
6. **Chaque exemple de la doc est exécuté avant d'être publié** :
   `pnpm cli <image> --frame macbook --ratio 16:9 --scale 3`,
   `pnpm cli inspect <image> --json`, `pnpm cli --spec <scene.json>`,
   `pnpm cli styles`. Un exemple qui ne tourne pas ne rentre pas.
