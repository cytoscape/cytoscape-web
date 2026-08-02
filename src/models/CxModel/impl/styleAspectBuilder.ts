/**
 * Builds the CX2 style aspects (visualProperties, nodeBypasses, edgeBypasses)
 * from a single VisualStyle.
 *
 * Extracted from exporter.ts so the same conversion can run once per named
 * style when exporting a multi-style network (see visualStyleSetConverter.ts),
 * as well as for the standard single-style aspects.
 */
import isEqual from 'lodash/isEqual'

import { IdType } from '../../IdType'
import { translateEdgeIdToCX } from '../../NetworkModel/impl/networkImpl'
import { Table } from '../../TableModel'
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

// TODO flesh out CX vp types
type CXVPName = string

export interface VisualStyleCx2Aspects {
  /** Content of the `visualProperties` aspect (single-element array). */
  visualProperties: any[]
  /** Content of the `nodeBypasses` aspect. */
  nodeBypasses: Array<{ id: number; v: Record<string, any> }>
  /** Content of the `edgeBypasses` aspect. */
  edgeBypasses: Array<{ id: number; v: Record<string, any> }>
}

/**
 * The CX2 name for a visual property, or undefined when no converter is
 * registered for it.
 *
 * Returns undefined rather than dereferencing: `cxVisualPropertyConverter` is a
 * plain record, so a property this build does not know about (a newer style, a
 * plugin's) threw here and aborted the whole export. Callers skip the unknown
 * property and keep exporting the rest.
 */
const vpNameToCXName = (vpName: VisualPropertyName): string | undefined =>
  cxVisualPropertyConverter[vpName]?.cxVPName

/**
 * Convert one VisualStyle into the three CX2 style aspects.
 *
 * @param vs - Visual style to convert
 * @param nodeTable - Node table (used to check mapping attribute existence)
 * @param edgeTable - Edge table (used to check mapping attribute existence)
 */
export const buildVisualStyleAspects = (
  vs: VisualStyle,
  nodeTable: Table,
  edgeTable: Table,
): VisualStyleCx2Aspects => {
  // accumulate vp defaults for each vp into an object
  const vpDefaultsAccumulator = (
    defaults: { [key: CXVPName]: CXVisualPropertyValue },
    vp: VisualProperty<VisualPropertyValueType>,
  ): { [key: CXVPName]: CXVisualPropertyValue } => {
    const { name, defaultValue } = vp
    const cxVPName = vpNameToCXName(name)
    if (cxVPName === undefined) {
      return defaults
    }
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
    if (cxVPName === undefined) {
      return mappings
    }
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
    if (cxVPName === undefined) {
      return bypasses
    }
    bypassMap.forEach((value, id) => {
      if (bypasses[id] == null) {
        bypasses[id] = {}
      }
      bypasses[id][cxVPName] = vpToCX(vp.name, value)
    })
    return bypasses
  }

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
        }
        if (customGraphicPositionVp !== undefined) {
          // Only add to defaults if not already added
          if (
            !customGraphicNodeVpsForDefaults.includes(customGraphicPositionVp)
          ) {
            customGraphicNodeVpsForDefaults.push(customGraphicPositionVp)
          }
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
            if (cxVPName !== undefined && !bypassesMap[id][cxVPName]) {
              bypassesMap[id][cxVPName] = vpToCX(
                customGraphicSizeVp.name,
                customGraphicSizeVp.defaultValue,
              )
            }
          }
          if (customGraphicPositionVp) {
            const cxVPName = vpNameToCXName(customGraphicPositionVp.name)
            if (cxVPName !== undefined && !bypassesMap[id][cxVPName]) {
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

  return { visualProperties, nodeBypasses, edgeBypasses }
}
