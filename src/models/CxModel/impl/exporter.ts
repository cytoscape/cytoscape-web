/**
 * CX2 Format Export Utilities
 *
 * Functions for converting internal application models to CX2 format.
 */
import { CyNetwork } from '../../CyNetworkModel'
import { translateEdgeIdToCX } from '../../NetworkModel/impl/networkImpl'
import { NetworkSummary } from '../../NetworkSummaryModel'
import { OpaqueAspects } from '../../OpaqueAspectModel'
import {
  AttributeName,
  Column,
  ValueType,
  ValueTypeName,
} from '../../TableModel'
import {
  deserializeValue,
  isListType,
} from '../../TableModel/impl/valueTypeImpl'
import {
  buildCyWebVisualStylesAspect,
  CY_WEB_VISUAL_STYLES_ASPECT_TAG,
} from './converters/visualStyleSetConverter'
import { buildVisualStyleAspects } from './styleAspectBuilder'

/**
 * Exports a network to CX2 format.
 *
 * Converts internal application models (Network, VisualStyle, Tables, etc.) into
 * the CX2 format used by NDEx and other Cytoscape tools.
 *
 * @param network - Network to export
 * @param vs - Visual style to export
 * @param summary - Network summary metadata
 * @param nodeTable - Node table with attributes
 * @param edgeTable - Edge table with attributes
 * @param visualStyleOptions - Optional visual editor properties
 * @param networkView - Optional network view with coordinates
 * @param networkName - Optional name override for the network
 * @param opaqueAspects - Optional opaque aspects to include
 * @returns CX2 format array
 */
export const exportCyNetworkToCx2 = (
  cyNetwork: CyNetwork,
  summary?: NetworkSummary,
  networkName?: string, // optional new name for the network
): any => {
  const network = cyNetwork.network
  const vs = cyNetwork.visualStyle
  const nodeTable = cyNetwork.nodeTable
  const edgeTable = cyNetwork.edgeTable
  const visualStyleOptions = cyNetwork.visualStyleOptions
  const networkView = cyNetwork.networkViews?.[0] // Use first view if available
  const opaqueAspects: OpaqueAspects | undefined = cyNetwork.otherAspects
    ? Object.fromEntries(
        cyNetwork.otherAspects.map((aspect: OpaqueAspects, index: number) => {
          const key = Object.keys(aspect)[0] || `aspect${index}`
          const value = Object.values(aspect)[0]
          return [key, value]
        }),
      )
    : undefined
  // accumulate node/edge attributes into an object
  const attributesAccumulator = (
    attributes: { [key: AttributeName]: { d: ValueTypeName; v?: ValueType } },
    column: Column,
  ): { [key: AttributeName]: { d: ValueTypeName; v?: ValueType } } => {
    attributes[column.name] = {
      d: column.type,
    }
    return attributes
  }

  const networkAttributeDeclarations: {
    [key: string]: { d: ValueTypeName }
  } = {}
  const networkAttributes: any = [{}]

  // Handle summary properties if provided
  if (summary) {
    summary.properties.forEach((property) => {
      networkAttributeDeclarations[property.predicateString] = {
        d: property.dataType,
      }
    })

    summary.properties.forEach((property) => {
      networkAttributes[0][property.predicateString] =
        isListType(property.dataType) && !Array.isArray(property.value)
          ? deserializeValue(
              networkAttributeDeclarations[property.predicateString].d,
              property.value as string,
            )
          : property.value
    })
  }

  // Handle name, description, version from summary or networkAttributes
  const networkNameValue =
    networkName ??
    summary?.name ??
    (cyNetwork.networkAttributes?.attributes?.name as string | undefined)
  const descriptionValue =
    summary?.description ??
    (cyNetwork.networkAttributes?.attributes?.description as string | undefined)
  const versionValue =
    summary?.version ??
    (cyNetwork.networkAttributes?.attributes?.version as string | undefined)

  if (networkNameValue) {
    networkAttributeDeclarations.name = { d: 'string' }
    networkAttributes[0].name = networkNameValue
  }
  if (descriptionValue) {
    networkAttributeDeclarations.description = { d: 'string' }
    networkAttributes[0].description = descriptionValue
  }
  if (versionValue) {
    networkAttributeDeclarations.version = { d: 'string' }
    networkAttributes[0].version = versionValue
  }

  const attributeDeclarations = [
    {
      networkAttributes: networkAttributeDeclarations,
      nodes: Array.from(nodeTable.columns.values()).reduce(
        attributesAccumulator,
        {},
      ),
      edges: Array.from(edgeTable.columns.values()).reduce(
        attributesAccumulator,
        {},
      ),
    },
  ]

  const nodes = network.nodes.map((node) => {
    const nodeRow = nodeTable.rows.get(node.id)
    return {
      id: parseInt(node.id),
      x: networkView?.nodeViews[node.id].x ?? 0,
      y: networkView?.nodeViews[node.id].y ?? 0,
      v: nodeRow,
    }
  })

  const edges = network.edges.map((edge) => {
    const edgeRow = edgeTable.rows.get(edge.id)
    const edgeId = parseInt(translateEdgeIdToCX(edge.id))
    const source = parseInt(edge.s)
    const target = parseInt(edge.t)
    return {
      id: edgeId,
      s: source,
      t: target,
      v: edgeRow,
    }
  })

  const nodeSizeLocked =
    visualStyleOptions?.visualEditorProperties?.nodeSizeLocked
  const arrowColorMatchesEdge =
    visualStyleOptions?.visualEditorProperties?.arrowColorMatchesEdge
  const tableDisplayConfiguration =
    visualStyleOptions?.visualEditorProperties?.tableDisplayConfiguration
  const visualEditorProperties = [
    {
      properties: {
        nodeSizeLocked: nodeSizeLocked ?? false,
        arrowColorMatchesEdge: arrowColorMatchesEdge ?? false,
        tableDisplayConfiguration: tableDisplayConfiguration ?? {
          nodeTable: {
            columnConfiguration: [],
          },
          edgeTable: {
            columnConfiguration: [],
          },
        },
      },
    },
  ]

  // Convert the active visual style into the standard CX2 style aspects
  const { visualProperties, nodeBypasses, edgeBypasses } =
    buildVisualStyleAspects(vs, nodeTable, edgeTable)

  // Multi-style support: the full named-style set travels in a custom
  // aspect while the active style stays in the standard aspects above.
  const cyWebVisualStyles =
    cyNetwork.visualStyleSet !== undefined
      ? buildCyWebVisualStylesAspect(
          cyNetwork.visualStyleSet,
          nodeTable,
          edgeTable,
        )
      : undefined

  const descriptor = {
    CXVersion: '2.0',
    hasFragments: false,
  }

  const aspects = [
    { key: 'attributeDeclarations', aspect: attributeDeclarations },
    { key: 'networkAttributes', aspect: networkAttributes },
    { key: 'nodes', aspect: nodes },
    { key: 'edges', aspect: edges },
    { key: 'visualProperties', aspect: visualProperties },
    { key: 'nodeBypasses', aspect: nodeBypasses },
    { key: 'edgeBypasses', aspect: edgeBypasses },
    { key: 'visualEditorProperties', aspect: visualEditorProperties },
  ]
    .concat(
      cyWebVisualStyles !== undefined
        ? [
            {
              key: CY_WEB_VISUAL_STYLES_ASPECT_TAG,
              aspect: [cyWebVisualStyles],
            },
          ]
        : [],
    )
    .concat(
      Object.entries(opaqueAspects ?? {})
        // When a fresh style-set aspect is emitted above, an opaque copy
        // would be stale — drop it. When NOT emitting (single default style,
        // or an aspect this version could not consume), pass the copy
        // through untouched so the data is never destroyed by a save.
        .filter(
          ([key, aspect]) =>
            aspect != null &&
            (cyWebVisualStyles === undefined ||
              key !== CY_WEB_VISUAL_STYLES_ASPECT_TAG),
        )
        .map(([key, aspect]) => {
          return { key, aspect }
        }),
    )

  const status = [
    {
      error: '',
      success: true,
    },
  ]

  const metaData = aspects.map((aspect) => {
    return {
      name: aspect.key,
      elementCount: aspect.aspect.length,
    }
  })

  const cx = [
    descriptor,
    { metaData },
    ...aspects.map(({ key, aspect }) => ({ [key]: aspect })),
    { status },
  ]

  return cx
}
