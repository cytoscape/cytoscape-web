/**
 * CX2 Format Export Utilities
 *
 * Functions for converting internal application models to CX2 format.
 */
import isEqual from 'lodash/isEqual'

import { CyNetwork } from '../../CyNetworkModel'
import { IdType } from '../../IdType'
import { Network } from '../../NetworkModel'
import { translateEdgeIdToCX } from '../../NetworkModel/impl/networkImpl'
import { NetworkSummary } from '../../NetworkSummaryModel'
import { OpaqueAspects } from '../../OpaqueAspectModel'
import {
  AttributeName,
  Column,
  Table,
  ValueType,
  ValueTypeName,
} from '../../TableModel'
import {
  deserializeValue,
  isListType,
} from '../../TableModel/impl/valueTypeImpl'
import { NetworkView } from '../../ViewModel'
import VisualStyleFn, {
  NodeVisualPropertyName,
  VisualProperty,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '../../VisualStyleModel'
import {
  getCustomGraphicNodeVps,
  getNonCustomGraphicVps,
} from '../../VisualStyleModel/impl/customGraphicsImpl'
import {
  convertContinuousMappingToCX,
  convertDiscreteMappingToCX,
  convertPassthroughMappingToCX,
  CXVisualMappingFunction,
  cxVisualPropertyConverter,
  CXVisualPropertyValue,
  vpToCX,
} from '../../VisualStyleModel/impl/cxVisualPropertyConverter'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../VisualStyleModel/impl/defaultVisualStyle'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
} from '../../VisualStyleModel/VisualMappingFunction'
import { VisualStyleOptions } from '../../VisualStyleModel/VisualStyleOptions'

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

  const vpNameToCXName = (vpName: VisualPropertyName): string => {
    const converter = cxVisualPropertyConverter[vpName]
    return converter.cxVPName
  }

  // TODO flesh out CX vp types
  type CXVPName = string

  // accumulate vp defaults for each vp into an object
  const vpDefaultsAccumulator = (
    defaults: { [key: CXVPName]: CXVisualPropertyValue },
    vp: VisualProperty<VisualPropertyValueType>,
  ): { [key: CXVPName]: CXVisualPropertyValue } => {
    const { name, defaultValue } = vp
    const cxVPName = vpNameToCXName(name)
    defaults[cxVPName] = vpToCX(vp.name, defaultValue)
    return defaults
  }

  // accumulate all vp mappings into an object
  const vpMappingsAccumulator = (
    mappings: {
      [key: CXVPName]: CXVisualMappingFunction<CXVisualPropertyValue>
    },
    vp: VisualProperty<VisualPropertyValueType>,
  ): { [key: CXVPName]: CXVisualMappingFunction<CXVisualPropertyValue> } => {
    const { name, mapping } = vp
    const cxVPName = vpNameToCXName(name)
    const attributeName = mapping?.attribute
    // whether attributeName is in nodeTable or edgeTable
    let isNameInTable = false
    if (attributeName) {
      isNameInTable = Object.values(NodeVisualPropertyName).includes(
        name as NodeVisualPropertyName,
      )
        ? nodeTable.columns.map((col) => col.name).includes(attributeName)
        : edgeTable.columns.map((col) => col.name).includes(attributeName)
    }
    if (mapping != null) {
      switch (mapping.type) {
        case MappingFunctionType.Continuous: {
          const convertedMapping = convertContinuousMappingToCX(
            vs,
            vp,
            mapping as ContinuousMappingFunction,
            isNameInTable,
          )
          mappings[cxVPName] = convertedMapping
          break
        }
        case MappingFunctionType.Discrete: {
          const convertedMapping = convertDiscreteMappingToCX(
            vs,
            vp,
            mapping as DiscreteMappingFunction,
            isNameInTable,
          )
          mappings[cxVPName] = convertedMapping
          break
        }
        case MappingFunctionType.Passthrough: {
          const convertedMapping = convertPassthroughMappingToCX(
            vs,
            vp,
            mapping as PassthroughMappingFunction,
            isNameInTable,
          )
          mappings[cxVPName] = convertedMapping
          break
        }
      }
    }
    return mappings
  }

  // accumulate all vp bypasses into an object
  const vpBypassesAccumulator = (
    bypasses: { [key: IdType]: { [key: CXVPName]: CXVisualPropertyValue } },
    vp: VisualProperty<VisualPropertyValueType>,
  ): { [key: IdType]: { [key: CXVPName]: CXVisualPropertyValue } } => {
    const { name, bypassMap } = vp
    const cxVPName = vpNameToCXName(name)
    bypassMap.forEach((value, id) => {
      if (bypasses[id] == null) {
        bypasses[id] = {}
      }
      bypasses[id][cxVPName] = vpToCX(vp.name, value)
    })
    return bypasses
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

  const customGraphicNodeVps = getCustomGraphicNodeVps(
    VisualStyleFn.nodeVisualProperties(vs),
  )
  const nonCustomGraphicNodeVps = getNonCustomGraphicVps(
    VisualStyleFn.nodeVisualProperties(vs),
  )

  const validCustomGraphicNodeVps = []
  for (let i = 1; i <= 9; i++) {
    const customGraphicVpName = `nodeImageChart${i}` as NodeVisualPropertyName
    const customGraphicVp = customGraphicNodeVps.find(
      (v) => v.name === customGraphicVpName,
    )
    if (customGraphicVp) {
      const invalidCustomGraphicDefaultValue = isEqual(
        customGraphicVp.defaultValue,
        DEFAULT_CUSTOM_GRAPHICS,
      )
      const invalidCustomGraphicMapping = customGraphicVp.mapping === undefined
      const invalidCustomGraphicBypass = customGraphicVp.bypassMap.size === 0
      if (
        invalidCustomGraphicDefaultValue &&
        invalidCustomGraphicMapping &&
        invalidCustomGraphicBypass
      ) {
        continue
      } else {
        const customGraphicSizeVpName =
          `nodeImageChartSize${i}` as NodeVisualPropertyName
        const customGraphicPositionVpName =
          `nodeImageChartPosition${i}` as NodeVisualPropertyName
        const customGraphicSizeVp = customGraphicNodeVps.find(
          (v) => v.name === customGraphicSizeVpName,
        )
        const customGraphicPositionVp = customGraphicNodeVps.find(
          (v) => v.name === customGraphicPositionVpName,
        )
        if (customGraphicSizeVp !== undefined) {
          validCustomGraphicNodeVps.push(customGraphicSizeVp)
        }
        if (customGraphicPositionVp !== undefined) {
          validCustomGraphicNodeVps.push(customGraphicPositionVp)
        }
        validCustomGraphicNodeVps.push(customGraphicVp)
      }
    }
  }

  const nodePropertiesToExport = [
    ...nonCustomGraphicNodeVps,
    ...validCustomGraphicNodeVps,
  ]

  const visualProperties = [
    {
      default: {
        network: VisualStyleFn.networkVisualProperties(vs).reduce(
          vpDefaultsAccumulator,
          {},
        ),
        edge: VisualStyleFn.edgeVisualProperties(vs).reduce(
          vpDefaultsAccumulator,
          {},
        ),
        node: nodePropertiesToExport.reduce(vpDefaultsAccumulator, {}),
      },
      nodeMapping: nodePropertiesToExport
        .filter((vp) => vp.mapping != null)
        .reduce(vpMappingsAccumulator, {}),
      edgeMapping: VisualStyleFn.edgeVisualProperties(vs)
        .filter((vp) => vp.mapping != null)
        .reduce(vpMappingsAccumulator, {}),
    },
  ]

  const nodeBypasses = Object.entries(
    nodePropertiesToExport
      .filter((vp) => vp.bypassMap.size > 0)
      .reduce(vpBypassesAccumulator, {}),
  ).map(([id, bypassObj]) => {
    return {
      id: parseInt(id),
      v: bypassObj,
    }
  })

  const edgeBypasses = Object.entries(
    VisualStyleFn.edgeVisualProperties(vs)
      .filter((vp) => vp.bypassMap.size > 0)
      .reduce(vpBypassesAccumulator, {}),
  ).map(([id, bypassObj]) => {
    return {
      id: parseInt(translateEdgeIdToCX(id)),
      v: bypassObj,
    }
  })

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
  ].concat(
    Object.entries(opaqueAspects ?? {})
      .filter(([, aspect]) => aspect != null)
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
