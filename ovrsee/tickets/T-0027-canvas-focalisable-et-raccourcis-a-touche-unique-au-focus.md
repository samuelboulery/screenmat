---
{
  "id": "T-0027",
  "titre": "Canvas focalisable et raccourcis à touche unique au focus",
  "colonne": "fait",
  "priorite": "haute",
  "charge": "m",
  "tags": [
    "a11y",
    "clavier"
  ],
  "cree": "2026-08-16",
  "maj": "2026-08-17",
  "epic": "T-0026",
  "plan": "2026-08-16-shotframe-corriger-les-15-constats-de-la-revue-d-interface.md"
}
---

## Contexte

Constats 2 et 5 de la revue, une seule cause : les touches simples sont posées
sur `window` **parce que** le canvas n'est pas focalisable.

Vérifié en page : avec le focus sur un bouton du rail, `ArrowDown`, `ArrowUp`,
`r`, `1`, `Backspace` et `Escape` renvoient tous `defaultPrevented: true`. Les
flèches ne défilent donc plus l'inspecteur `overflow-y-auto`, et WCAG 2.1.4 (A)
exige de pouvoir couper, remapper, ou n'activer qu'au focus un raccourci à
touche unique.

Sonde DOM sur le `<canvas>` : `{aria: null, role: null, tabindex: null,
text: ""}`. Le sujet du produit n'a ni nom ni chemin clavier, et les poignées de
redimensionnement sont des `<span role="presentation">` de 9 px — sous le
minimum WCAG 2.5.8 de 24×24.

Le rendre focalisable règle les deux constats d'un coup.

## Critères d'acceptation

- [ ] Le focus sur un bouton de l'inspecteur puis `↓` défile le panneau au lieu
      de déplacer un calque.
- [ ] Le focus sur le canvas puis `r` régénère le fond, `↓` déplace le calque
      sélectionné, `⌫` le supprime.
- [ ] Le canvas expose un nom accessible décrivant la scène (cadre, fond, nombre
      de calques) et entre dans l'ordre de tabulation.
- [ ] Un premier shot importé laisse le focus sur le canvas : le comportement
      souris est inchangé.
- [ ] Les raccourcis à modificateur (`⌘E`, `⌘C`, `⌘Z`, `⌘D`, `⌘A`, `⌘G`, `⌘↑`)
      restent globaux.
- [ ] Les poignées gardent leur carré visible de 9 px et offrent une cible de
      24 px, sans recouvrement entre poignées adjacentes sur une annotation
      minuscule.
