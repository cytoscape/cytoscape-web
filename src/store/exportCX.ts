import {
  AttributeName,
  Table,
  ValueType,
  ValueTypeName,
  Column,
} from '../models/TableModel'

import { NetworkView } from '../models/ViewModel'
import { Network } from '../models/NetworkModel'

import { IdType } from '../models/IdType'
import {
  VisualStyle,
  VisualPropertyName,
  VisualProperty,
  VisualPropertyValueType,
} from '../models/VisualStyleModel'

import { translateEdgeIdToCX } from '../models/NetworkModel/impl/CyNetwork'
import {
  CXVisualMappingFunction,
  cxVisualPropertyConverter,
  CXVisualPropertyValue,
} from '../models/VisualStyleModel/impl/cxVisualPropertyConverter'
import {
  edgeVisualProperties,
  networkVisualProperties,
  nodeVisualProperties,
} from '../models/VisualStyleModel/impl/VisualStyleImpl'

import {
  convertContinuousMappingToCX,
  convertPassthroughMappingToCX,
  convertDiscreteMappingToCX,
} from '../models/VisualStyleModel/impl/MappingFunctionImpl'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
} from '../models/VisualStyleModel/VisualMappingFunction'

export const exportNetworkToCx2 = (
  network: Network,
  vs: VisualStyle,
  // networkSummary: NdexNetworkSummary,
  nodeTable: Table,
  edgeTable: Table,
  networkView: NetworkView,
): any => {
  //   networkSummary.properties.forEach((property) => {
  // attributeDeclarations[0].networkAttributes[property.predicateString] = {
  //     d: property.dataType,
  //     v: property.value,
  // }
  //   })

  // accumulate node/edge attributes into a object
  const attributesAccumulator = (
    attributes: { [key: AttributeName]: { d: ValueTypeName; v?: ValueType } },
    column: Column,
  ) => {
    attributes[column.name] = {
      d: column.type,
    }

    if (column.defaultValue) {
      attributes[column.name].v = column.defaultValue
    }

    return attributes
  }

  const vpNameToCXName = (vpName: VisualPropertyName): string => {
    return cxVisualPropertyConverter[vpName].cxVPName
  }

  // TODO flesh out CX vp types
  type CXVPName = string

  // accumulate vp defaults for each vp into an object
  const vpDefaultsAccumulator = (
    defaults: { [key: CXVPName]: VisualPropertyValueType },
    vp: VisualProperty<VisualPropertyValueType>,
  ) => {
    const { name, defaultValue } = vp
    const cxVPName = vpNameToCXName(name)
    defaults[cxVPName] = defaultValue
    return defaults
  }

  // accumulate all vp mappings into an object
  const vpMappingsAccumulator = (
    mappings: {
      [key: CXVPName]: CXVisualMappingFunction<CXVisualPropertyValue>
    },
    vp: VisualProperty<VisualPropertyValueType>,
  ) => {
    const { name, mapping } = vp
    const cxVPName = vpNameToCXName(name)

    if (mapping) {
      switch (mapping.type) {
        case MappingFunctionType.Continuous: {
          const convertedMapping = convertContinuousMappingToCX(
            mapping as ContinuousMappingFunction,
          )
          mappings[cxVPName] = convertedMapping
          break
        }
        case MappingFunctionType.Discrete: {
          const convertedMapping = convertDiscreteMappingToCX(
            mapping as DiscreteMappingFunction,
          )
          mappings[cxVPName] = convertedMapping
          break
        }
        case MappingFunctionType.Passthrough: {
          const convertedMapping = convertPassthroughMappingToCX(
            mapping as PassthroughMappingFunction,
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
  ) => {
    const { name, bypassMap } = vp
    const cxVPName = vpNameToCXName(name)

    bypassMap.forEach((value, id) => {
      if (!bypasses[id]) {
        bypasses[id] = {}
      }
      bypasses[id][cxVPName] = value
    })

    return bypasses
  }

  const attributeDeclarations = [
    {
      networkAttributes: {},

      nodeAttributes: Array.from(nodeTable.columns.values()).reduce(
        attributesAccumulator,
        {},
      ),
      edgeAttributes: Array.from(edgeTable.columns.values()).reduce(
        attributesAccumulator,
        {},
      ),
    },
  ]

  const networkAttributes: any = []

  const nodes = network.nodes.map((node) => {
    const nodeRow = nodeTable.rows.get(node.id)

    return {
      id: parseInt(node.id),
      x: networkView.nodeViews[node.id].x,
      y: networkView.nodeViews[node.id].y,
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

  const visualEditorProperties = [
    {
      properties: {
        nodeSizeLocked: false,
      },
    },
  ]

  const visualProperties = [
    {
      default: {
        network: networkVisualProperties(vs).reduce(vpDefaultsAccumulator, {}),
        edge: edgeVisualProperties(vs).reduce(vpDefaultsAccumulator, {}),
        node: nodeVisualProperties(vs).reduce(vpDefaultsAccumulator, {}),
      },
      nodeMapping: nodeVisualProperties(vs)
        .filter((vp) => vp.mapping != null)
        .reduce(vpMappingsAccumulator, {}),
      edgeMapping: edgeVisualProperties(vs)
        .filter((vp) => vp.mapping != null)
        .reduce(vpMappingsAccumulator, {}),
    },
  ]

  const nodeBypasses = Object.entries(
    nodeVisualProperties(vs)
      .filter((vp) => vp.bypassMap.size > 0)
      .reduce(vpBypassesAccumulator, {}),
  ).map(([id, bypassObj]) => {
    return {
      id: parseInt(id),
      v: bypassObj,
    }
  })

  const edgeBypasses = Object.entries(
    edgeVisualProperties(vs)
      .filter((vp) => vp.bypassMap.size > 0)
      .reduce(vpBypassesAccumulator, {}),
  ).map(([id, bypassObj]) => {
    return {
      id: parseInt(translateEdgeIdToCX(id)),
      v: bypassObj,
    }
  })

  const cyTableColumn: any = []
  const cyHiddenAttributes: any = []

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
    { key: 'cyTableColumn', aspect: cyTableColumn },
    { key: 'cyHiddenAttributes', aspect: cyHiddenAttributes },
  ]

  const status = {
    error: '',
    success: true,
  }

  const metaData = aspects.map((aspect) => {
    return {
      name: aspect.key,
      elementCount: aspect.aspect.length,
    }
  })

  return [
    descriptor,
    { metaData },
    ...aspects.map((aspect) => ({ [aspect.key]: aspect.aspect })),
    { status },
  ]
}
