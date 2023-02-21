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

  const networkAttributes: any = {}

  const convertAttributes = (
    acc: { [key: AttributeName]: { d: ValueTypeName; v?: ValueType } },
    column: Column,
  ) => {
    acc[column.name] = {
      d: column.type,
    }

    if (column.defaultValue) {
      acc[column.name].v = column.defaultValue
    }

    return acc
  }

  const nodeAttributes: any = Array.from(nodeTable.columns.values()).reduce(
    convertAttributes,
    {},
  )

  const edgeAttributes: any = Array.from(edgeTable.columns.values()).reduce(
    convertAttributes,
    {},
  )

  const attributeDeclarations = [
    {
      networkAttributes,
      nodeAttributes,
      edgeAttributes,
    },
  ]

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

  const vpNameToCXName = (vpName: VisualPropertyName): string => {
    return cxVisualPropertyConverter[vpName].cxVPName
  }

  // TODO flesh out CX vp types
  type CXVPName = string

  const populateDefaults = (
    acc: { [key: CXVPName]: VisualPropertyValueType },
    vp: VisualProperty<VisualPropertyValueType>,
  ) => {
    const { name, defaultValue } = vp
    const cxVPName = vpNameToCXName(name)
    acc[cxVPName] = defaultValue
    return acc
  }

  const networkDefaultVps = networkVisualProperties(vs).reduce(
    populateDefaults,
    {},
  )
  const edgeDefaultVps = edgeVisualProperties(vs).reduce(populateDefaults, {})

  const nodeDefaultVps = nodeVisualProperties(vs).reduce(populateDefaults, {})

  const populateMapping = (
    acc: { [key: CXVPName]: CXVisualMappingFunction<CXVisualPropertyValue> },
    vp: VisualProperty<VisualPropertyValueType>,
  ) => {
    const { name, mapping } = vp
    const cxVPName = vpNameToCXName(name)

    if (mapping) {
      switch (mapping.type) {
        case 'continuous': {
          // TODO use the enum instead of hard coded string
          const convertedMapping = convertContinuousMappingToCX(
            mapping as ContinuousMappingFunction,
          )
          acc[cxVPName] = convertedMapping
          break
        }
        case 'discrete': {
          const convertedMapping = convertDiscreteMappingToCX(
            mapping as DiscreteMappingFunction,
          )
          acc[cxVPName] = convertedMapping
          break
        }
        case 'passthrough': {
          const convertedMapping = convertPassthroughMappingToCX(
            mapping as PassthroughMappingFunction,
          )
          acc[cxVPName] = convertedMapping
          break
        }
      }
    }
    return acc
  }

  const nodeMapping = nodeVisualProperties(vs)
    .filter((vp) => vp.mapping != null)
    .reduce(populateMapping, {})

  const edgeMapping = edgeVisualProperties(vs)
    .filter((vp) => vp.mapping != null)
    .reduce(populateMapping, {})

  const visualProperties = {}

  const populateBypasses = (
    acc: { [key: IdType]: { [key: CXVPName]: CXVisualPropertyValue } },
    vp: VisualProperty<VisualPropertyValueType>,
  ) => {
    const { name, bypassMap } = vp
    const cxVPName = vpNameToCXName(name)

    bypassMap.forEach((value, id) => {
      if (!acc[id]) {
        acc[id] = {}
      }
      acc[id][cxVPName] = value
    })

    return acc
  }

  const nodeBypasses = Object.entries(
    nodeVisualProperties(vs)
      .filter((vp) => vp.bypassMap.size > 0)
      .reduce(populateBypasses, {}),
  ).map(([id, bypassObj]) => {
    return {
      id: parseInt(id),
      v: bypassObj,
    }
  })

  const edgeBypasses = Object.entries(
    edgeVisualProperties(vs)
      .filter((vp) => vp.bypassMap.size > 0)
      .reduce(populateBypasses, {}),
  ).map(([id, bypassObj]) => {
    return {
      id: parseInt(translateEdgeIdToCX(id)),
      v: bypassObj,
    }
  })

  return [
    {
      CXVersion: '2.0',
      hasFragments: false,
    },
    {
      metaData: [],
    },
    {
      attributeDeclarations,
    },
    {
      networkAttributes: [],
    },
    {
      nodes,
    },
    { edges },

    {
      visualEditorProperties: [
        {
          properties: {
            nodeSizeLocked: false,
          },
        },
      ],
    },
    { cyTableColumn: [] },
    { cyHiddenAttributes: [] },
    { visualProperties },
    { nodeBypasses },
    { edgeBypasses },
    {
      status: {
        error: '',
        success: true,
      },
    },
  ]
}
