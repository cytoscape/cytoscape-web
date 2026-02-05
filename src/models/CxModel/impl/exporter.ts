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
  const allNodeVps = VisualStyleFn.nodeVisualProperties(vs)

  // Separate lists for different purposes
  const customGraphicNodeVpsForDefaults = []
  const customGraphicNodeVpsForMappings = []
  const customGraphicNodeVpsForBypasses = []

  for (let i = 1; i <= 9; i++) {
    const customGraphicVpName = `nodeImageChart${i}` as NodeVisualPropertyName
    const customGraphicVp = customGraphicNodeVps.find(
      (v) => v.name === customGraphicVpName,
    )

    if (customGraphicVp) {
      const customGraphicSizeVpName =
        `nodeImageChartSize${i}` as NodeVisualPropertyName
      const customGraphicPositionVpName =
        `nodeImageChartPosition${i}` as NodeVisualPropertyName
      const customGraphicSizeVp = allNodeVps.find(
        (v) => v.name === customGraphicSizeVpName,
      )
      const customGraphicPositionVp = allNodeVps.find(
        (v) => v.name === customGraphicPositionVpName,
      )

      // Check if this custom graphic has valid defaults (not DEFAULT_CUSTOM_GRAPHICS)
      const hasValidDefault = !isEqual(
        customGraphicVp.defaultValue,
        DEFAULT_CUSTOM_GRAPHICS,
      )

      // Check if this custom graphic has valid mapping
      const hasValidMapping = customGraphicVp.mapping !== undefined

      // Check if this custom graphic has valid bypasses
      const hasValidBypasses = customGraphicVp.bypassMap.size > 0

      // Add to defaults list if it has valid defaults (not DEFAULT_CUSTOM_GRAPHICS)
      if (hasValidDefault) {
        if (customGraphicSizeVp !== undefined) {
          customGraphicNodeVpsForDefaults.push(customGraphicSizeVp)
        }
        if (customGraphicPositionVp !== undefined) {
          customGraphicNodeVpsForDefaults.push(customGraphicPositionVp)
        }
        customGraphicNodeVpsForDefaults.push(customGraphicVp)
      }

      // Add to mappings list if it has valid mappings
      if (hasValidMapping) {
        // Size and position should be included in defaults when custom graphic has mapping
        if (customGraphicSizeVp !== undefined) {
          // Only add to defaults if not already added
          if (!customGraphicNodeVpsForDefaults.includes(customGraphicSizeVp)) {
            customGraphicNodeVpsForDefaults.push(customGraphicSizeVp)
          }
          // Also add to mappings list so they appear in mappings export
          customGraphicNodeVpsForMappings.push(customGraphicSizeVp)
        }
        if (customGraphicPositionVp !== undefined) {
          // Only add to defaults if not already added
          if (
            !customGraphicNodeVpsForDefaults.includes(customGraphicPositionVp)
          ) {
            customGraphicNodeVpsForDefaults.push(customGraphicPositionVp)
          }
          // Also add to mappings list so they appear in mappings export
          customGraphicNodeVpsForMappings.push(customGraphicPositionVp)
        }
        customGraphicNodeVpsForMappings.push(customGraphicVp)
      }

      // Add to bypasses list if it has valid bypasses
      if (hasValidBypasses) {
        // Size and position should be included in defaults when custom graphic has bypass
        if (customGraphicSizeVp !== undefined) {
          // Only add to defaults if not already added
          if (!customGraphicNodeVpsForDefaults.includes(customGraphicSizeVp)) {
            customGraphicNodeVpsForDefaults.push(customGraphicSizeVp)
          }
          // Also add to bypasses list so they appear in bypasses export
          customGraphicNodeVpsForBypasses.push(customGraphicSizeVp)
        }
        if (customGraphicPositionVp !== undefined) {
          // Only add to defaults if not already added
          if (
            !customGraphicNodeVpsForDefaults.includes(customGraphicPositionVp)
          ) {
            customGraphicNodeVpsForDefaults.push(customGraphicPositionVp)
          }
          // Also add to bypasses list so they appear in bypasses export
          customGraphicNodeVpsForBypasses.push(customGraphicPositionVp)
        }
        customGraphicNodeVpsForBypasses.push(customGraphicVp)
      }
    }
  }

  // Create separate property lists for each purpose
  const nodePropertiesForDefaults = [
    ...nonCustomGraphicNodeVps,
    ...customGraphicNodeVpsForDefaults,
  ]

  const nodePropertiesForMappings = [
    ...nonCustomGraphicNodeVps,
    ...customGraphicNodeVpsForMappings,
  ]

  const nodePropertiesForBypasses = [
    ...nonCustomGraphicNodeVps,
    ...customGraphicNodeVpsForBypasses,
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
        node: nodePropertiesForDefaults.reduce(vpDefaultsAccumulator, {}),
      },
      nodeMapping: nodePropertiesForMappings.reduce(
        (mappings, vp) => {
          // Include properties with mappings
          if (vp.mapping != null) {
            return vpMappingsAccumulator(mappings, vp)
          }
          // Include size/position properties as defaults when associated with custom graphics that have mappings
          if (
            vp.name.startsWith('nodeImageChartSize') ||
            vp.name.startsWith('nodeImageChartPosition')
          ) {
            const { name, defaultValue } = vp
            const cxVPName = vpNameToCXName(name)
            // Add as default value in mappings structure (CX2 format allows defaults in mappings)
            if (!mappings[cxVPName]) {
              ;(mappings as any)[cxVPName] = vpToCX(vp.name, defaultValue)
            }
          }
          return mappings
        },
        {} as {
          [key: CXVPName]: CXVisualMappingFunction<CXVisualPropertyValue>
        },
      ) as any,
      edgeMapping: VisualStyleFn.edgeVisualProperties(vs)
        .filter((vp) => vp.mapping != null)
        .reduce(vpMappingsAccumulator, {}),
    },
  ]

  // Process bypasses: include size/position in bypass value objects when custom graphic has bypass
  const bypassesMap = nodePropertiesForBypasses
    .filter((vp) => vp.bypassMap.size > 0)
    .reduce(vpBypassesAccumulator, {})

  // Add size/position as defaults to bypass value objects for custom graphics with bypasses
  for (let i = 1; i <= 9; i++) {
    const customGraphicVpName = `nodeImageChart${i}` as NodeVisualPropertyName
    const customGraphicVp = allNodeVps.find(
      (v) => v.name === customGraphicVpName,
    )

    if (customGraphicVp && customGraphicVp.bypassMap.size > 0) {
      const customGraphicSizeVpName =
        `nodeImageChartSize${i}` as NodeVisualPropertyName
      const customGraphicPositionVpName =
        `nodeImageChartPosition${i}` as NodeVisualPropertyName
      const customGraphicSizeVp = allNodeVps.find(
        (v) => v.name === customGraphicSizeVpName,
      )
      const customGraphicPositionVp = allNodeVps.find(
        (v) => v.name === customGraphicPositionVpName,
      )

      // Add size/position to each bypass value object
      customGraphicVp.bypassMap.forEach((_, id) => {
        if (bypassesMap[id]) {
          if (customGraphicSizeVp) {
            const cxVPName = vpNameToCXName(customGraphicSizeVp.name)
            if (!bypassesMap[id][cxVPName]) {
              bypassesMap[id][cxVPName] = vpToCX(
                customGraphicSizeVp.name,
                customGraphicSizeVp.defaultValue,
              )
            }
          }
          if (customGraphicPositionVp) {
            const cxVPName = vpNameToCXName(customGraphicPositionVp.name)
            if (!bypassesMap[id][cxVPName]) {
              bypassesMap[id][cxVPName] = vpToCX(
                customGraphicPositionVp.name,
                customGraphicPositionVp.defaultValue,
              )
            }
          }
        }
      })
    }
  }

  const nodeBypasses = Object.entries(bypassesMap).map(([id, bypassObj]) => {
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
