/**
 * Writes the Cytoscape Web citation into an exported image's own metadata, so
 * the reference travels with the file into a manuscript draft (#883).
 *
 * Each function returns the file unchanged when it does not have the shape the
 * writer expects: a figure without metadata beats a failed export.
 */
import { citationsAsText } from '../../HelpMenu/citations'

export const CREATOR = 'Cytoscape Web (https://web.cytoscape.org)'

/** The text every format stores: who made the file and what to cite. */
export const citationNote = (): string =>
  `Created with Cytoscape Web. Please cite:\n\n${citationsAsText()}`

// --- PNG -------------------------------------------------------------------

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

let crcTable: Uint32Array | undefined

const crc32 = (bytes: Uint8Array): number => {
  if (crcTable === undefined) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** tEXt holds Latin-1; anything outside it becomes '?'. */
const latin1 = (text: string): Uint8Array =>
  Uint8Array.from(text, (ch) => {
    const code = ch.charCodeAt(0)
    return code < 256 ? code : 0x3f
  })

const textChunk = (keyword: string, text: string): Uint8Array => {
  const data = new Uint8Array([...latin1(keyword), 0, ...latin1(text)])
  const typeAndData = new Uint8Array([...latin1('tEXt'), ...data])
  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length)
  chunk.set(typeAndData, 4)
  view.setUint32(8 + data.length, crc32(typeAndData))
  return chunk
}

/**
 * Inserts `Software` and `Comment` tEXt chunks right after IHDR, which the
 * PNG spec requires to come first.
 */
export const addPngCitation = (
  png: Uint8Array<ArrayBuffer>,
): Uint8Array<ArrayBuffer> => {
  const isPng = PNG_SIGNATURE.every((byte, i) => png[i] === byte)
  if (!isPng || png.length < 33) {
    return png
  }
  // Signature (8) + IHDR length (4) + type (4) + data (13) + CRC (4).
  const afterIhdr = 33
  const chunks = [
    textChunk('Software', CREATOR),
    textChunk('Comment', citationNote()),
  ]
  const added = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(png.length + added)
  out.set(png.subarray(0, afterIhdr), 0)
  let offset = afterIhdr
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  out.set(png.subarray(afterIhdr), offset)
  return out
}

// --- SVG -------------------------------------------------------------------

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Inserts a `<metadata>` element as the root `<svg>` element's first child. */
export const addSvgCitation = (svg: string): string => {
  const rootTag = /<svg\b[^>]*>/.exec(svg)
  if (rootTag === null) {
    return svg
  }
  const end = rootTag.index + rootTag[0].length
  const metadata = `<metadata>${escapeXml(citationNote())}</metadata>`
  return svg.slice(0, end) + metadata + svg.slice(end)
}

// --- PDF -------------------------------------------------------------------

const pdfString = (text: string): string =>
  `(${text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\n/g, '\\n')})`

/**
 * Appends an incremental update whose trailer points `/Info` at a new
 * document information dictionary (PDF 1.7, §7.5.6). The original bytes stay
 * as they are, so the update cannot damage the page content.
 *
 * Expects a classic xref table and trailer, which pdfkit writes.
 */
export const addPdfCitation = (
  pdf: Uint8Array<ArrayBuffer>,
): Uint8Array<ArrayBuffer> => {
  const source = new TextDecoder('latin1').decode(pdf)
  const trailerAt = source.lastIndexOf('trailer')
  const startxref = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(source)
  if (trailerAt === -1 || startxref === null) {
    return pdf
  }
  const trailer = source.slice(trailerAt, startxref.index)
  const size = /\/Size\s+(\d+)/.exec(trailer)
  const root = /\/Root\s+(\d+\s+\d+\s+R)/.exec(trailer)
  if (size === null || root === null) {
    return pdf
  }
  const id = /\/ID\s*(\[[^\]]*\])/.exec(trailer)

  const objectNumber = Number(size[1])
  const head = source.endsWith('\n') ? '' : '\n'
  const object =
    `${objectNumber} 0 obj\n` +
    `<<\n/Creator ${pdfString(CREATOR)}\n` +
    `/Subject ${pdfString(citationNote())}\n>>\nendobj\n`
  const objectOffset = pdf.length + head.length
  const xrefOffset = objectOffset + object.length
  const update =
    head +
    object +
    `xref\n${objectNumber} 1\n` +
    `${String(objectOffset).padStart(10, '0')} 00000 n \n` +
    `trailer\n<<\n/Size ${objectNumber + 1}\n/Root ${root[1]}\n` +
    `/Info ${objectNumber} 0 R\n` +
    (id === null ? '' : `/ID ${id[1]}\n`) +
    `/Prev ${startxref[1]}\n>>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`

  const out = new Uint8Array(pdf.length + update.length)
  out.set(pdf, 0)
  out.set(latin1(update), pdf.length)
  return out
}
