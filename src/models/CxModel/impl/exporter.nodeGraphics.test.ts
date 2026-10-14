// src/models/CxModel/impl/exporter.nodeGraphics.test.ts
//
// Guards the export contract for app-supplied node graphics: a render hook's
// images are renderer-only and must NEVER appear in exported CX2, while
// Vizmapper custom graphics must continue to export exactly as before.
//
// This is the regression test for the feature's hard constraint. If it fails,
// something wired NodeGraphicsStore into the export path — do not "fix" it by
// updating the expectation.

import { beforeEach, describe, expect, it } from 'vitest'

import { useNodeGraphicsStore } from '../../../data/hooks/stores/NodeGraphicsStore'
import { CyNetwork } from '../../CyNetworkModel'
import NetworkFn, { Network, NetworkAttributes } from '../../NetworkModel'
import type { ResolvedNodeGraphics } from '../../StoreModel/NodeGraphicsStoreModel'
import { createTable } from '../../TableModel/impl/inMemoryTable'
import { NetworkView } from '../../ViewModel'
import { createViewModel } from '../../ViewModel/impl/viewModelImpl'
import VisualStyleFn, { VisualStyle } from '../../VisualStyleModel'
import { getCustomGraphicsPropertyKeys } from '../../VisualStyleModel/impl/customGraphicsImpl'
import { setBypass } from '../../VisualStyleModel/impl/visualStyleImpl'
import { CustomGraphicsType } from '../../VisualStyleModel/VisualPropertyValue'
import { exportCyNetworkToCx2 } from './exporter'

/** Distinctive enough that a substring search over the whole export is sound. */
const SENTINEL_MARKER = 'CYWEB_HOOK_SENTINEL'
const SENTINEL_IMAGE = `https://example.com/${SENTINEL_MARKER}.png`

const hookImage = (image = SENTINEL_IMAGE): ResolvedNodeGraphics => ({
  image,
  fit: 'contain',
  opacity: 1,
  crossOrigin: 'null',
  containment: 'inside',
  hookId: 'sentinel-hook',
})

interface Fixture {
  cyNetwork: CyNetwork
  networkId: string
  visualStyle: VisualStyle
  networkView: NetworkView
}

const buildFixture = (networkId = 'net-node-graphics'): Fixture => {
  const network: Network = NetworkFn.createNetwork(networkId)
  NetworkFn.addNode(network, 'n1')
  NetworkFn.addNode(network, 'n2')

  const nodeTable = createTable(`${networkId}-nodes`)
  const edgeTable = createTable(`${networkId}-edges`)
  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
  const networkView: NetworkView = createViewModel(network)
  const networkAttributes: NetworkAttributes = { id: networkId, attributes: {} }

  return {
    networkId,
    visualStyle,
    networkView,
    cyNetwork: {
      network,
      nodeTable,
      edgeTable,
      visualStyle,
      networkViews: [networkView],
      networkAttributes,
      undoRedoStack: { undoStack: [], redoStack: [] },
    },
  }
}

const exportToJson = (cyNetwork: CyNetwork): string =>
  JSON.stringify(exportCyNetworkToCx2(cyNetwork))

describe('CX2 export and node-graphics render hooks', () => {
  beforeEach(() => {
    useNodeGraphicsStore.setState({
      hooks: [],
      images: {},
      refreshRequests: {},
    })
  })

  it('produces byte-identical CX2 with and without hook images', () => {
    const { cyNetwork, networkId } = buildFixture()

    const before = exportToJson(cyNetwork)

    useNodeGraphicsStore.getState().setHook({
      hookId: 'sentinel-hook',
      appId: 'sentinel-app',
      render: () => SENTINEL_IMAGE,
    })
    useNodeGraphicsStore.getState().setImages(networkId, [
      ['n1', hookImage()],
      ['n2', hookImage()],
    ])
    // Populated, so a leak would be visible.
    expect(
      Object.keys(useNodeGraphicsStore.getState().images[networkId]),
    ).toHaveLength(2)

    const after = exportToJson(cyNetwork)

    expect(after).toBe(before)
    expect(after).not.toContain(SENTINEL_MARKER)
  })

  it('leaks nothing even when images exist for every node id in the export', () => {
    const { cyNetwork, networkId } = buildFixture()
    useNodeGraphicsStore.getState().setHook({
      hookId: 'sentinel-hook',
      render: () => SENTINEL_IMAGE,
    })
    useNodeGraphicsStore.getState().setImages(networkId, [
      [
        'n1',
        hookImage(
          'data:image/svg+xml,%3Csvg%20id%3D%22CYWEB_HOOK_SENTINEL%22%2F%3E',
        ),
      ],
      ['n2', hookImage()],
    ])

    const cx2 = exportToJson(cyNetwork)

    expect(cx2).not.toContain(SENTINEL_MARKER)
    expect(cx2).not.toContain('data:image/svg+xml')
  })

  it('does not mutate the visual style or the view model', () => {
    // Reference identity is a stronger claim than "no serialized difference":
    // it proves the hook path never wrote to the exportable stores at all.
    const { cyNetwork, networkId, visualStyle, networkView } = buildFixture()

    useNodeGraphicsStore.getState().setHook({
      hookId: 'sentinel-hook',
      render: () => SENTINEL_IMAGE,
    })
    useNodeGraphicsStore.getState().setImages(networkId, [['n1', hookImage()]])
    exportToJson(cyNetwork)

    expect(cyNetwork.visualStyle).toBe(visualStyle)
    expect(cyNetwork.networkViews?.[0]).toBe(networkView)
  })

  it('still exports a Vizmapper image custom graphic', () => {
    // The other half of the contract: suppressing hook images must not suppress
    // the user's own custom graphics.
    const { cyNetwork, networkId } = buildFixture()
    const vizmapperImage = 'https://example.com/vizmapper-owned.png'
    const customGraphic: CustomGraphicsType = {
      type: 'image',
      name: 'org.cytoscape.ding.customgraphics.bitmap.URLImageCustomGraphics',
      properties: { url: vizmapperImage },
    } as unknown as CustomGraphicsType

    const styled = setBypass(
      cyNetwork.visualStyle,
      'nodeImageChart1' as any,
      ['n1'],
      customGraphic as any,
    )

    useNodeGraphicsStore.getState().setHook({
      hookId: 'sentinel-hook',
      render: () => SENTINEL_IMAGE,
    })
    useNodeGraphicsStore.getState().setImages(networkId, [['n1', hookImage()]])

    const cx2 = exportToJson({ ...cyNetwork, visualStyle: styled })

    expect(cx2).toContain(vizmapperImage)
    expect(cx2).not.toContain(SENTINEL_MARKER)
  })

  it('keeps the hook’s cy property names out of the custom-graphics key list', () => {
    // Structural guard. The apply layer uses element style bypasses, not element
    // data — but if anyone reimplements it with data keys, those keys must not
    // join this list, or applyViewModel's stale-key sweep would fight them and
    // serialization paths could pick them up.
    const keys = getCustomGraphicsPropertyKeys()

    expect(keys).not.toContain('background-image-containment')
    expect(keys).not.toContain('background-image-opacity')
    expect(keys).not.toContain('appNodeImage')
  })
})
