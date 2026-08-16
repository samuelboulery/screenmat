---
{
  "id": "T-0028",
  "titre": "Focus visible sur les contrôles cachés",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "xs",
  "tags": [
    "a11y",
    "clavier"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "epic": "T-0026",
  "plan": "2026-08-16-shotframe-corriger-les-15-constats-de-la-revue-d-interface.md"
}
---

## Contexte

Constat 8. La sonde DOM relève trois contrôles focalisables de moins de 2 px :
les deux `<input type=file class="sr-only">` de `App.tsx` et l'`<input
type=color class="size-0 opacity-0">` de `AnnotationStyle.tsx`.

L'anneau `:focus-visible` posé une fois dans `index.css` y est rogné ou
invisible. Les deux inputs fichier sont déclenchés par un bouton et n'ont rien à
faire dans l'ordre de tabulation ; le sélecteur de couleur, lui, est le **seul**
chemin clavier vers une couleur personnalisée et doit donc rester atteignable —
avec un focus qu'on voit.

## Critères d'acceptation

- [ ] Tab depuis la barre haute ne traverse plus les deux inputs fichier.
- [ ] Le sélecteur de couleur personnalisée reçoit le focus au clavier et son
      anneau est visible sur le carré de 40 px.
- [ ] Choisir une couleur au clavier applique bien la couleur au calque
      sélectionné.
