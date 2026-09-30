#!/usr/bin/env bash
#
# Regenerates the README visuals, in English and in French, from the raw
# captures of the editor.
#
# `before.webp` and `before.fr.webp` are the raw captures, and they are the ONE
# step this script cannot do: screenmat's own editor, captured with a screenshot
# loaded. To refresh them — after a redesign, a rename, a new panel:
#
#   1. `pnpm dev`, open `/app/` at 1440 × 900 (device scale 2), light theme,
#      tips closed, and load `public/landing/demo.webp` (paste or drop).
#   2. Capture the viewport once in English, once in French (the EN / FR
#      button of the top bar).
#   3. Re-encode them here:  ./regenerate.sh capture-en.png capture-fr.png
#
# Called with no argument, the script reuses the captures already on disk and
# only re-renders the derived images.
#
# The layer coordinates in `annotated*.json` are fractions of the WINDOW WIDTH
# with the origin at the window's top-left — not the canvas, and `y` is divided
# by the width too. A new capture of a different size needs them recomputed:
# `pnpm cli inspect docs/assets/before.webp --frame browser --ratio 16:9 --json`
# gives the frame, and `public/docs/coordinates.md` gives the rules.

set -euo pipefail
cd "$(dirname "$0")"

CLI="../../cli/main.ts"

# Un `input` de scène se résout depuis le répertoire courant, pas depuis le
# fichier de scène : d'où le `cd` ci-dessus, qui garde `annotated*.json` portables.

encode() {
  echo "→ $2 — re-encoding $1"
  node --input-type=module -e "
    import { createCanvas, loadImage } from '@napi-rs/canvas'
    import { writeFile } from 'node:fs/promises'
    const img = await loadImage(process.argv[1])
    const canvas = createCanvas(img.width, img.height)
    canvas.getContext('2d').drawImage(img, 0, 0)
    await writeFile(process.argv[2], canvas.toBuffer('image/webp', 90))
  " "$1" "$2"
}

if [ $# -ge 1 ]; then encode "$1" before.webp; fi
if [ $# -ge 2 ]; then encode "$2" before.fr.webp; fi

for lang in "" ".fr"; do
  echo "→ hero$lang.webp"
  node "$CLI" "before$lang.webp" \
    --frame browser --ratio 16:9 --scale 2 --format webp \
    --url screenmat.vercel.app --seed 1 \
    -o "hero$lang.webp"

  echo "→ annotated$lang.webp"
  node "$CLI" --spec "annotated$lang.json" -o "annotated$lang.webp"
done

ls -la before*.webp hero*.webp annotated*.webp
