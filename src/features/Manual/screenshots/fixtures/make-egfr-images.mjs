// Writes egfr-images.cx2, the network of the manual's "node-images" step
// sequence: the EGFR to ERK chain, with an `image` node column of SVG icons
// as base64 `data:` URIs, so the capture loads no image from another site.
//
//     node src/features/Manual/screenshots/fixtures/make-egfr-images.mjs

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** A 64×64 icon: a colored disc with a white glyph. */
const icon = (color, glyph) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
  `<circle cx="32" cy="32" r="31" fill="${color}"/>` +
  `<g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
  `</svg>`

const GLYPHS = {
  // A small diamond: the signal.
  ligand: icon(
    '#d97706',
    '<path d="M32 16 L46 32 L32 48 L18 32 Z" fill="#fff"/>',
  ),
  // A Y: a receptor in the membrane.
  receptor: icon(
    '#2563eb',
    '<path d="M32 50 V32 M32 32 L20 16 M32 32 L44 16"/>',
  ),
  // Two linked rings: an adaptor joins two proteins.
  adaptor: icon(
    '#0d9488',
    '<circle cx="23" cy="32" r="8"/><circle cx="41" cy="32" r="8"/>',
  ),
  // An exchange arrow: a GEF swaps GDP for GTP.
  gef: icon('#7c3aed', '<path d="M18 26 H44 L38 20 M46 38 H20 L26 44"/>'),
  // A hexagon: the GTPase switch.
  gtpase: icon('#db2777', '<path d="M32 16 L46 24 V40 L32 48 L18 40 V24 Z"/>'),
  // A lightning bolt: a kinase passes the signal on.
  kinase: icon(
    '#dc2626',
    '<path d="M36 14 L22 34 H32 L28 50 L42 30 H32 Z" fill="#fff"/>',
  ),
  // Three bars: a transcription factor on DNA.
  tf: icon('#4b5563', '<path d="M18 22 H46 M18 32 H46 M18 42 H46"/>'),
}

const dataUri = (svg) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

const NODES = [
  ['EGF', 'ligand'],
  ['EGFR', 'receptor'],
  ['GRB2', 'adaptor'],
  ['SOS1', 'gef'],
  ['KRAS', 'gtpase'],
  ['RAF1', 'kinase'],
  ['MAP2K1', 'kinase'],
  ['MAPK1', 'kinase'],
  ['ELK1', 'tf'],
]

const TYPE_NAMES = {
  ligand: 'ligand',
  receptor: 'receptor',
  adaptor: 'adaptor',
  gef: 'exchange factor',
  gtpase: 'GTPase',
  kinase: 'kinase',
  tf: 'transcription factor',
}

// Three rows, the chain snaking left to right, then back: the view fits it
// with room to spare.
const nodes = NODES.map(([name, type], id) => ({
  id,
  x: (Math.floor(id / 3) % 2 === 0 ? id % 3 : 2 - (id % 3)) * 300,
  y: Math.floor(id / 3) * 150,
  v: { name, type: TYPE_NAMES[type], image: dataUri(GLYPHS[type]) },
}))
const edges = NODES.slice(1).map((_, i) => ({
  id: i,
  s: i,
  t: i + 1,
  v: { interaction: 'activates' },
}))

const cx2 = [
  { CXVersion: '2.0', hasFragments: false },
  {
    metaData: [
      { name: 'attributeDeclarations', elementCount: 1 },
      { name: 'networkAttributes', elementCount: 1 },
      { name: 'nodes', elementCount: nodes.length },
      { name: 'edges', elementCount: edges.length },
      { name: 'visualProperties', elementCount: 1 },
    ],
  },
  {
    attributeDeclarations: [
      {
        networkAttributes: { name: { d: 'string' } },
        nodes: {
          name: { d: 'string' },
          type: { d: 'string' },
          image: { d: 'string' },
        },
        edges: { interaction: { d: 'string' } },
      },
    ],
  },
  { networkAttributes: [{ name: 'EGFR to ERK' }] },
  { nodes },
  { edges },
  {
    visualProperties: [
      {
        default: {
          network: { NETWORK_BACKGROUND_COLOR: '#FFFFFF' },
          node: {
            NODE_WIDTH: 56,
            NODE_HEIGHT: 56,
            NODE_BACKGROUND_COLOR: '#E5E7EB',
            NODE_SHAPE: 'ellipse',
            NODE_BORDER_WIDTH: 0,
            NODE_LABEL_FONT_SIZE: 14,
            NODE_LABEL_POSITION: {
              HORIZONTAL_ALIGN: 'center',
              VERTICAL_ALIGN: 'bottom',
              HORIZONTAL_ANCHOR: 'center',
              VERTICAL_ANCHOR: 'top',
              MARGIN_X: 0,
              MARGIN_Y: 4,
              JUSTIFICATION: 'center',
            },
          },
          edge: {},
        },
        nodeMapping: {
          NODE_LABEL: {
            type: 'PASSTHROUGH',
            definition: { attribute: 'name', type: 'string' },
          },
        },
        edgeMapping: {},
      },
    ],
  },
  { status: [{ error: '', success: true }] },
]

const out = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'egfr-images.cx2',
)
writeFileSync(out, `${JSON.stringify(cx2)}\n`)
