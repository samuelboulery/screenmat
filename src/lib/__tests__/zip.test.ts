import { describe, expect, it } from 'vitest'
import { crc32, makeZip } from '../zip.ts'

const bytes = (text: string) => new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>

describe('crc32', () => {
  it('donne les valeurs de référence de la spec zip', () => {
    expect(crc32(bytes(''))).toBe(0)
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926)
    expect(crc32(bytes('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339)
  })
})

describe('makeZip', () => {
  it('produit une archive avec les bonnes signatures et le bon compte', async () => {
    const zip = makeZip(
      [
        { name: 'a.txt', data: bytes('hello') },
        { name: 'b.txt', data: bytes('world!') },
      ],
      new Date(2026, 0, 2, 3, 4, 5),
    )
    const view = new DataView(await zip.arrayBuffer())

    // En-tête local du premier fichier.
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    // Méthode « stored » : aucune compression.
    expect(view.getUint16(8, true)).toBe(0)
    expect(view.getUint32(18, true)).toBe(5) // taille compressée = taille brute
    expect(view.getUint32(22, true)).toBe(5)

    // Fin de l'annuaire central, 22 octets, en queue d'archive.
    const end = view.byteLength - 22
    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 8, true)).toBe(2)
    expect(view.getUint16(end + 10, true)).toBe(2)
  })

  it('reste lisible avec zéro entrée', async () => {
    const zip = makeZip([], new Date(2026, 0, 2))
    const view = new DataView(await zip.arrayBuffer())
    expect(view.byteLength).toBe(22)
    expect(view.getUint32(0, true)).toBe(0x06054b50)
    expect(view.getUint16(8, true)).toBe(0)
  })
})
