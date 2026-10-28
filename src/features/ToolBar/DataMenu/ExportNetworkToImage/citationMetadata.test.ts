// @vitest-environment node
// The PDF writer cytoscape-pdf-export uses, so the test reads real output.
// @ts-expect-error no type declarations for pdfkit
import PDFDocument from 'pdfkit'
import { describe, expect, it } from 'vitest'

import {
  addPdfCitation,
  addPngCitation,
  addSvgCitation,
  citationNote,
  CREATOR,
} from './citationMetadata'

// A 1×1 transparent PNG.
const PNG_1X1 = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
)

interface PngChunk {
  type: string
  data: string
  crcValid: boolean
}

/** Reads every chunk and checks its CRC with zlib's implementation. */
const readPngChunks = async (png: Uint8Array): Promise<PngChunk[]> => {
  const { crc32 } = await import('node:zlib')
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const chunks: PngChunk[] = []
  let offset = 8
  while (offset < png.length) {
    const length = view.getUint32(offset)
    const typeAndData = png.subarray(offset + 4, offset + 8 + length)
    const crc = view.getUint32(offset + 8 + length)
    chunks.push({
      type: Buffer.from(typeAndData.subarray(0, 4)).toString('latin1'),
      data: Buffer.from(typeAndData.subarray(4)).toString('latin1'),
      crcValid: crc32(typeAndData) === crc,
    })
    offset += 12 + length
  }
  return chunks
}

const renderPdf = (): Promise<Uint8Array<ArrayBuffer>> =>
  new Promise((resolve) => {
    const doc = new PDFDocument()
    const parts: Buffer[] = []
    doc.on('data', (part: Buffer) => parts.push(part))
    doc.on('end', () => resolve(Uint8Array.from(Buffer.concat(parts))))
    doc.text('network')
    doc.end()
  })

describe('citationMetadata', () => {
  it('adds Software and Comment text chunks right after IHDR', async () => {
    const chunks = await readPngChunks(addPngCitation(PNG_1X1))

    expect(chunks.map((chunk) => chunk.type)).toEqual([
      'IHDR',
      'tEXt',
      'tEXt',
      'IDAT',
      'IEND',
    ])
    expect(chunks.every((chunk) => chunk.crcValid)).toBe(true)
    expect(chunks[1].data).toBe(`Software\0${CREATOR}`)
    expect(chunks[2].data).toBe(`Comment\0${citationNote()}`)
  })

  it('returns bytes that are not a PNG unchanged', () => {
    const notPng = Uint8Array.from([1, 2, 3])
    expect(addPngCitation(notPng)).toBe(notPng)
  })

  it('adds a metadata element as the first child of the svg root', () => {
    const svg =
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1"><rect/></svg>'

    const result = addSvgCitation(svg)

    expect(result).toMatch(
      /^<\?xml version="1.0"\?><svg [^>]*><metadata>Created with Cytoscape Web\. Please cite:/,
    )
    expect(result).toContain('</metadata><rect/></svg>')
    expect(result).not.toMatch(/<metadata>[^<]*[<>][^<]*<\/metadata>/)
  })

  it('appends an incremental update whose trailer points Info at the citation', async () => {
    const original = await renderPdf()
    const originalText = Buffer.from(original).toString('latin1')
    const oldSize = Number(/\/Size (\d+)/.exec(originalText)?.[1])
    const oldStartxref = /startxref\n(\d+)/.exec(originalText)?.[1]

    const updated = addPdfCitation(original)
    const text = Buffer.from(updated).toString('latin1')

    // The original file is a byte-for-byte prefix.
    expect(Buffer.from(updated.subarray(0, original.length))).toEqual(
      Buffer.from(original),
    )
    const update = text.slice(original.length)
    expect(update).toContain(`/Size ${oldSize + 1}`)
    expect(update).toContain(`/Info ${oldSize} 0 R`)
    expect(update).toContain(`/Prev ${oldStartxref}`)
    expect(update).toContain('/Creator (Cytoscape Web')
    expect(update).toContain('/Subject (Created with Cytoscape Web.')

    // The new xref entry and startxref point at the bytes they name.
    const entry = /xref\n\d+ 1\n(\d{10}) 00000 n/.exec(update)
    expect(text.startsWith(`${oldSize} 0 obj`, Number(entry?.[1]))).toBe(true)
    const newStartxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(text)?.[1])
    expect(text.startsWith('xref', newStartxref)).toBe(true)
  })

  it('returns a PDF without a trailer unchanged', () => {
    const pdf = Uint8Array.from(Buffer.from('%PDF-1.7\n'))
    expect(addPdfCitation(pdf)).toBe(pdf)
  })
})
