---
{
  "id": "T-0004",
  "titre": "Texte au clic avec caret dans le canvas",
  "colonne": "revue",
  "priorite": "haute",
  "charge": "l",
  "tags": [
    "annotate",
    "canvas",
    "texte"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-16",
  "plan": "2026-08-16-shotframe-annotation-rendu-live-texte-au-clic-couleurs-inver.md",
  "epic": "T-0001"
}
---

## Contexte

Poser un label demande de glisser une boîte, alors que son rect ne porte que son
ancre : `bounds()` calcule déjà la taille depuis `labelSize()`, `w`/`h` sont
ignorés. Et la frappe se fait dans l'inspecteur, loin de l'endroit où le texte
apparaîtra.

`isPoint()` accepte `text` en plus de `badge` : un clic pose le label. `Scene`
gagne `editing?: { id, caret }` et `renderAnnotations` dessine le caret — c'est
la seule façon qu'il tombe au bon pixel quelle que soit l'échelle et la rotation
de la fenêtre. La frappe est capturée par un `input` invisible focalisé (IME,
dictée et clavier mobile gratuits).

## Critères d'acceptation

- [ ] Un clic avec l'outil Texte pose le label et ouvre la saisie ; le caret
      clignote dans le canvas et le texte s'affiche en direct au bon corps.
- [ ] `Enter`, `Escape`, un clic ailleurs ou un changement d'outil terminent la
      saisie ; un texte vide au commit supprime le calque.
- [ ] Double-clic sur un label avec l'outil Select rouvre la saisie.
- [ ] Sous `prefers-reduced-motion`, le caret ne clignote pas.
- [ ] Pendant la saisie, flèches et `Delete` vont au texte, pas au calque.
- [ ] `⌘E` pendant une saisie produit un PNG sans caret.
- [ ] `render.test.ts` : le caret n'est dessiné que si `scene.editing` est posé.
