import {
  AttributeName,
  Table,
  ValueType,
  ValueTypeName,
  Column,
} from '../../models/TableModel'

import { NetworkView } from '../../models/ViewModel'
import { Network } from '../../models/NetworkModel'

import { IdType } from '../../models/IdType'
import VisualStyleFn, {
  VisualStyle,
  VisualPropertyName,
  VisualProperty,
  VisualPropertyValueType,
} from '../../models/VisualStyleModel'

import { translateEdgeIdToCX } from '../../models/NetworkModel/impl/CyNetwork'
import {
  CXVisualMappingFunction,
  cxVisualPropertyConverter,
  CXVisualPropertyValue,
  convertContinuousMappingToCX,
  convertPassthroughMappingToCX,
  convertDiscreteMappingToCX,
  vpToCX,
} from '../../models/VisualStyleModel/impl/cxVisualPropertyConverter'

import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'

import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
} from '../../models/VisualStyleModel/VisualMappingFunction'

import { deserializeValue, isListType } from '../../models/TableModel/impl/ValueTypeImpl'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'

export const exportNetworkToCx2 = (
  network: Network,
  vs: VisualStyle,
  summary: NdexNetworkSummary,
  nodeTable: Table,
  edgeTable: Table,
  visualStyleOptions?: VisualStyleOptions, //visual editor properties
  networkView?: NetworkView,
  networkName?: string, // optional new name for the network
): any => {
  // accumulate node/edge attributes into a object
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
    return cxVisualPropertyConverter[vpName].cxVPName
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

    if (mapping != null) {
      switch (mapping.type) {
        case MappingFunctionType.Continuous: {
          const convertedMapping = convertContinuousMappingToCX(
            vs,
            vp,
            mapping as ContinuousMappingFunction,
          )
          mappings[cxVPName] = convertedMapping
          break
        }
        case MappingFunctionType.Discrete: {
          const convertedMapping = convertDiscreteMappingToCX(
            vs,
            vp,
            mapping as DiscreteMappingFunction,
          )
          mappings[cxVPName] = convertedMapping
          break
        }
        case MappingFunctionType.Passthrough: {
          const convertedMapping = convertPassthroughMappingToCX(
            vs,
            vp,
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

  summary.properties.forEach((property) => {
    networkAttributeDeclarations[property.predicateString] = {
      d: property.dataType,
    }
  })

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

  const networkAttributes: any = [{}]

  if (networkName != null || summary.name != null) {
    networkAttributeDeclarations.name = { d: 'string' }
    networkAttributes[0].name = networkName ?? summary.name
  }

  summary.properties.forEach((property) => {
    networkAttributes[0][property.predicateString] = (isListType(property.dataType) && (!Array.isArray(property.value))) ? deserializeValue(
      networkAttributeDeclarations[property.predicateString].d,
      property.value as string,
    ) : property.value
  })

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
  const visualEditorProperties = [
    {
      properties: {
        nodeSizeLocked: nodeSizeLocked ?? false,
        arrowColorMatchesEdge: arrowColorMatchesEdge ?? false,
      },
    },
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
        node: VisualStyleFn.nodeVisualProperties(vs).reduce(
          vpDefaultsAccumulator,
          {},
        ),
      },
      nodeMapping: VisualStyleFn.nodeVisualProperties(vs)
        .filter((vp) => vp.mapping != null)
        .reduce(vpMappingsAccumulator, {}),
      edgeMapping: VisualStyleFn.edgeVisualProperties(vs)
        .filter((vp) => vp.mapping != null)
        .reduce(vpMappingsAccumulator, {}),
    },
  ]

  const nodeBypasses = Object.entries(
    VisualStyleFn.nodeVisualProperties(vs)
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
  ]

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

export const exportGraph = (
  network: Network
) => {
  const nodes = network.nodes.map((node) => {
    return {
      id: parseInt(node.id)
    }
  })
  const edges = network.edges.map((edge) => {
    const edgeId = parseInt(translateEdgeIdToCX(edge.id))
    const source = parseInt(edge.s)
    const target = parseInt(edge.t)

    return {
      id: edgeId,
      s: source,
      t: target,
    }
  })
  return [
    {'nodes': nodes},
    {'edges': edges}
  ]
}
