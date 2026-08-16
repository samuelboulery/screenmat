---
{
  "id": "T-0022",
  "titre": "API render() et inspect()",
  "epic": "T-0019",
  "colonne": "backlog",
  "priorite": "haute",
  "charge": "m",
  "tags": ["api"],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-pilotable-par-une-machine.md"
}
---

## Contexte

Le cœur que le CLI, le serveur MCP et un script de dev appellent tous les trois.
`cli/api.ts` :

```ts
export async function render(spec: SceneSpec | SimpleSpec): Promise<RenderResult>
// { buffer, width, height, format, settings }

export async function inspect(input: string | Buffer): Promise<InspectResult>
// { imageWidth, imageHeight, window: FractionRect, titleBar }
```

Forme courte, pour l'usage « outil de dev, sans annotations » :

```ts
const { buffer } = await render({
  input: 'docs/capture.png',
  settings: { frame: 'macbook', ratio: '16:9' },
  scale: 2,
})
```

C'est la même fonction : la forme courte est du sucre qui construit une scène à
un shot sans calques. Une seule implémentation, un seul validateur.

Enchaînement — chaque étape appelle du code déjà écrit : `loadImage()` (napi) →
`extractPalette()` → `parseScene()` → `Scene` assemblée → `computeGeometry()` →
`renderScene()` → `canvas.encode()`. Un seul cast, commenté, à la frontière :
l'`Image` napi n'est pas un `HTMLImageElement` au sens TypeScript, mais l'est
structurellement pour Canvas 2D.

`lib/export.ts` n'est **pas** utilisé — Blob, `<a download>` et presse-papier
sont du navigateur. L'API encode directement. Pas de second chemin de rendu pour
autant : `renderScene()` reste seul à dessiner.

**`inspect()` est ce qui rend les annotations réellement plaçables.** Il renvoie
où le screenshot atterrit dans la fenêtre, barre de titre comprise. Sans lui, un
modèle qui a lu l'image en pixels décale toutes ses flèches de la hauteur de la
barre de titre — silencieusement, et à chaque fois.

## Critères d'acceptation

- [ ] `render()` accepte une scène complète comme la forme courte, par la même
      implémentation.
- [ ] Sur une PNG 2×2 générée en mémoire : `width === BASE_WIDTH * scale`,
      hauteur conforme au ratio demandé.
- [ ] Deux rendus au même `seed` sont **octet pour octet identiques** — le
      déterminisme du fond est ce qui casse le plus silencieusement.
- [ ] Un `box` couvrant `inspect().window` épouse exactement le screenshot,
      barre de titre exclue.
- [ ] Une erreur de décodage remonte avec le chemin fautif, jamais un buffer
      vide.
