/**
 * La capture brute de la landing : un tableau de bord clair, dessiné une fois
 * ici et écrit dans `public/landing/demo.webp`. La landing la charge comme
 * n'importe quelle capture collée — le moteur ne sait pas que c'est une démo.
 *
 *   node docs/assets/landing-demo.ts
 */
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const font = path.join(root, 'public/fonts/space-grotesk-latin.woff2')
if (!GlobalFonts.registerFromPath(font, 'Space Grotesk')) throw new Error(`Font not found: ${font}`)

const W = 1440
const H = 900
const canvas = createCanvas(W, H)
const g = canvas.getContext('2d')

function rect(x: number, y: number, w: number, h: number, color: string, r = 0) {
  g.fillStyle = color
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.fill()
}

function outline(x: number, y: number, w: number, h: number, color: string, r: number) {
  g.strokeStyle = color
  g.lineWidth = 2
  g.beginPath()
  g.roundRect(x + 1, y + 1, w - 2, h - 2, r)
  g.stroke()
}

function text(ctx: SKRSContext2D, value: string, x: number, y: number, style: string, color: string) {
  ctx.font = `${style} "Space Grotesk"`
  ctx.fillStyle = color
  ctx.fillText(value, x, y)
}

function chrome() {
  rect(0, 0, W, H, '#F6F7FA')
  rect(0, 0, 260, H, '#EDEFF4')
  rect(259, 0, 2, H, '#E1E4EA')
  rect(260, 0, 1180, 100, '#FFFFFF')
  rect(260, 99, 1180, 2, '#E6E8EE')
  rect(56, 52, 130, 26, '#3B6CF6', 6)
  ;[160, 232, 304, 376, 448].forEach((y, i) => rect(56, y, i === 1 ? 160 : 130, 20, i === 1 ? '#C9D5FA' : '#D5D9E2', 5))
  rect(316, 34, 290, 34, '#DADDE5', 8)
  rect(1224, 26, 160, 48, '#3B6CF6', 10)
  text(g, 'Export', 1268, 57, '600 20px', '#FFFFFF')
}

function cards() {
  const items = [
    ['Revenue', '$84,210', '#22A565', '+18%'],
    ['Churn', '2.4%', '#E5484D', '−0.3'],
    ['Active users', '12,874', '#22A565', '+6%'],
  ] as const
  items.forEach(([label, value, color, delta], i) => {
    const x = 316 + i * 368
    rect(x, 144, 340, 152, '#FFFFFF', 12)
    outline(x, 144, 340, 152, '#E6E8EE', 12)
    text(g, label, x + 28, 190, '500 20px', '#6B7080')
    text(g, value, x + 28, 256, '700 40px', '#1F2330')
    rect(x + 236, 222, 78, 34, `${color}22`, 17)
    text(g, delta, x + 252, 246, '600 18px', color)
  })
}

function chart() {
  rect(316, 332, 1076, 306, '#FFFFFF', 12)
  outline(316, 332, 1076, 306, '#E6E8EE', 12)
  text(g, 'Monthly revenue', 344, 372, '600 20px', '#1F2330')
  ;[30, 44, 38, 52, 60, 48, 66, 58, 72, 64, 80, 70, 88, 78].forEach((h, i) =>
    rect(344 + i * 74, 612 - h * 2.3, 46, h * 2.3, i === 12 ? '#F59E0B' : '#3B6CF6', 4),
  )
}

function customers() {
  const rows = [
    ['Acme Studio', 'alex@acme.io', 'Paid', '#DCF5E7', '#15803D'],
    ['Northwind', 'sam@northwind.io', 'Pending', '#FDE7C8', '#8A4B00'],
    ['Globex', 'kim@globex.com', 'Paid', '#DCF5E7', '#15803D'],
  ] as const
  rows.forEach(([name, mail, status, bg, ink], i) => {
    const y = 668 + i * 74
    rect(316, y, 1076, 60, '#FFFFFF', 8)
    outline(316, y, 1076, 60, '#EDEFF3', 8)
    text(g, name, 344, y + 37, '500 20px', '#1F2330')
    text(g, mail, 700, y + 37, '500 20px', '#6B7080')
    rect(1250, y + 16, 110, 28, bg, 14)
    text(g, status, 1276, y + 36, '600 16px', ink)
  })
}

chrome()
cards()
chart()
customers()

const out = path.join(root, 'public/landing/demo.webp')
await mkdir(path.dirname(out), { recursive: true })
await writeFile(out, canvas.toBuffer('image/webp', 90))
console.log(`→ ${path.relative(root, out)}`)
