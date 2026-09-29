/* Les quatre équerres du logo, en DOM au-dessus du canvas : elles partent des
   coins de la fenêtre, se referment sur la capture brute, puis s'écartent sur
   le cadre fini. Elles ne sont jamais dans le rendu — seulement autour. */

export type Box = { x: number; y: number; w: number; h: number }

const SIZE = 28
/** Même tracé que la favicon, à l'échelle d'une équerre. */
const PATH = 'M2 26V2h24'
const FLIP = ['', 'scaleX(-1)', 'scale(-1,-1)', 'scaleY(-1)']

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export function createMarks(host: HTMLElement): HTMLElement[] {
  return FLIP.map((flip) => {
    const mark = document.createElement('div')
    mark.className = 'mark'
    mark.innerHTML = `<svg viewBox="0 0 28 28" style="transform:${flip}" aria-hidden="true"><path d="${PATH}" /></svg>`
    host.append(mark)
    return mark
  })
}

function corners(box: Box, gap: number): [number, number][] {
  const right = box.x + box.w - SIZE + gap
  const bottom = box.y + box.h - SIZE + gap
  return [
    [box.x - gap, box.y - gap],
    [right, box.y - gap],
    [right, bottom],
    [box.x - gap, bottom],
  ]
}

/** Pose les équerres, animations en cours annulées : un rejeu ou un
 *  redimensionnement ne s'empile pas sur des translations périmées. */
function place(marks: HTMLElement[], box: Box, gap: number): void {
  for (const mark of marks) for (const animation of mark.getAnimations()) animation.cancel()
  corners(box, gap).forEach(([x, y], i) => {
    marks[i]!.style.opacity = '1'
    marks[i]!.style.left = `${x}px`
    marks[i]!.style.top = `${y}px`
  })
}

/** Des coins de la fenêtre jusqu'à `box`, en se verrouillant. */
export function flyIn(marks: HTMLElement[], box: Box): Promise<unknown> {
  place(marks, box, 8)
  const stage = marks[0]!.parentElement!.getBoundingClientRect()
  const from = [
    [16, 16],
    [innerWidth - 16 - SIZE, 16],
    [innerWidth - 16 - SIZE, innerHeight - 16 - SIZE],
    [16, innerHeight - 16 - SIZE],
  ]
  return Promise.all(
    marks.map((mark, i) => {
      const dx = from[i]![0]! - (stage.left + mark.offsetLeft)
      const dy = from[i]![1]! - (stage.top + mark.offsetTop)
      return mark.animate(
        [{ transform: `translate(${dx}px,${dy}px)`, opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'none', opacity: 1 }],
        { duration: reduced() ? 0 : 950, delay: reduced() ? 0 : i * 70, easing: 'cubic-bezier(.16,.9,.3,1.12)', fill: 'backwards' },
      // Annulée par un recalage : les équerres sont déjà à leur place, ce
      // n'est pas une erreur.
      ).finished.catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
      })
    }),
  )
}

/** Glisse les équerres vers `box` — le cadre fini. */
export function moveMarks(marks: HTMLElement[], box: Box, ms: number): void {
  const before = marks.map((mark) => [mark.offsetLeft, mark.offsetTop] as const)
  place(marks, box, 10)
  marks.forEach((mark, i) =>
    mark.animate(
      [{ transform: `translate(${before[i]![0] - mark.offsetLeft}px,${before[i]![1] - mark.offsetTop}px)`, opacity: 1 }, { transform: 'none', opacity: 1 }],
      { duration: reduced() ? 0 : ms, easing: 'cubic-bezier(.33,1,.68,1)' },
    ),
  )
}

/** Recale sans animer, après un redimensionnement. */
export function snapMarks(marks: HTMLElement[], box: Box, framed: boolean): void {
  place(marks, box, framed ? 10 : 8)
}
