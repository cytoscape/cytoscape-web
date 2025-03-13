import _ from 'lodash'
import { Cx2 } from '../../CxModel/Cx2'
import * as cxUtil from '../../CxModel/cx2-util'

import { NetworkView } from '../../ViewModel'

import { ValueType } from '../../TableModel'

import {
  VisualStyle,
  VisualPropertyName,
  VisualPropertyGroup,
  ContinuousFunctionControlPoint,
  VisualPropertyValueType,
  VisualProperty,
  Bypass,
  NetworkViewSources,
  DiscreteMappingFunction,
  ContinuousMappingFunction,
  PassthroughMappingFunction,
  MappingFunctionType,
} from '..'

import {
  CXId,
  CXVisualMappingFunction,
  cxVisualPropertyConverter,
  CXVisualPropertyConverter,
  CXVisualPropertyValue,
} from './cxVisualPropertyConverter'

import { getDefaultVisualStyle } from './DefaultVisualStyle'
import { createNewNetworkView, updateNetworkView } from './compute-view-util'
import { VisualStyleOptions } from '../VisualStyleOptions'
import { translateCXEdgeId } from '../../NetworkModel/impl/CyNetwork'

const sortByDisplayName = (
  a: VisualProperty<VisualPropertyValueType>,
  b: VisualProperty<VisualPropertyValueType>,
) => {
  const nameA = a.displayName.toLowerCase()
  const nameB = b.displayName.toLowerCase()
  if (nameA < nameB) {
    return -1
  } else if (nameA > nameB) {
    return 1
  }
  return 0
}

export const applyVisualStyle = (data: NetworkViewSources): NetworkView => {
  const { network, visualStyle, nodeTable, edgeTable, networkView } = data

  if (networkView !== undefined) {
    return updateNetworkView(
      network,
      networkView,
      visualStyle,
      nodeTable,
      edgeTable,
    )
  } else {
    return createNewNetworkView(network, visualStyle, nodeTable, edgeTable)
  }
}

export const nodeVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle)
    .filter((value) => value.group === VisualPropertyGroup.Node)
    .sort(sortByDisplayName)
}

export const edgeVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle)
    .filter((value) => value.group === VisualPropertyGroup.Edge)
    .sort(sortByDisplayName)
}

export const networkVisualProperties = (
  visualStyle: VisualStyle,
): Array<VisualProperty<VisualPropertyValueType>> => {
  return Object.values(visualStyle)
    .filter((value) => value.group === VisualPropertyGroup.Network)
    .sort(sortByDisplayName)
}

export const createVisualStyle = (): VisualStyle => {
  // create new copy of the default style instead of returning the same instance
  return getDefaultVisualStyle()
}

// convert cx visual properties to app visual style model
export const createVisualStyleFromCx = (cx: Cx2): VisualStyle => {
  const visualStyle: VisualStyle = createVisualStyle()
  const visualProperties = cxUtil.getVisualProperties(cx)
  const nodeBypasses = cxUtil.getNodeBypasses(cx) ?? []
  const edgeBypasses = cxUtil.getEdgeBypasses(cx) ?? []
  const defaultNodeProperties =
    visualProperties.visualProperties[0]?.default?.node ?? {}
  const defaultEdgeProperties =
    visualProperties.visualProperties[0]?.default?.edge ?? {}
  const defaultNetworkProperties =
    visualProperties.visualProperties[0]?.default?.network ?? {}
  const nodeMapping = visualProperties.visualProperties[0]?.nodeMapping ?? {}
  const edgeMapping = visualProperties.visualProperties[0]?.edgeMapping ?? {}

  const nodeBypassMap: Map<
    VisualPropertyName,
    Bypass<VisualPropertyValueType>
  > = new Map()
  const edgeBypassMap: Map<
    VisualPropertyName,
    Bypass<VisualPropertyValueType>
  > = new Map()

  // group bypasses by visual property instead of by element
  nodeBypasses?.nodeBypasses?.forEach(
    (entry: { id: CXId; v: Record<string, object> }) => {
      const { id, v } = entry
      Object.keys(v).forEach((cxVPName) => {
        const entry = Object.entries(cxVisualPropertyConverter).find(
          ([vpName, cxVPConverter]) => cxVPConverter.cxVPName === cxVPName,
        )

        if (entry != null) {
          const [vpName, cxVPConverter] = entry as [
            VisualPropertyName,
            CXVisualPropertyConverter<VisualPropertyValueType>,
          ]

          if (nodeBypassMap.has(vpName)) {
            const entry = nodeBypassMap.get(vpName) ?? new Map()
            entry.set(
              String(id),
              cxVPConverter.valueConverter(
                v[cxVPName] as CXVisualPropertyValue,
              ),
            )
            nodeBypassMap.set(vpName, entry)
          } else {
            nodeBypassMap.set(
              vpName,
              new Map().set(
                String(id),
                cxVPConverter.valueConverter(
                  v[cxVPName] as CXVisualPropertyValue,
                ),
              ),
            )
          }
        }
      })
    },
  )

  // group bypasses by visual property instead of by element
  edgeBypasses?.edgeBypasses?.forEach(
    (entry: { id: CXId; v: Record<string, object> }) => {
      const { id, v } = entry
      Object.keys(v).forEach((cxVPName) => {
        const entry = Object.entries(cxVisualPropertyConverter).find(
          ([vpName, cxVPConverter]) => cxVPConverter.cxVPName === cxVPName,
        )

        if (entry != null) {
          const [vpName, cxVPConverter] = entry as [
            VisualPropertyName,
            CXVisualPropertyConverter<VisualPropertyValueType>,
          ]

          if (edgeBypassMap.has(vpName)) {
            const entry = edgeBypassMap.get(vpName) ?? new Map()
            entry.set(
              translateCXEdgeId(String(id)),
              cxVPConverter.valueConverter(
                v[cxVPName] as CXVisualPropertyValue,
              ),
            )
            edgeBypassMap.set(vpName, entry)
          } else {
            edgeBypassMap.set(
              vpName,
              new Map().set(
                translateCXEdgeId(String(id)),
                cxVPConverter.valueConverter(
                  v[cxVPName] as CXVisualPropertyValue,
                ),
              ),
            )
          }
        }
      })
    },
  )

  const vpGroups = [
    {
      vps: nodeVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultNodeProperties[cxVPName],
      getMapping: (
        cxVPName: string,
      ): CXVisualMappingFunction<CXVisualPropertyValue> | null =>
        nodeMapping[cxVPName] as CXVisualMappingFunction<CXVisualPropertyValue>,
      getBypass: (): Map<VisualPropertyName, Bypass<VisualPropertyValueType>> =>
        nodeBypassMap,
    },
    {
      vps: edgeVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultEdgeProperties[cxVPName],
      getMapping: (
        cxVPName: string,
      ): CXVisualMappingFunction<CXVisualPropertyValue> | null =>
        edgeMapping?.[
          cxVPName
        ] as CXVisualMappingFunction<CXVisualPropertyValue>,
      getBypass: (): Map<VisualPropertyName, Bypass<VisualPropertyValueType>> =>
        edgeBypassMap,
    },
    {
      vps: networkVisualProperties(visualStyle),
      getDefault: (cxVPName: string) => defaultNetworkProperties[cxVPName],
      getMapping: (cxVPName: string) => null,
      getBypass: () => new Map(), // no mappings or bypasses for network vps
    },
  ]

  vpGroups.forEach((group) => {
    const { vps, getDefault, getMapping, getBypass } = group
    vps.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
      const { name: vpName } = vp
      const converter = cxVisualPropertyConverter[vpName]

      const isSupportedCXProperty = converter != null

      if (isSupportedCXProperty) {
        const cxDefault = getDefault(
          converter.cxVPName,
        ) as CXVisualPropertyValue
        const cxMapping = getMapping(converter.cxVPName)
        const cxBypass = getBypass()

        if (cxDefault != null) {
          visualStyle[vpName].defaultValue = converter.valueConverter(cxDefault)
        }

        if (cxMapping != null) {
          switch (cxMapping.type) {
            case 'PASSTHROUGH': {
              const m: PassthroughMappingFunction = {
                type: MappingFunctionType.Passthrough,
                visualPropertyType: vp.type,
                attribute: cxMapping.definition.attribute,
                defaultValue: vp.defaultValue,
                attributeType: cxMapping.definition.type,
              }
              visualStyle[vpName].mapping = m
              break
            }
            case 'DISCRETE': {
              const vpValueMap = new Map()
              const mapEntries = cxMapping?.definition?.map ?? []
              mapEntries.forEach((mapEntry) => {
                const { v, vp } = mapEntry
                vpValueMap.set(v, converter.valueConverter(vp))
              })
              const m: DiscreteMappingFunction = {
                type: MappingFunctionType.Discrete,
                attribute: cxMapping.definition.attribute,
                vpValueMap,
                visualPropertyType: vp.type,
                defaultValue: vp.defaultValue,
                attributeType: cxMapping.definition.type,
              }
              visualStyle[vpName].mapping = m
              break
            }
            case 'CONTINUOUS': {
              const numMapEntries = cxMapping?.definition?.map?.length ?? 0
              if (numMapEntries < 2) {
                visualStyle[vpName].mapping = undefined
                break
              }

              let min = null
              let max = null

              if (
                cxMapping.definition.map[0].max != null &&
                cxMapping.definition.map[0].maxVPValue != null
              ) {
                min = {
                  value: cxMapping.definition.map[0].max as ValueType,
                  vpValue: converter.valueConverter(
                    cxMapping.definition.map[0].maxVPValue,
                  ),
                  inclusive: cxMapping.definition.map[0].includeMax,
                }
              }

              if (
                cxMapping.definition.map[numMapEntries - 1].min != null &&
                cxMapping.definition.map[numMapEntries - 1].minVPValue != null
              ) {
                max = {
                  value: cxMapping.definition.map[numMapEntries - 1]
                    .min as ValueType,
                  vpValue: converter.valueConverter(
                    cxMapping.definition.map[numMapEntries - 1]
                      .minVPValue as CXVisualPropertyValue,
                  ),
                  inclusive:
                    cxMapping.definition.map[numMapEntries - 1].includeMin,
                }
              }

              const controlPoints: ContinuousFunctionControlPoint[] = []

              // only iterate through the middle entries of the map
              // i.e. exclue min and max
              for (let i = 1; i <= numMapEntries - 2; i++) {
                const mapEntry = cxMapping.definition.map[i]
                if (mapEntry.minVPValue != null && mapEntry.min != null) {
                  controlPoints.push({
                    value: mapEntry.min as ValueType,
                    vpValue: converter.valueConverter(mapEntry.minVPValue),
                  })
                }

                if (mapEntry.maxVPValue != null && mapEntry.max != null) {
                  controlPoints.push({
                    value: mapEntry.max as ValueType,
                    vpValue: converter.valueConverter(mapEntry.maxVPValue),
                  })
                }
              }

              const uniqueCtrlPts = _.uniqWith(controlPoints, _.isEqual)

              const sortedCtrlPts = Array.from(uniqueCtrlPts).sort(
                (a, b) => (a.value as number) - (b.value as number),
              )

              if (min != null && max != null && controlPoints.length > 0) {
                const m: ContinuousMappingFunction = {
                  type: MappingFunctionType.Continuous,
                  attribute: cxMapping.definition.attribute,
                  min,
                  max,
                  controlPoints: sortedCtrlPts,
                  visualPropertyType: vp.type,
                  defaultValue: vp.defaultValue,
                  gtMaxVpValue: converter.valueConverter(
                    max.vpValue as CXVisualPropertyValue,
                  ),
                  ltMinVpValue: converter.valueConverter(
                    min.vpValue as CXVisualPropertyValue,
                  ),
                  attributeType: cxMapping.definition.type,
                }
                visualStyle[vpName].mapping = m
              }
              break
            }
            default:
              break
          }
        }

        visualStyle[vpName].bypassMap = cxBypass.get(vpName) ?? new Map()
      } else {
        // property is not found in cx, in theory all cytoscape web properties should be in
        // cx, if this happens, it is a bug
        console.error(`Property ${vpName} not found in CX`)
      }
    })

    // **** CUSTOM EXTENSION FOR PIE CHARTS ****
    // Look for custom graphics in the node defaults that specify a chart.
  })
  if (defaultNodeProperties["NODE_CUSTOMGRAPHICS_1"]) {
    let pieChartConfig: any;
    const pieValue = defaultNodeProperties["NODE_CUSTOMGRAPHICS_1"] as any;
  
    if (typeof pieValue === "string") {
      const match = pieValue.match(/{.*}/);
      if (match) {
        try {
          pieChartConfig = JSON.parse(match[0]);
        } catch (e) {
          console.error("Failed to parse pie chart config from string", e);
        }
      }
    } else if (typeof pieValue === "object") {
      pieChartConfig = pieValue.properties;
    }
  
    if (pieChartConfig) {
      (visualStyle as any).pieChartConfig = pieChartConfig;
  
      // Get nodes from the CX.
      const nodesArray = cxUtil.getNodes(cx);
      if (nodesArray && nodesArray.length > 0) {
        // The configuration defines the pie slices via the "cy_dataColumns" array.
        // For example: ["degree.layout", "Degree", "Eccentricity"]
        const columns: string[] = pieChartConfig.cy_dataColumns;
  
        // Process each node.
        nodesArray.forEach((node: any) => {
          // Get the raw data.
          const data = node.v ?? {};
          let totalSum = 0;
          // Sum all values from the three columns.
          columns.forEach((col: string) => {
            const raw = data[col];
            if (typeof raw === "number" && raw > 0) {
              totalSum += raw;
            }
          });
          // Compute percentages for each column.
          const computedSizes: number[] = columns.map((col: string) => {
            const raw = data[col];
            if (typeof raw !== "number" || raw <= 0) {
              return 0;
            }
            return totalSum > 0 ? (100 * raw) / totalSum : 0;
          });
          // Overwrite the raw attribute values with computed percentages.
          // For pie-1, use the first column, etc.
          data[columns[0]] = computedSizes[0] || 0;
          data[columns[1]] = computedSizes[1] || 0;
          data[columns[2]] = computedSizes[2] || 0;
  
          // Also, for convenience, you may still store them under new keys.
          data["pie-1-background-size"] = computedSizes[0] || 0;
          data["pie-2-background-size"] = computedSizes[1] || 0;
          data["pie-3-background-size"] = computedSizes[2] || 0;
  
          // Ensure the node's unique id is also in data.
          data["id"] = node.id;
          node.v = data;
  
          // Update node.values if used downstream.
          if (node.values instanceof Map) {
            node.values.set(columns[0], computedSizes[0] || 0);
            node.values.set(columns[1], computedSizes[1] || 0);
            node.values.set(columns[2], computedSizes[2] || 0);
            node.values.set("id", node.id);
          } else {
            node.values = {
              ...node.values,
              [columns[0]]: computedSizes[0] || 0,
              [columns[1]]: computedSizes[1] || 0,
              [columns[2]]: computedSizes[2] || 0,
              "id": node.id,
            };
          }
          console.log("Updated node:", node);
        });
  
        // Copy node.v into node.data so that ele.data() returns the computed values.
        nodesArray.forEach((node: any) => {
          node.data = { ...node.v };
        });
  
        // Create passthrough mapping properties using the original attribute names.
        // Now each node’s computed percentage is stored under, for example, "degree.layout".
        const updateOrCreatePassthroughVP = (
          vpName: string,
          displayName: string,
          tooltip: string,
          attributeName: string // raw attribute name to use
        ) => {
          (visualStyle as any)[vpName] = {
            group: "node",
            name: vpName,
            displayName,
            type: "number",
            defaultValue: 0, // fallback
            bypassMap: new Map(),
            tooltip,
            mapping: {
              type: "passthrough",
              attribute: attributeName,
              visualPropertyType: "number"
            }
          };
        };
  
        // For pie slices, use the corresponding CX column names.
        updateOrCreatePassthroughVP(
          "pie-1-background-size",
          "Pie Slice 1 Size",
          "The size of pie slice 1 as a percentage of the pie size.",
          columns[0] // e.g., "degree.layout"
        );
        updateOrCreatePassthroughVP(
          "pie-2-background-size",
          "Pie Slice 2 Size",
          "The size of pie slice 2 as a percentage of the pie size.",
          columns[1] // e.g., "Degree"
        );
        updateOrCreatePassthroughVP(
          "pie-3-background-size",
          "Pie Slice 3 Size",
          "The size of pie slice 3 as a percentage of the pie size.",
          columns[2] // e.g., "Eccentricity"
        );
      }
    }
  }
  console.log(visualStyle)
  return visualStyle
}

export const createVisualStyleOptionsFromCx = (cx: Cx2): VisualStyleOptions => {
  return cxUtil.getVisualEditorProperties(cx) ?? {}
}