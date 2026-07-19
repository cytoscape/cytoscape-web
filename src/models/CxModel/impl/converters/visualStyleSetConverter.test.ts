import { describe, expect, it } from 'vitest'

import { CyNetwork } from '../../../CyNetworkModel'
import NetworkFn, { Network } from '../../../NetworkModel'
import { createTable } from '../../../TableModel/impl/inMemoryTable'
import { createViewModel } from '../../../ViewModel/impl/viewModelImpl'
import VisualStyleFn, {
  DEFAULT_STYLE_NAME,
  VisualStyle,
  VisualStyleSet,
} from '../../../VisualStyleModel'
import {
  setBypass,
  setDefault,
} from '../../../VisualStyleModel/impl/visualStyleImpl'
import {
  cloneVisualStyle,
  createStyleSet,
} from '../../../VisualStyleModel/impl/visualStyleSetImpl'
import { Cx2 } from '../../Cx2'
import { createCyNetworkFromCx2 } from '../converter'
import { exportCyNetworkToCx2 } from '../exporter'
import {
  buildCyWebVisualStylesAspect,
  createVisualStyleSetFromCx,
  CY_WEB_VISUAL_STYLES_ASPECT_TAG,
  getCyWebVisualStylesAspect,
  MAX_STYLES_PER_NETWORK,
  styleSetNeedsCustomAspect,
} from './visualStyleSetConverter'

const NETWORK_ID = 'test-network'

/** A CyNetwork with two named styles: active "Main" + inactive "Publication". */
const buildMultiStyleCyNetwork = (): {
  cyNetwork: CyNetwork
  styleSet: VisualStyleSet
  activeStyle: VisualStyle
  publicationStyle: VisualStyle
} => {
  const network: Network = NetworkFn.createNetworkFromLists(
    NETWORK_ID,
    [{ id: '1' }, { id: '2' }],
    [{ id: 'e1', s: '1', t: '2' }],
  )
  const nodeTable = createTable(`${NETWORK_ID}-nodes`)
  const edgeTable = createTable(`${NETWORK_ID}-edges`)

  let activeStyle = VisualStyleFn.createVisualStyle()
  activeStyle = setDefault(activeStyle, 'nodeShape', 'ellipse')

  let publicationStyle = cloneVisualStyle(VisualStyleFn.createVisualStyle())
  publicationStyle = setDefault(publicationStyle, 'nodeShape', 'diamond')
  publicationStyle = setDefault(
    publicationStyle,
    'nodeBackgroundColor',
    '#123456',
  )
  publicationStyle = setBypass(
    publicationStyle,
    'nodeBackgroundColor',
    ['1'],
    '#FF0000',
  )
  publicationStyle = setBypass(publicationStyle, 'edgeWidth', ['e1'], 7)

  const styleSet: VisualStyleSet = {
    activeStyleId: 'style-main',
    styles: {
      'style-main': {
        id: 'style-main',
        name: 'Main',
        visualStyle: activeStyle,
      },
      'style-pub': {
        id: 'style-pub',
        name: 'Publication',
        visualStyle: publicationStyle,
      },
    },
  }

  const cyNetwork: CyNetwork = {
    network,
    nodeTable,
    edgeTable,
    visualStyle: activeStyle,
    visualStyleSet: styleSet,
    networkViews: [createViewModel(network)],
    networkAttributes: { id: NETWORK_ID, attributes: {} },
    undoRedoStack: { undoStack: [], redoStack: [] },
  }

  return { cyNetwork, styleSet, activeStyle, publicationStyle }
}

describe('styleSetNeedsCustomAspect', () => {
  it('should be false for a single style with the default name', () => {
    expect(
      styleSetNeedsCustomAspect(
        createStyleSet(VisualStyleFn.createVisualStyle()),
      ),
    ).toBe(false)
  })

  it('should be true for a renamed single style', () => {
    expect(
      styleSetNeedsCustomAspect(
        createStyleSet(VisualStyleFn.createVisualStyle(), 'My Style'),
      ),
    ).toBe(true)
  })

  it('should be true for multiple styles', () => {
    const { styleSet } = buildMultiStyleCyNetwork()
    expect(styleSetNeedsCustomAspect(styleSet)).toBe(true)
  })
})

describe('export', () => {
  it('should emit the cyWebVisualStyles aspect for a multi-style network', () => {
    const { cyNetwork } = buildMultiStyleCyNetwork()
    const cx2 = exportCyNetworkToCx2(cyNetwork)

    const aspect = getCyWebVisualStylesAspect(cx2 as Cx2) as any
    expect(aspect).toBeDefined()
    expect(aspect.activeStyleId).toBe('style-main')
    expect(aspect.styles).toHaveLength(2)
    const names = aspect.styles.map((s: any) => s.name).sort()
    expect(names).toEqual(['Main', 'Publication'])

    // The aspect must also be declared in metaData
    const metaData = (cx2 as any[]).find((e) => e.metaData)?.metaData
    expect(
      metaData.some((m: any) => m.name === CY_WEB_VISUAL_STYLES_ASPECT_TAG),
    ).toBe(true)
  })

  it('should NOT emit the aspect for a single default-named style', () => {
    const { cyNetwork } = buildMultiStyleCyNetwork()
    const singleSet = createStyleSet(cyNetwork.visualStyle)
    const cx2 = exportCyNetworkToCx2({
      ...cyNetwork,
      visualStyleSet: singleSet,
    })
    expect(getCyWebVisualStylesAspect(cx2 as Cx2)).toBeUndefined()
  })

  it('should NOT emit the aspect when the CyNetwork has no style set', () => {
    const { cyNetwork } = buildMultiStyleCyNetwork()
    const cx2 = exportCyNetworkToCx2({
      ...cyNetwork,
      visualStyleSet: undefined,
    })
    expect(getCyWebVisualStylesAspect(cx2 as Cx2)).toBeUndefined()
  })

  it('should drop a stale opaque copy when emitting a fresh aspect', () => {
    const { cyNetwork } = buildMultiStyleCyNetwork()
    const cx2 = exportCyNetworkToCx2({
      ...cyNetwork,
      otherAspects: [
        {
          [CY_WEB_VISUAL_STYLES_ASPECT_TAG]: [
            { activeStyleId: 'stale', styles: [] },
          ],
        },
      ],
    }) as any[]
    // Exactly one cyWebVisualStyles entry: the regenerated one
    const entries = cx2.filter(
      (e) => Object.keys(e)[0] === CY_WEB_VISUAL_STYLES_ASPECT_TAG,
    )
    expect(entries).toHaveLength(1)
    expect(entries[0][CY_WEB_VISUAL_STYLES_ASPECT_TAG][0].activeStyleId).toBe(
      'style-main',
    )
  })

  it('should pass an opaque copy through when NOT emitting a fresh aspect', () => {
    // A copy this version could not consume (e.g. from a newer version)
    // must survive the save untouched instead of being destroyed
    const staleAspect = { activeStyleId: 'stale', styles: [], version: '2.0' }
    const { cyNetwork } = buildMultiStyleCyNetwork()
    const cx2 = exportCyNetworkToCx2({
      ...cyNetwork,
      visualStyleSet: undefined,
      otherAspects: [{ [CY_WEB_VISUAL_STYLES_ASPECT_TAG]: [staleAspect] }],
    })
    expect(getCyWebVisualStylesAspect(cx2 as Cx2)).toEqual(staleAspect)
  })
})

describe('round trip (export → import)', () => {
  it('should preserve all named styles, ids, names, and the active pointer', () => {
    const { cyNetwork, publicationStyle } = buildMultiStyleCyNetwork()
    const cx2 = exportCyNetworkToCx2(cyNetwork) as Cx2

    const imported = createCyNetworkFromCx2(NETWORK_ID, cx2)
    const importedSet = imported.visualStyleSet
    expect(importedSet).toBeDefined()
    if (importedSet === undefined) return

    expect(importedSet.activeStyleId).toBe('style-main')
    expect(Object.keys(importedSet.styles).sort()).toEqual([
      'style-main',
      'style-pub',
    ])
    expect(importedSet.styles['style-pub'].name).toBe('Publication')

    // Inactive style content survives the round trip
    const importedPub = importedSet.styles['style-pub'].visualStyle
    expect(importedPub.nodeShape.defaultValue).toBe(
      publicationStyle.nodeShape.defaultValue,
    )
    expect(importedPub.nodeBackgroundColor.defaultValue).toBe('#123456')
    expect(importedPub.nodeBackgroundColor.bypassMap.get('1')).toBe('#FF0000')
    expect(importedPub.edgeWidth.bypassMap.get('e1')).toBe(7)

    // The active entry's content is exactly the style parsed from the
    // standard visualProperties aspect (standard aspects win)
    expect(importedSet.styles['style-main'].visualStyle).toBe(
      imported.visualStyle,
    )
    expect(imported.visualStyle.nodeShape.defaultValue).toBe('ellipse')

    // The consumed aspect must not linger in otherAspects
    expect(
      (imported.otherAspects ?? []).some(
        (aspect) => Object.keys(aspect)[0] === CY_WEB_VISUAL_STYLES_ASPECT_TAG,
      ),
    ).toBe(false)
  })

  it('should produce a single-style set when the aspect is absent', () => {
    const { cyNetwork } = buildMultiStyleCyNetwork()
    const cx2 = exportCyNetworkToCx2({
      ...cyNetwork,
      visualStyleSet: undefined,
    }) as Cx2

    const imported = createCyNetworkFromCx2(NETWORK_ID, cx2)
    const importedSet = imported.visualStyleSet
    expect(importedSet).toBeDefined()
    if (importedSet === undefined) return
    const entries = Object.values(importedSet.styles)
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe(DEFAULT_STYLE_NAME)
    expect(entries[0].visualStyle).toBe(imported.visualStyle)
  })
})

describe('createVisualStyleSetFromCx fallbacks (malformed external data)', () => {
  const activeStyle = VisualStyleFn.createVisualStyle()

  const expectFallback = (rawAspect: unknown): void => {
    const cx = [
      { [CY_WEB_VISUAL_STYLES_ASPECT_TAG]: [rawAspect] },
    ] as unknown as Cx2
    const styleSet = createVisualStyleSetFromCx(cx, activeStyle)
    const entries = Object.values(styleSet.styles)
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe(DEFAULT_STYLE_NAME)
    expect(entries[0].visualStyle).toBe(activeStyle)
    expect(styleSet.activeStyleId).toBe(entries[0].id)
  }

  it('should fall back when the aspect is not an object', () => {
    expectFallback('garbage')
  })

  it('should fall back when styles is empty', () => {
    expectFallback({ activeStyleId: 'a', styles: [] })
  })

  it('should fall back when activeStyleId does not resolve', () => {
    expectFallback({
      activeStyleId: 'missing',
      styles: [{ id: 'a', name: 'A', visualProperties: {} }],
    })
  })

  it('should fall back on duplicate style ids', () => {
    expectFallback({
      activeStyleId: 'a',
      styles: [
        { id: 'a', name: 'A', visualProperties: {} },
        { id: 'a', name: 'B', visualProperties: {} },
      ],
    })
  })

  it('should fall back when there are too many styles', () => {
    const styles = Array.from(
      { length: MAX_STYLES_PER_NETWORK + 1 },
      (_, i) => ({
        id: `style-${i}`,
        name: `Style ${i}`,
        visualProperties: {},
      }),
    )
    expectFallback({ activeStyleId: 'style-0', styles })
  })

  it('should fall back when a style is missing required fields', () => {
    expectFallback({
      activeStyleId: 'a',
      styles: [{ id: 'a' }],
    })
  })

  it('should fall back on an unsupported major version', () => {
    expectFallback({
      version: '2.0',
      activeStyleId: 'a',
      styles: [{ id: 'a', name: 'A', visualProperties: {} }],
    })
  })

  it('should accept 1.x versions and a missing version', () => {
    const okAspect = {
      version: '1.4',
      activeStyleId: 'a',
      styles: [{ id: 'a', name: 'A', visualProperties: {} }],
    }
    const cx = [
      { [CY_WEB_VISUAL_STYLES_ASPECT_TAG]: [okAspect] },
    ] as unknown as Cx2
    expect(
      Object.keys(createVisualStyleSetFromCx(cx, activeStyle).styles),
    ).toEqual(['a'])
  })

  it('should preserve an unusable aspect in otherAspects for round-trip', () => {
    // Full user scenario: a document whose aspect this version cannot
    // consume is imported and saved again — the aspect must survive.
    const { cyNetwork } = buildMultiStyleCyNetwork()
    const unusableAspect = {
      version: '2.0',
      activeStyleId: 'future',
      styles: [{ id: 'future', name: 'Future', visualProperties: {} }],
    }
    const cx2 = exportCyNetworkToCx2({
      ...cyNetwork,
      visualStyleSet: undefined,
      otherAspects: [{ [CY_WEB_VISUAL_STYLES_ASPECT_TAG]: [unusableAspect] }],
    }) as Cx2

    const imported = createCyNetworkFromCx2(NETWORK_ID, cx2)
    // Fallback single-style set in the app…
    expect(Object.values(imported.visualStyleSet?.styles ?? {})).toHaveLength(1)
    // …but the raw aspect is retained for opaque passthrough
    expect(
      (imported.otherAspects ?? []).some(
        (aspect) => Object.keys(aspect)[0] === CY_WEB_VISUAL_STYLES_ASPECT_TAG,
      ),
    ).toBe(true)

    // Re-export: the untouched aspect survives the save
    const reExported = exportCyNetworkToCx2(imported) as Cx2
    expect(getCyWebVisualStylesAspect(reExported)).toEqual(unusableAspect)
  })

  it('should use the default name for blank style names', () => {
    const cx = [
      {
        [CY_WEB_VISUAL_STYLES_ASPECT_TAG]: [
          {
            activeStyleId: 'a',
            styles: [{ id: 'a', name: '   ', visualProperties: {} }],
          },
        ],
      },
    ] as unknown as Cx2
    const styleSet = createVisualStyleSetFromCx(cx, activeStyle)
    expect(styleSet.styles['a'].name).toBe(DEFAULT_STYLE_NAME)
  })
})

describe('buildCyWebVisualStylesAspect', () => {
  it('should return undefined for a plain single-style set', () => {
    const nodeTable = createTable('n')
    const edgeTable = createTable('e')
    expect(
      buildCyWebVisualStylesAspect(
        createStyleSet(VisualStyleFn.createVisualStyle()),
        nodeTable,
        edgeTable,
      ),
    ).toBeUndefined()
  })

  it('should include every style with its bypasses', () => {
    const { styleSet, cyNetwork } = buildMultiStyleCyNetwork()
    const aspect = buildCyWebVisualStylesAspect(
      styleSet,
      cyNetwork.nodeTable,
      cyNetwork.edgeTable,
    )
    expect(aspect).toBeDefined()
    if (aspect === undefined) return
    const pub = aspect.styles.find((s) => s.id === 'style-pub') as any
    expect(pub.nodeBypasses).toHaveLength(1)
    expect(pub.nodeBypasses[0].id).toBe(1)
    expect(pub.edgeBypasses).toHaveLength(1)
    expect(pub.edgeBypasses[0].id).toBe(1)
  })
})
