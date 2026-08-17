# shotframe, côté machine

La même chose que l'app web, appelée par autre chose qu'un humain : un script de
build, un générateur de docs, une IA dans un projet quelconque.

`render(spec)` est le cœur. Le CLI, le serveur MCP et l'import direct n'en sont
que des enveloppes — aucune ne contient de logique, et aucune ne redessine quoi
que ce soit : c'est `renderScene()`, le moteur de l'app, qui tourne dans Node
grâce aux globales Canvas installées par `dom-shim.ts`.

```
                    render(spec) → Buffer
                    inspect(input) → geometry
                          cli/api.ts
                              ▲
        ┌─────────────────────┼─────────────────────┐
   cli/main.ts           cli/mcp.ts            import direct
```

Node ≥ 24 : le TypeScript s'exécute tel quel, il n'y a pas d'étape de build.

```bash
pnpm cli capture.png                      # défauts, déjà bons
pnpm cli inspect capture.png --json       # repère des calques
pnpm mcp                                  # serveur MCP sur stdio
```

## La documentation

Elle vit en Markdown dans **[`../public/docs/`](../public/docs/)**, une seule
source servie de deux façons : la page `/docs` de l'app la met en forme, et les
`.md` se lisent tels quels — par GitHub, par `curl`, ou donnés à un modèle.
Ce fichier-ci n'est qu'un panneau indicateur : tout ce qui suit y est détaillé,
et n'est répété nulle part ailleurs.

| Page | Ce qu'on y trouve |
|---|---|
| [overview.md](../public/docs/overview.md) | Le tour d'horizon, les prérequis, le démarrage en 60 s, et ce que chaque façade sait atteindre |
| [cli.md](../public/docs/cli.md) | Les quatre formes de commande, tous les flags avec défaut et bornes, sorties et codes d'erreur |
| [mcp.md](../public/docs/mcp.md) | Le branchement, la garde d'écriture, et les trois outils |
| [api.md](../public/docs/api.md) | `render()` et `inspect()`, types de retour, erreurs |
| [scene.md](../public/docs/scene.md) | Le JSON de scène, champ par champ |
| [coordinates.md](../public/docs/coordinates.md) | Le repère des calques — à lire avant d'en placer un |
| [styles.md](../public/docs/styles.md) | Régler dans l'app, rappeler par son nom |
| [recipes.md](../public/docs/recipes.md) | Recettes exécutables, puis le dépannage |
| [llms.txt](../public/docs/llms.txt) | L'index à donner à un modèle |
