import { describe, expect, it } from 'vitest'
import { ditherPixels } from '../dither.ts'

const INK: [number, number, number] = [17, 17, 17]
const PAPER: [number, number, number] = [243, 242, 238]

const flat = (value: number, size = 4) => {
  const data = new Uint8ClampedArray(size * size * 4)
  for (let i = 0; i < data.length; i += 4) data.set([value, value, value, 255], i)
  return data
}
const count = (data: Uint8ClampedArray, color: readonly number[]) => {
  let n = 0
  for (let i = 0; i < data.length; i += 4) if (data[i] === color[0]) n += 1
  return n
}

describe('trame Bayer', () => {
  it('rend le blanc en papier et le noir en encre, sans demi-teinte', () => {
    expect(count(ditherPixels(flat(255), 4, 4, PAPER, INK), PAPER)).toBe(16)
    expect(count(ditherPixels(flat(0), 4, 4, PAPER, INK), INK)).toBe(16)
  })

  it('allume une part des points qui suit la luminance', () => {
    const light = count(ditherPixels(flat(200), 4, 4, PAPER, INK), PAPER)
    const dark = count(ditherPixels(flat(60), 4, 4, PAPER, INK), PAPER)
    expect(light).toBeGreaterThan(dark)
    expect(dark).toBeGreaterThan(0)
  })
})
