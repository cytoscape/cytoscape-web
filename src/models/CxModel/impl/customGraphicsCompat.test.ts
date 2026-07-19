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
          { default: { node: { NODE_CUSTOMGRAPHICS_1: imageCg('https://x/y.png') } } },
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
      { nodeBypasses: [{ id: 7, v: { NODE_CUSTOMGRAPHICS_1: imageCg(svgDataUri) } }] },
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
          { default: { node: { NODE_CUSTOMGRAPHICS_1: imageCg('https://x/y.png') } } },
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
