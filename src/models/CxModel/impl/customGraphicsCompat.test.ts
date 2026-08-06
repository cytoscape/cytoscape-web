import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

import {
  hasDataUriCustomGraphics,
  hasImageCustomGraphics,
} from './customGraphicsCompat'

const svgDataUri = 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E'
const imageCg = (url: string) => ({
  type: 'image',
  name: 'org.cytoscape.ding.customgraphics.bitmap.URLImageCustomGraphics',
  properties: { url },
})

describe('hasDataUriCustomGraphics', () => {
  it('returns false when there are no custom graphics', () => {
    const cx = [{ CXVersion: '2.0' }, { nodes: [{ id: 0, v: { name: 'a' } }] }]
    expect(hasDataUriCustomGraphics(cx as any)).toBe(false)
  })

  it('returns false for hosted-URL custom graphics', () => {
    const cx = [
      {
        visualProperties: [
          {
            default: {
              node: { NODE_CUSTOMGRAPHICS_1: imageCg('https://x/y.png') },
            },
          },
        ],
      },
    ]
    expect(hasDataUriCustomGraphics(cx as any)).toBe(false)
  })

  it('detects a data: URI in a default custom graphic', () => {
    const cx = [
      {
        visualProperties: [
          { default: { node: { NODE_CUSTOMGRAPHICS_1: imageCg(svgDataUri) } } },
        ],
      },
    ]
    expect(hasDataUriCustomGraphics(cx as any)).toBe(true)
  })

  it('detects a data: URI in a node bypass', () => {
    const cx = [
      {
        nodeBypasses: [
          { id: 7, v: { NODE_CUSTOMGRAPHICS_1: imageCg(svgDataUri) } },
        ],
      },
    ]
    expect(hasDataUriCustomGraphics(cx as any)).toBe(true)
  })

  it('detects inline data in a column feeding a custom-graphics passthrough', () => {
    const cx = [
      {
        visualProperties: [
          {
            nodeMapping: {
              NODE_CUSTOMGRAPHICS_1: {
                type: 'PASSTHROUGH',
                definition: { attribute: 'svg' },
              },
            },
          },
        ],
      },
      {
        nodes: [
          { id: 0, v: { name: 'a', svg: svgDataUri } },
          { id: 1, v: { name: 'b' } },
        ],
      },
    ]
    expect(hasDataUriCustomGraphics(cx as any)).toBe(true)
  })

  it('detects inline data declared as a passthrough column default', () => {
    // A CX2 column default applies to every node that omits the value, so a
    // data URI declared here is as real as one repeated on each node.
    const cx = [
      {
        attributeDeclarations: [
          { nodes: { svg: { d: 'string', v: svgDataUri } } },
        ],
      },
      {
        visualProperties: [
          {
            nodeMapping: {
              NODE_CUSTOMGRAPHICS_1: {
                type: 'PASSTHROUGH',
                definition: { attribute: 'svg' },
              },
            },
          },
        ],
      },
      { nodes: [{ id: 0, v: { name: 'a' } }] },
    ]
    expect(hasDataUriCustomGraphics(cx as any)).toBe(true)
  })

  it('ignores data: values in columns NOT used by a custom-graphics passthrough', () => {
    const cx = [
      { visualProperties: [{ nodeMapping: {} }] },
      { nodes: [{ id: 0, v: { unrelated: svgDataUri } }] },
    ]
    expect(hasDataUriCustomGraphics(cx as any)).toBe(false)
  })

  it('does not confuse SIZE/POSITION keys for image value slots', () => {
    const cx = [
      {
        visualProperties: [
          { default: { node: { NODE_CUSTOMGRAPHICS_SIZE_1: '50.0' } } },
        ],
      },
    ]
    expect(hasDataUriCustomGraphics(cx as any)).toBe(false)
  })
})

describe('hasImageCustomGraphics', () => {
  it('detects a hosted-URL image (which data-URI detection would miss)', () => {
    const cx = [
      {
        visualProperties: [
          {
            default: {
              node: { NODE_CUSTOMGRAPHICS_1: imageCg('https://x/y.png') },
            },
          },
        ],
      },
    ]
    expect(hasDataUriCustomGraphics(cx as any)).toBe(false)
    expect(hasImageCustomGraphics(cx as any)).toBe(true)
  })

  it('detects hosted image refs in a passthrough column', () => {
    const cx = [
      {
        visualProperties: [
          {
            nodeMapping: {
              NODE_CUSTOMGRAPHICS_1: {
                type: 'PASSTHROUGH',
                definition: { attribute: 'img' },
              },
            },
          },
        ],
      },
      { nodes: [{ id: 0, v: { img: 'https://x/y.svg' } }] },
    ]
    expect(hasImageCustomGraphics(cx as any)).toBe(true)
  })

  it('does NOT flag pie/ring charts (Desktop renders those)', () => {
    const chartCg = {
      type: 'chart',
      name: 'org.cytoscape.PieChart',
      properties: { cy_dataColumns: ['a'], cy_colors: ['#f00'] },
    }
    const cx = [
      {
        visualProperties: [
          { default: { node: { NODE_CUSTOMGRAPHICS_1: chartCg } } },
        ],
      },
    ]
    expect(hasImageCustomGraphics(cx as any)).toBe(false)
  })
})

/**
 * The cases above are hand-built CX2. These run the detector against the real
 * fixtures, which are shaped by the actual exporter — the thing the four export
 * hooks feed it in production.
 */
describe('hasImageCustomGraphics against real CX2 fixtures', () => {
  const loadFixture = (name: string): any =>
    JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../../../test/fixtures/cx2/valid', name),
        'utf8',
      ),
    )

  it('flags an image custom graphic in a default node visual property', () => {
    expect(hasImageCustomGraphics(loadFixture('images.valid.cx2'))).toBe(true)
  })

  // This fixture's images are `file:` URLs — Desktop cannot fetch those either,
  // so they must be flagged, but they are not data URIs. That gap is precisely
  // why the narrow hasDataUriCustomGraphics() is not sufficient on its own and
  // hasImageCustomGraphics() exists.
  it('flags file: URL images that the data-URI detector misses', () => {
    const cx = loadFixture('images.valid.cx2')
    expect(hasImageCustomGraphics(cx)).toBe(true)
    expect(hasDataUriCustomGraphics(cx)).toBe(false)
  })

  // This fixture drives NODE_CUSTOMGRAPHICS_1 from a `svg` column whose data URI
  // lives in the column's attributeDeclarations default rather than on each
  // node, so both detectors must look there.
  it('flags a data URI declared as a passthrough column default', () => {
    const cx = loadFixture('svg-passthrough.valid.cx2')
    expect(hasImageCustomGraphics(cx)).toBe(true)
    expect(hasDataUriCustomGraphics(cx)).toBe(true)
  })

  it('finds a lone image slot among many chart slots', () => {
    // gal-filtered-chart has charts in slots 1-7 and 9 and an image in slot 8;
    // the detector must not stop at the first chart it sees.
    expect(
      hasImageCustomGraphics(loadFixture('gal-filtered-chart.valid.cx2')),
    ).toBe(true)
  })
})
