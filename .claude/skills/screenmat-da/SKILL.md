---
name: screenmat-da
description: Direction artistique « Papier technique » de screenmat (clair et sombre) — jetons et thème, recettes de sélection, icônes Lucide, typographie, rayons, espace de travail unique, raccourcis clavier, références visuelles. À invoquer AVANT de toucher à un composant, une couleur, un token, une icône, un écran, un panneau, un raccourci, un état sélectionné ou survolé, une taille de texte ou un espacement. Écrire de l'interface sans avoir lu ce skill fait diverger la DA au premier ajustement.
---

# screenmat — direction artistique « Papier technique »

Encre sur papier en clair (`#F3F2EE` / `#111`), papier sur encre en sombre
(`#121110` / `#EDEBE5`), trame de points discrète, rayons de 2 px. **Aucune
couleur dans le chrome** : la couleur appartient à la capture et aux
annotations. L'« accent » est l'encre du thème, réservé à **deux** usages :
l'action primaire (aplat `bg-accent`) et la sélection courante. Le rouge
(`--color-danger`) est réservé au floutage et au destructif. Les annotations
sont ambre par défaut (`#FFD479`) : jamais la couleur de la sélection. Aucune
ombre dans le chrome — la seule ombre du produit appartient à l'artwork.

**Deux thèmes, un seul jeu de noms.** Les valeurs claires vivent dans
`@theme` (`src/index.css`), le sombre les redéfinit sous
`:root[data-theme='dark']`. Le thème est posé sur `<html>` avant le premier
rendu par le script en tête de chaque page (`index.html`, `app/index.html`, `docs/index.html`) (choix `sm-theme`, sinon le système), puis
suivi par `useTheme`. Il ne touche jamais l'export : rien dans `src/lib/` ne lit
un jeton du chrome. Pas de `text-white` ni de `bg-white/…` : `ink` est le
contraste du thème, `ink/[.04]` le survol.

**Une seule animation décorative : le reflet** (`sheen`), une bande qui
traverse un bouton au survol. Primaire et secondaire, jamais ailleurs.

## Les deux recettes de sélection

**Définies dans `src/components/ui.tsx` et nulle part ailleurs.** `SWITCH_ON`
(`bg-raised text-ink`) marque un *commutateur* — navigation, instrument,
ratio, format : il y en a toujours un d'allumé, l'accent y perdrait son sens.
`SELECTED` marque un *contenu sélectionné* — shot, calque, style, preset : ce
sur quoi la prochaine action portera, et c'est là que l'accent gagne sa place.
Une image ou une couleur prennent `ring-selected` : un fond teinté mentirait sur
ce qu'elles montrent. Un composant qui réécrit une de ces chaînes fait diverger
la DA au premier ajustement d'opacité.

## Typographie, icônes, rayons

Trois familles, trois rôles : **Unbounded 800** pour les titres qui
s'affichent en grand (`t-headline` : titre d'accueil, landing) et nulle part
dans les panneaux ; **Space Grotesk** pour ce qu'un humain lit ;
**JetBrains Mono** pour ce qu'une machine a produit (labels de section,
dimensions, seeds, noms de fichiers). Les trois sont embarquées en woff2 dans
`public/fonts/` — l'app doit rester utilisable hors ligne. Tokens et échelle typographique : `src/index.css`.

Un seul jeu d'icônes, **Lucide**, importé par le seul `src/components/icons.tsx`
— aucun autre fichier n'importe `lucide-react`. Taille (16 px, 20 px dans le
rail) et épaisseur du trait (1.5) sont posées une fois en CSS sur la classe
`.lucide` : le 2 px par défaut écraserait une DA dont les filets font 1 px.
Icône seule là où l'espace est compté et où le geste est évident (rail, œil et
cadenas d'un calque, undo/redo) ; icône **et** mot sur la navigation et les
actions de fin de course. Un raccourci clavier (`⌘V`, `⌫`) s'écrit, il ne se
dessine pas — et il s'écrit pour le clavier de celui qui regarde : `Keys`
(une capsule par touche) dans un panneau ou une infobulle, `keyLabel` dans un
`title`, tous deux lus dans `lib/keys.ts`. La table reste rédigée en symboles
Mac ; hors Mac elle sort en `Ctrl` `Shift` `Alt` `Del`. Ne jamais écrire `⌘`
en dur dans un composant. Les symboles prennent la police système
(`t-key-glyph`) : la mono embarquée ne les contient pas. Cinq noms de rayon (`--radius-xs|sm|md|lg|xl`) qui valent tous
2 px : le nom dit le rôle, la valeur est celle du papier.

## L'espace de travail

**Un seul écran de travail**, et l'écran d'import quand aucune image n'est
ouverte. Plus de navigation : Edit, Batch, Styles et History ont fusionné.

| Zone | Rôle |
|---|---|
| Barre haute (58 px) | identité à gauche ; à droite `Styles ▾` (menu), `History` (tiroir), `Export 2× ▾` (bouton primaire + menu), Dev docs, raccourcis, langue, thème |
| Panneau gauche (240 px) | les images de la session — clic = ouvrir, jamais vider le lot —, `Separate / Combined`, puis les calques de l'image active, et la nouvelle session au pied |
| Canvas | la barre d'outils flotte au-dessus, centrée sur la zone de dessin ; undo/redo et dimensions dessous |
| Inspecteur droit (288 px) | **contextuel** : un calque sélectionné ⇒ ses réglages seuls, avec `← Document` ; rien de sélectionné ⇒ Frame, Canvas, Background, Composition (en combiné), Shot, puis la section Style si un style est appliqué |

**Séparé ou combiné, sans champ de plus.** `layout: 'single'` est le mode
séparé (un fichier par image, le lot sort en zip depuis le menu Export) ; toute
autre disposition est le mode combiné, qui compose les images cochées. Le menu
Export porte format, échelle, copie et — en séparé, à plusieurs images — le lot :
ratios en plus, « Harmonize backgrounds », progression et annulation. Chaque
fichier du lot entre dans l'historique.

**Styles en menu** : appliquer, enregistrer, mettre à jour, importer/exporter en
`.json`. Nom, filigrane et palette figée se règlent dans la section Style de
l'inspecteur, là où l'effet se voit. **History en tiroir**, sur `<dialog>` natif.

**La barre d'outils ne porte que des instruments** — ce qui laisse une trace sur
le screenshot (`SEL TXT NUM ARR LIN BOX ELL RDC`). Le chrome d'annotation —
cadres, poignées, caret — ne se dessine que quand un calque est sélectionné ou
qu'un instrument de tracé est en main : avec `SEL` et rien de sélectionné, le
canvas montre exactement ce que l'export produira, et `Escape` y ramène.

**Une couleur se choisit partout par le même `ColorPicker`** : la pastille
courante (28 px, c'est elle qui ouvre le sélecteur natif), son hex éditable, puis
le nuancier en pastilles de 20 px — la palette du fond aux mêmes 20 px. Un hex
incomplet ou faux ne s'applique pas. **Une forme a un fond et un contour, chacun
sa bascule, sa couleur et sa transparence** (`ShapeStyle`, pour `BOX` et `ELL`) :
sections `Fill`, `Stroke`, puis `Appearance` (coins pour `BOX`, ombre). La
transparence se saisit dans un champ `%` à droite de l'hex, jamais au curseur ;
l'opacité du calque n'est pas proposée pour une forme — ce serait un troisième
réglage pour la même chose. Le champ va de 1 à 100 : une couleur se coupe à sa
bascule, pas en la rendant invisible. Couper le fond rallume le contour, dont la bascule se grise alors : une forme ne peut pas être invisible.
Le fond d'une forme neuve est l'ambre des annotations, pas la couleur de son
trait. **Un floutage se
choisit en `Rectangle` ou `Ellipse`** dans son inspecteur, deux tuiles au-dessus
de `blur · pixel · solid` — pas de second instrument dans la barre ; le choix
suit l'outil, comme tout réglage de style.

**La section Background range les fonds en séries** — `Screenshot · Dither` puis
`macOS · Windows`, un `Segmented` en grille 2×2 (les fonds générés sur une ligne,
les fonds d'écran sur l'autre) dont la valeur se déduit du type de fond. Les tuiles sont
des miniatures dessinées par le moteur (`BackgroundThumb`), jamais un dégradé CSS :
elles suivent la palette retouchée. Seuls les réglages que la série lit
s'affichent. Les séries macOS et Windows montrent les vrais fonds d'écran d'Apple
(Big Sur à Golden Gate) et de Microsoft (XP à Windows 11), embarqués dans
`public/wallpapers/` (© Apple, © Microsoft, hors licence MIT, voir `NOTICE.md`) :
ni palette, ni graine, ni grain — le fond tel qu'il est sur un bureau. Leurs
tuiles chargent une vignette de 192 px, jamais l'image entière. Windows 11
et XP sont en 3840 px ; 10, 8 et 7 en 1920 px — flous à l'export 3×.

**Le ratio de l'écran se règle dans la section Frame** (`ScreenRatioControl`) :
une bascule `Device ratio` pour `mac` et `phone`, une grille `Screen ratio` pour
`none` et `browser`. Verrouillé, l'écran rogne le screenshot ; **Espace + glisser**
sur le canvas choisit la part visible, image par image, et les calques suivent.
Un screenshot paysage couche le `phone` ; `Island · Left / Right` choisit alors
le bord qui porte l'îlot, et n'apparaît pas pour un screenshot portrait.

**Deux langues, une bascule écrite.** Le bouton de langue porte la langue
courante en mono (`EN`, `FR`) — une langue se lit, elle ne se dessine pas, donc
pas d'icône. Son nom accessible est dans la langue d'arrivée. Les libellés cités
dans ce document sont les anglais ; leur français vit dans `src/lib/i18n/`, un
mot par chose : capture, image, calque, fond, cadre, floutage, contour, pastille,
filigrane, graine. Un libellé français ne s'allonge pas au point de casser un
panneau de 240 ou 288 px : on prend le mot court.

Sous 1100 px, l'inspecteur devient une feuille rétractable. Pas de version
mobile — l'outil vit à côté d'un screenshot pris sur desktop.

## Raccourcis

**Deux portées, et la frontière n'est pas cosmétique.** Les combinaisons à
modificateur valent partout : `⌘V` coller · `⌘E` exporter · `⌘C` copier · `⌘Z`
annuler · `⇧⌘Z` refaire · `⌘D` dupliquer · `⌘A` tout sélectionner · `⌘G` grouper ·
`⇧⌘G` dégrouper · `⌘↑`/`⌘↓` ordre dans la pile.

Les **touches nues** n'existent que quand le canvas a le focus — il l'a par
défaut dès qu'un shot est chargé, et le reprend après un choix d'outil ou une
saisie : les outils `V T N A L R O B` (table `TOOL_KEYS`, `lib/tools.ts`) ·
`⇧R` régénérer le fond · `1/2/3` échelle d'export · `Delete` supprimer ·
`Escape` désélectionner, puis revenir à `V` · `←↑→↓` déplacer (`⇧` = pas ×5). Les poser sur `window` avec `preventDefault()` tuait le
défilement aux flèches de tout panneau, et WCAG 2.1.4 exige de pouvoir couper,
remapper, ou n'activer qu'au focus un raccourci à touche unique. `useShortcuts`
rend le handler du canvas, il ne l'installe pas.

**Se découvrir sans visite guidée.** Une seule table fait foi : `SHORTCUTS`
(`useShortcuts.ts`) plus `TOOL_KEYS`. Le panneau `?` (touche nue, ou bouton
clavier de la barre haute) ne lit qu'elles ; une touche ajoutée à un handler sans
l'être là est introuvable, et un test refuse deux sens pour une même touche.
Les barres (outils, barre haute, barre basse) portent une vraie infobulle
`Tooltip` — nom puis touche en `<kbd>`, au survol après 300 ms, au focus clavier
tout de suite ; ailleurs, `title` natif, faute de portail. Au premier import,
trois astuces (`T`, glisser, `⌘E`) au-dessus de la barre basse, fermées une fois
pour toutes (`sm-tips-seen`). Enregistrer ou mettre à jour un style s'accuse
dans la ligne d'état.

`⇧` **pendant un tracé** aimante une flèche ou un trait aux multiples de 45° —
horizontales, verticales et diagonales parfaites — et carre une surface. En
tirant une poignée, il conserve les proportions et aimante de même. Sur le canvas
avec l'outil Select : `⇧`/`⌘`-clic ajoute au lot, glisser sur le vide trace un
rectangle de sélection.

**Un outil reste en main après un tracé** : `Escape` ou `V` le rendent. Il
retient aussi son dernier style — couleur, épaisseur, taille, ombre… — d'un
calque au suivant et d'une session à l'autre (`lib/tool-style.ts`,
`localStorage`) : un réglage fait à l'inspecteur devient celui de son outil.
`⌥`-glisser sur un calque le duplique, la copie part avec le curseur ; hors
calque, `⌥`-glisser déplace l'image entière. Au survol,
un trait fin montre ce qu'un clic attraperait. Une sélection multiple porte sa
boîte englobante, pointillée, avec quatre poignées de coin homothétiques.

Le **calque texte** est blanc sur une plaque noire à 85 %, en Space Grotesk 600,
avec une ombre : lisible sur n'importe quel screenshot sans rien régler. Un clic
le pose et ouvre la saisie sur place — `Entrée` va à la ligne, `⌘Entrée` ou
`Escape` valident ; un double-clic, quel que soit l'outil, la rouvre ; un texte
laissé vide supprime le calque. Ses bords règlent la largeur de retour à la
ligne, son coin la taille. Toute la mise en page passe par `layoutText`
(`lib/text.ts`) : le dessin et le cadre de sélection lisent la même mesure.

## La landing

`/` est une page statique (`index.html`, `src/landing/`), sans React : même
jetons, mêmes polices, même reflet. Le titre en Unbounded est le LCP ; la
vitrine « Signature » se charge après. Les équerres du logo partent des coins
de la fenêtre, se referment sur la capture tramée (Bayer 4×4, encre sur papier
en clair, papier sur encre en sombre), qui se développe de haut en bas, puis
glisse à sa place dans le **vrai** rendu de `renderScene` — réglages par
défaut de l'éditeur, rien d'autre. `T A R B` y posent de vrais calques (focus
dans la vitrine), `⌫` annule, `↻` rejoue. Une capture collée ou déposée passe
par la même séquence, puis « Continue in editor » l'emporte dans `/app/`. La
version française vit sur `/fr/`, générée depuis ce même balisage ; dans
l'en-tête, à gauche du thème, un lien carré de même gabarit (`FR` / `EN`) mène à
l'autre langue, et l'éditeur ouvert depuis `/fr/` s'ouvre en français. Mouvement
réduit : l'état final directement. La capture de démo est un fichier,
`public/landing/demo.webp`, généré par `docs/assets/landing-demo.ts`.

## Références visuelles

`~/Downloads/screenshot exemples/` — 7 captures qui sont le rendu cible.
`~/Downloads/design_handoff_shotframe_afterglow/` — le handoff de la refonte
(README + canvas de design). La spec mesurée de l'artwork vit dans `lib/frame.ts`
sous forme de constantes relatives.

## Organisation

`src/components/` — composants React en PascalCase, un par fichier.
`src/hooks/` — hooks `use*`. `src/types.ts` — tous les types partagés.
