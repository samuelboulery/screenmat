/**
 * Zip minimal, méthode « stored » (aucune compression). Les PNG et les WebP sont
 * déjà compressés : deflater une deuxième fois coûterait du CPU pour ~1 % de
 * gain, et nous éviterait d'installer une dépendance — ce qui est justement la
 * règle du projet.
 *
 * ponytail: pas de Zip64, donc plafond à 4 Gio et 65 535 fichiers. Un batch
 * réaliste tient à trois ordres de grandeur en dessous ; passer à Zip64 le jour
 * où ce n'est plus vrai.
 */

export type ZipEntry = { name: string; data: Uint8Array<ArrayBuffer> }

const CRC_TABLE = buildCrcTable()

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
}

export function crc32(data: Uint8Array<ArrayBufferLike>): number {
  let crc = 0xffffffff
  for (let index = 0; index < data.length; index += 1) {
    crc = CRC_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** Date MS-DOS (deux mots de 16 bits) — le format zip ne connaît que celle-là. */
function dosDateTime(date: Date): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

/** Assemble les entrées en une archive zip. Synchrone : tout est déjà en mémoire. */
export function makeZip(entries: readonly ZipEntry[], now = new Date()): Blob {
  const encoder = new TextEncoder()
  const { time, date } = dosDateTime(now)

  const locals: Array<Uint8Array<ArrayBuffer>> = []
  const centrals: Array<Uint8Array<ArrayBuffer>> = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)

    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true) // version minimale
    localView.setUint16(6, 0x0800, true) // noms de fichiers en UTF-8
    localView.setUint16(8, 0, true) // méthode : stored
    localView.setUint16(10, time, true)
    localView.setUint16(12, date, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, entry.data.length, true)
    localView.setUint32(22, entry.data.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, time, true)
    centralView.setUint16(14, date, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, entry.data.length, true)
    centralView.setUint32(24, entry.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)

    locals.push(local, entry.data)
    centrals.push(central)
    offset += local.length + entry.data.length
  }

  const centralSize = centrals.reduce((total, part) => total + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)

  return new Blob([...locals, ...centrals, end], { type: 'application/zip' })
}
