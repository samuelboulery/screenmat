#!/usr/bin/env bash
#
# Regenerates the two README visuals from the raw capture.
#
# `before.webp` is the raw capture, and it is the ONE step this script cannot
# do: it is screenmat's own edit screen, taken by hand. To refresh it — after a
# redesign, a rename, a new panel:
#
#   1. `pnpm dev`, open the app, load any screenshot (paste or drop).
#   2. Capture the window.
#   3. Re-encode it here:  ./regenerate.sh path/to/capture.png
#
# Called with no argument, the script reuses the `before.webp` already on disk
# and only re-renders the two derived images.
#
# The layer coordinates in `annotated.json` are fractions of the WINDOW WIDTH
# with the origin at the window's top-left — not the canvas, and `y` is divided
# by the width too. A new capture of a different size needs them recomputed:
# `pnpm cli inspect docs/assets/before.webp --json` gives the frame, and
# `public/docs/coordinates.md` gives the three rules.

set -euo pipefail
cd "$(dirname "$0")"

CLI="../../cli/main.ts"

# Un `input` de scène se résout depuis le répertoire courant, pas depuis le
# fichier de scène : d'où le `cd` ci-dessus, qui garde `annotated.json` portable.

if [ $# -ge 1 ]; then
  echo "→ before.webp — re-encoding $1"
  node --input-type=module -e "
    import { createCanvas, loadImage } from '@napi-rs/canvas'
    import { writeFile } from 'node:fs/promises'
    const img = await loadImage(process.argv[1])
    const canvas = createCanvas(img.width, img.height)
    canvas.getContext('2d').drawImage(img, 0, 0)
    await writeFile('before.webp', canvas.toBuffer('image/webp', 90))
  " "$1"
fi

echo "→ hero.webp"
node "$CLI" before.webp \
  --frame browser --ratio 16:9 --scale 2 --format webp \
  --url screenmat.vercel.app --seed 1 \
  -o hero.webp

echo "→ annotated.webp"
node "$CLI" --spec annotated.json -o annotated.webp

ls -la before.webp hero.webp annotated.webp
