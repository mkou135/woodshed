import { unzipSync, strFromU8 } from 'fflate'

/** Zip local-file-header magic number, "PK\x03\x04". */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]

function isZip(bytes: Uint8Array): boolean {
  return ZIP_MAGIC.every((b, i) => bytes[i] === b)
}

/**
 * Accepts either a raw .musicxml file or a zipped .mxl container and returns
 * the score XML as a string.
 */
export function readScoreXml(bytes: Uint8Array): string {
  if (!isZip(bytes)) return strFromU8(bytes)

  const entries = unzipSync(bytes)

  const container = entries['META-INF/container.xml']
  if (container) {
    const match = /full-path\s*=\s*"([^"]+)"/.exec(strFromU8(container))
    const target = match?.[1]
    if (target && entries[target]) return strFromU8(entries[target])
  }

  const fallback = Object.keys(entries).find(
    (name) => !name.startsWith('META-INF/') && /\.(xml|musicxml)$/i.test(name),
  )
  if (fallback) return strFromU8(entries[fallback])

  throw new Error('Archive contains no MusicXML score file')
}
