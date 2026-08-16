---
name: shotframe-da
description: Direction artistique « Afterglow » de shotframe — palette et accent, recettes de sélection, icônes Lucide, typographie, rayons, carte des quatre écrans, raccourcis clavier, références visuelles. À invoquer AVANT de toucher à un composant, une couleur, un token, une icône, un écran, un panneau, un raccourci, un état sélectionné ou survolé, une taille de texte ou un espacement. Écrire de l'interface sans avoir lu ce skill fait diverger la DA au premier ajustement.
---

# shotframe — direction artistique « Afterglow »

Scène noire (`#07070A`), panneaux translucides flottants, un seul accent
cyan→violet (`#7DE2FF` → `#A378FF`) réservé à **deux** usages : l'action
primaire et la sélection courante. `#FF9A9A` est réservé au floutage et au
destructif. Aucune ombre portée dans le chrome — la seule ombre du produit
appartient à l'artwork.

## Les deux recettes de sélection

**Définies dans `src/components/ui.tsx` et nulle part ailleurs.** `SWITCH_ON`
(`bg-raised text-white`) marque un *commutateur* — navigation, instrument,
ratio, format : il y en a toujours un d'allumé, l'accent y perdrait son sens.
`SELECTED` marque un *contenu sélectionné* — shot, calque, style, preset : ce
sur quoi la prochaine action portera, et c'est là que l'accent gagne sa place.
Une image ou une couleur prennent `ring-selected` : un fond teinté mentirait sur
ce qu'elles montrent. Un composant qui réécrit une de ces chaînes fait diverger
la DA au premier ajustement d'opacité.

## Typographie, icônes, rayons

Deux familles : **Space Grotesk** (ce qu'un humain lit) et **JetBrains Mono**
(ce qu'une machine a produit : labels de section, dimensions, seeds, noms de
fichiers). Les deux sont embarquées en woff2 dans `public/fonts/` — l'app doit
rester utilisable hors ligne. Tokens et échelle typographique : `src/index.css`.

Un seul jeu d'icônes, **Lucide**, importé par le seul `src/components/icons.tsx`
— aucun autre fichier n'importe `lucide-react`. Taille (16 px, 20 px dans le
rail) et épaisseur du trait (1.5) sont posées une fois en CSS sur la classe
`.lucide` : le 2 px par défaut écraserait une DA dont les filets font 1 px.
Icône seule là où l'espace est compté et où le geste est évident (rail, œil et
cadenas d'un calque, undo/redo) ; icône **et** mot sur la navigation et les
actions de fin de course. Un raccourci clavier (`⌘V`, `⌫`) s'écrit, il ne se
dessine pas. Cinq rayons, pas seize : `--radius-xs|sm|md|lg|xl`.

## Écrans

**Quatre destinations, un seul état** (`Screen`, dans `types.ts`) : `edit`,
`batch`, `styles`, `history`. La barre haute de 58 px ne porte que l'identité et
la navigation — deux groupes segmentés, `Edit | Batch` (le document) puis
`Styles | History` (la bibliothèque), séparés par un espace et non par un trait.
Aucune action n'y entre : sa largeur ne bouge donc plus d'un écran à l'autre.

**Une action vit près de ce qu'elle manipule.** Copy et Export sont dans le
filmstrip, avec les dimensions, undo/redo et la nouvelle session ; les actions
de lot au pied du panneau Batch ; l'export et l'enregistrement d'un style dans
l'écran Styles, chacun du côté de ce qu'il produit.

| Écran | Rôle |
|---|---|
| Import | premier écran, dropzone + exports récents (déduit de « aucun shot ») |
| Edit | embellir **et** annoter : rail d'instruments à gauche, inspecteur unique à droite, filmstrip en bas. Les compositions multi-shot (single/stack/side/tilt3d) s'y règlent aussi, filmstrip docké |
| Styles | nommer et réutiliser un réglage complet, partage par `.json` |
| Batch | appliquer un style à N shots, sortir un zip ; « Harmonize backgrounds » aligne l'intensité des fonds du lot sans toucher aux teintes |
| History | retrouver un export passé et le réouvrir avec ses réglages |

**Le rail gauche ne porte que des instruments** — ce qui laisse une trace sur le
screenshot (`SEL TXT NUM ARR LIN BOX ELL RDC`). Les réglages du document sont
des sections repliables de l'inspecteur, pas des outils. Le chrome d'annotation
— cadres, poignées, caret — ne se dessine que quand un calque est sélectionné ou
qu'un instrument de tracé est en main : avec `SEL` et rien de sélectionné, le
canvas montre exactement ce que l'export produira, et `Escape` y ramène.

Sous 1100 px : le rail passe en barre horizontale, l'inspecteur devient une
feuille rétractable. Pas de version mobile — l'outil vit à côté d'un screenshot
pris sur desktop.

## Raccourcis

**Deux portées, et la frontière n'est pas cosmétique.** Les combinaisons à
modificateur valent partout : `⌘V` coller · `⌘E` exporter · `⌘C` copier · `⌘Z`
annuler · `⇧⌘Z` refaire · `⌘D` dupliquer · `⌘A` tout sélectionner · `⌘G` grouper ·
`⇧⌘G` dégrouper · `⌘↑`/`⌘↓` ordre dans la pile.

Les **touches nues** n'existent que quand le canvas a le focus — il l'a par
défaut dès qu'un shot est chargé : `R` régénérer le fond · `1/2/3` échelle
d'export · `Delete` supprimer · `Escape` désélectionner · `←↑→↓` déplacer
(`⇧` = pas ×5). Les poser sur `window` avec `preventDefault()` tuait le
défilement aux flèches de tout panneau, et WCAG 2.1.4 exige de pouvoir couper,
remapper, ou n'activer qu'au focus un raccourci à touche unique. `useShortcuts`
rend le handler du canvas, il ne l'installe pas.

`⇧` **pendant un tracé** aimante une flèche ou un trait aux multiples de 45° —
horizontales, verticales et diagonales parfaites — et carre une surface. En
tirant une poignée, il conserve les proportions et aimante de même. Sur le canvas
avec l'outil Select : `⇧`/`⌘`-clic ajoute au lot, glisser sur le vide trace un
rectangle de sélection.

L'outil Texte pose son label d'un clic et ouvre la saisie sur place ; un
double-clic la rouvre, un texte laissé vide supprime le calque.

## Références visuelles

`~/Downloads/screenshot exemples/` — 7 captures qui sont le rendu cible.
`~/Downloads/design_handoff_shotframe_afterglow/` — le handoff de la refonte
(README + canvas de design). La spec mesurée de l'artwork vit dans `lib/frame.ts`
sous forme de constantes relatives.

## Organisation

`src/components/` — composants React en PascalCase, un par fichier.
`src/hooks/` — hooks `use*`. `src/types.ts` — tous les types partagés.
