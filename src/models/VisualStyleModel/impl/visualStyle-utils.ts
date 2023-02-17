import { IdType } from '../../IdType'
import { Edge, Network, Node } from '../../NetworkModel'
import { AttributeName, Column, Table, ValueType } from '../../TableModel'
import { EdgeView, NetworkView, NodeView } from '../../ViewModel'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
  VisualMappingFunction,
} from '../VisualMappingFunction'
import { VisualProperty } from '../VisualProperty'
import { VisualPropertyName } from '../VisualPropertyName'
import { VisualPropertyValueType } from '../VisualPropertyValue'
import { VisualStyle } from '../VisualStyle'
import { edgeVisualProperties, nodeVisualProperties } from './VisualStyleImpl'

// import * as d3Scale from 'd3-scale'
// import { VisualPropertyValueTypeName } from '../../VisualStyleModel/VisualPropertyValueTypeName'

import * as MapperFactory from '../VisualMappingFunction/MapperFactory'
import { Mapper } from '../VisualMappingFunction/Mapper'

// Buiold mapping functions from all visual properties
const buildMappers = (vs: VisualStyle): Map<VisualPropertyName, Mapper> => {
  const mappers: Map<VisualPropertyName, Mapper> = new Map()
  Object.keys(vs).forEach((vpName: VisualPropertyName) => {
    const vp: VisualProperty<VisualPropertyValueType> = vs[vpName]
    const vmf: VisualMappingFunction | undefined = vp.mapping
    if (vmf !== undefined) {
      let mapper: Mapper
      const mappingType: MappingFunctionType = vmf.type
      if (mappingType === MappingFunctionType.Discrete) {
        mapper = MapperFactory.createDiscreteMapper(
          vmf as DiscreteMappingFunction,
        )
      } else if (mappingType === MappingFunctionType.Continuous) {
        mapper = MapperFactory.createContinuousMapper(
          vmf as ContinuousMappingFunction,
        )
      } else if (mappingType === MappingFunctionType.Passthrough) {
        mapper = MapperFactory.createPassthroughMapper(
          vmf as PassthroughMappingFunction,
        )
      } else {
        throw new Error(`Unknown mapping type for ${vpName}`)
      }

      if (mapper !== undefined) {
        mappers.set(vpName, mapper)
      }
    }
  })
  return mappers
}

/**
 *
 * Utility function to create new network view
 *
 * @param network Network data to be used to create view model
 * @returns NetworkView network view model
 */
export const createNewNetworkView = (
  network: Network,
  vs: VisualStyle,
  nodeTable: Table,
  edgeTable: Table,
): NetworkView => {
  const mappers = buildMappers(vs)
  return {
    id: network.id,
    values: new Map<VisualPropertyName, VisualPropertyValueType>(),
    nodeViews: nodeViewBuilder(
      network.nodes,
      nodeVisualProperties(vs),
      mappers,
      nodeTable,
    ),
    edgeViews: edgeViewBuilder(
      network.edges,
      edgeVisualProperties(vs),
      mappers,
      edgeTable,
    ),
    selectedNodes: [],
    selectedEdges: [],
  }
}
export const updateNetworkView = (
  network: Network,
  networkView: NetworkView,
  vs: VisualStyle,
  nodeTable: Table,
  edgeTable: Table,
): NetworkView => {
  // Extract positions from the existing network view
  const { nodeViews } = networkView
  const mappers = buildMappers(vs)
  console.log(mappers)

  return {
    id: network.id,
    values: new Map<VisualPropertyName, VisualPropertyValueType>(),
    nodeViews: nodeViewBuilder(
      network.nodes,
      nodeVisualProperties(vs),
      mappers,
      nodeTable,
      nodeViews,
    ),
    edgeViews: edgeViewBuilder(
      network.edges,
      edgeVisualProperties(vs),
      mappers,
      edgeTable,
    ),
    selectedNodes: [],
    selectedEdges: [],
  }
}

const nodeViewBuilder = (
  nodes: Node[],
  visualProps: Array<VisualProperty<VisualPropertyValueType>>,
  mappers: Map<VisualPropertyName, Mapper>,
  nodeTable: Table,
  nodeViews?: Record<IdType, NodeView>,
): Record<IdType, NodeView> => {
  const t1 = performance.now()

  const result: Record<IdType, NodeView> = {}
  const columns: Map<AttributeName, Column> = nodeTable.columns
  let idx: number = nodes.length
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  while (idx--) {
    const node = nodes[idx]
    const nv: NodeView = {
      id: node.id,
      values: computeView(
        node.id,
        visualProps,
        mappers,
        nodeTable.rows.get(node.id) ?? {},
        columns,
      ),
      x: nodeViews !== undefined ? nodeViews[node.id].x : 0,
      y: nodeViews !== undefined ? nodeViews[node.id].y : 0,
    }
    result[nv.id] = nv
  }

  const t2 = performance.now()
  console.log(`##### nodeViewBuilder took ${t2 - t1} milliseconds.`)
  return result
}

const edgeViewBuilder = (
  edges: Edge[],
  visualProps: Array<VisualProperty<VisualPropertyValueType>>,
  mappers: Map<VisualPropertyName, Mapper>,
  edgeTable: Table,
): Record<IdType, EdgeView> => {
  const t1 = performance.now()

  const result: Record<IdType, EdgeView> = {}
  const columns: Map<AttributeName, Column> = edgeTable.columns
  let idx: number = edges.length
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  while (idx--) {
    const edge = edges[idx]
    const ev: EdgeView = {
      id: edge.id,
      values: computeView(
        edge.id,
        visualProps,
        mappers,
        edgeTable.rows.get(edge.id) ?? {},
        columns,
      ),
    }
    result[ev.id] = ev
  }

  const t2 = performance.now()
  console.log(`##### edgeViewBuilder took ${t2 - t1} milliseconds.`)
  return result
}

/**
 *
 * Create actual mapper using D3.js
 *
 * @param cm
 * @param vpType
 * @returns
 */
// const getContinuousMapper = (
//   cm: ContinuousMappingFunction,
//   vpType: VisualPropertyValueTypeName,
// ): Mapper => {
//   const { min, max } = cm

//   // Based on the VP value, crfeate D3 mappers
//   if (vpType === VisualPropertyValueTypeName.Number) {
//     const mapper = d3Scale
//       .scaleLinear()
//       .domain([min.value as number, max.value as number])
//       .range([min.vpValue as number, max.vpValue as number])
//     return mapper as Mapper
//   } else if (vpType === VisualPropertyValueTypeName.Color) {
//     return (attributeValue: ValueType) => {
//       return 'red'
//     }
//   } else {
//     throw new Error('Unsupported VP type')
//   }
// }

/**
 *
 * Compute visual value from attribute value
 * by applying the discrete mapping
 *
 */
export const applyDiscreteMapping = (
  dm: DiscreteMappingFunction,
  attributeValue: ValueType,
  defaultValue: VisualPropertyValueType,
): VisualPropertyValueType => {
  const { vpValueMap } = dm
  return vpValueMap.get(attributeValue) ?? defaultValue
}

/**
 * Passthrough mapping is always an identity function
 */
export const applyPassthroughMapping = (
  attributeValue: ValueType,
): VisualPropertyValueType => attributeValue as VisualPropertyValueType

/**
 * TODO: implement this!!
 *
 * @param cm
 * @param attributeValue
 * @returns
 */
// const applyContinuousMapping = (
//   cm: ContinuousMappingFunction,
//   attributeValue: ValueType,
//   columns: Map<AttributeName, Column>,
//   vpType: VisualPropertyValueTypeName,
// ): VisualPropertyValueType => {
//   const { attribute, controlPoints } = cm
//   // get a mapped value using D3

//   const column: Column | undefined = columns.get(attribute)
//   if (column === undefined) {
//     throw new Error(`Column ${attribute} not found`)
//   }

//   const numPoints: number = controlPoints.length

//   if (numPoints === 0) {
//     throw new Error(`No continuous control points defined for ${attribute}`)
//   }

//   if (numPoints === 1) {
//     return controlPoints[0].vpValue
//   }

//   return getContinuousMapper(cm, vpType)(attributeValue)
// }

// const getMappedValue = (
//   mapping: VisualMappingFunction,
//   attributeValue: ValueType,
//   columns: Map<AttributeName, Column>,
//   vpType: VisualPropertyValueTypeName,
//   defaultValue: VisualPropertyValueType,
//   mapper?: Mapper,
// ): VisualPropertyValueType => {
//   const mappingType: MappingFunctionType = mapping.type

//   if (mappingType === MappingFunctionType.Passthrough) {
//     return applyPassthroughMapping(attributeValue)
//   } else if (mappingType === MappingFunctionType.Discrete) {
//     return applyDiscreteMapping(
//       mapping as DiscreteMappingFunction,
//       attributeValue,
//       defaultValue,
//     )
//   } else if (mappingType === MappingFunctionType.Continuous) {
//     return applyContinuousMapping(
//       mapping as ContinuousMappingFunction,
//       attributeValue,
//       columns,
//       vpType,
//     )
//   }

//   throw new Error('Mapping type not supported')
// }

export const computeView = (
  id: IdType,
  visualProperties: Array<VisualProperty<VisualPropertyValueType>>,
  mappers: Map<AttributeName, Mapper>,
  row: Record<AttributeName, ValueType>,
  columns: Map<AttributeName, Column>,
): Map<VisualPropertyName, VisualPropertyValueType> => {
  const pairs = new Map<VisualPropertyName, VisualPropertyValueType>()

  visualProperties.forEach((vp: VisualProperty<VisualPropertyValueType>) => {
    const { defaultValue, mapping, bypassMap, name } = vp
    const bypass = bypassMap.get(id)
    if (bypass !== undefined) {
      // Bypass is available. Use it
      pairs.set(name, bypass)
    } else if (mapping !== undefined) {
      // Mapping is available.
      // TODO: compute mapping
      const attrName: string = mapping.attribute
      const attributeValueAssigned: ValueType | undefined = row[attrName]

      if (attributeValueAssigned !== undefined) {
        // const computedValue: VisualPropertyValueType = getMappedValue(
        //   mapping,
        //   attributeValueAssigned,
        //   columns,
        //   vp.type,
        //   vp.defaultValue,
        //   mapper.get(vp.name),
        // )
        const mapper: Mapper | undefined = mappers.get(vp.name)
        if (mapper === undefined) {
          throw new Error(
            `Mapping is defined, but Mapper for ${vp.name} is not found`,
          )
        }
        const computedValue: VisualPropertyValueType = mapper(
          attributeValueAssigned,
        )
        pairs.set(name, computedValue)
      } else {
        pairs.set(name, defaultValue)
      }
    } else {
      pairs.set(name, defaultValue)
    }
  })

  return pairs
}
