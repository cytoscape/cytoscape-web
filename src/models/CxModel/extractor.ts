import { Cx2 } from './Cx2'
import { Aspect } from './Cx2/Aspect'
import {
  NetworkAttributeValue,
  NetworkAttributes,
} from './Cx2/CoreAspects/NetworkAttributes'
import { CoreAspectTag } from './Cx2/CoreAspectTag'
import { CxDescriptor } from './Cx2/CxDescriptor'
import { Node } from './Cx2/CoreAspects/Node'
import { Edge } from './Cx2/CoreAspects/Edge'
import { AttributeDeclarations } from './Cx2/CoreAspects/AttributeDeclarations'
import { VisualProperties } from './Cx2/CoreAspects/VisualProperties'

import { CxValue } from './Cx2/CxValue'
import { Attribute } from './Cx2/CoreAspects/Attribute'
import { NodeBypasses } from './Cx2/CoreAspects/NodeBypasses'
import { EdgeBypasses } from './Cx2/CoreAspects/EdgeBypasses'
import {
  VisualEditorProperties,
  VisualStyleOptions,
} from '../VisualStyleModel/VisualStyleOptions'
import { OpaqueAspects } from '../OpaqueAspectModel/OpaqueAspects'

export const CX_ANNOTATIONS_KEY = '__Annotations'

const getAspect = (cx2: Cx2, aspectTag: string): object[] => {
  const slice: Aspect[] = cx2.slice(1, cx2.length - 1) as Aspect[]

  for (const aspect of slice) {
    const aspectName: string = Object.keys(aspect)[0]
    const aspectValues: object[] = aspect[aspectName]
    if (aspectName === aspectTag) {
      return aspectValues
    }
  }

  return []
}

const getVisualProperties = (cx2: Cx2): VisualProperties => {
  const filtered = cx2.filter((entry) => {
    return entry.hasOwnProperty(CoreAspectTag.VisualProperties)
  })

  if (filtered.length === 0) {
    return {
      visualProperties: [],
    }
  }
  const targetEntry: VisualProperties = filtered[0] as VisualProperties
  return targetEntry
}

const getNodeBypasses = (cx2: Cx2): NodeBypasses => {
  const filtered = cx2.filter((entry) => {
    return entry.hasOwnProperty(CoreAspectTag.NodeBypasses)
  })

  if (filtered.length === 0) {
    return {
      nodeBypasses: [],
    }
  }

  const targetEntry: NodeBypasses = filtered[0] as NodeBypasses
  return targetEntry
}

const getEdgeBypasses = (cx2: Cx2): EdgeBypasses => {
  const filtered = cx2.filter((entry) => {
    return entry.hasOwnProperty(CoreAspectTag.EdgeBypasses)
  })

  if (filtered.length === 0) {
    return {
      edgeBypasses: [],
    }
  }

  const targetEntry: EdgeBypasses = filtered[0] as EdgeBypasses
  return targetEntry
}

const getNetworkAttributes = (cx2: Cx2): NetworkAttributeValue[] => {
  const filtered = cx2.filter((entry) => {
    return entry.hasOwnProperty(CoreAspectTag.NetworkAttributes)
  })

  if (filtered.length === 0) {
    return []
  }

  const targetEntry: NetworkAttributes = filtered[0] as NetworkAttributes
  return targetEntry.networkAttributes
}

const getAttributeDeclarations = (cx2: Cx2): AttributeDeclarations => {
  const filtered = cx2.filter((entry) => {
    return entry.hasOwnProperty(CoreAspectTag.AttributeDeclarations)
  })

  if (filtered.length === 0) {
    return {
      attributeDeclarations: [
        {
          nodes: {},
          edges: {},
          networkAttributes: {},
        },
      ],
    }
  }

  const targetEntry: AttributeDeclarations =
    filtered[0] as AttributeDeclarations

  return targetEntry
}

type ObjType = 'node' | 'edge'

const getAttributes = (
  cx2: Cx2,
  type: ObjType,
): Map<string, Record<string, CxValue>> => {
  let objs: Node[] | Edge[] = []
  if (type === 'node') {
    objs = getNodes(cx2)
  } else if (type === 'edge') {
    objs = getEdges(cx2)
  }

  const attrs = new Map<string, Record<string, CxValue>>()

  objs.forEach((obj: Node | Edge) => {
    const attr: Attribute | undefined = obj.v
    if (attr !== undefined && attr !== null) {
      attrs.set(obj.id.toString(), attr)
    }
  })

  return attrs
}

const getNodes = (cx2: Cx2): Node[] => {
  return getAspect(cx2, CoreAspectTag.Nodes) as Node[]
}

const getNodeAttributes = (cx2: Cx2): Map<string, Record<string, CxValue>> =>
  getAttributes(cx2, 'node')
const getEdgeAttributes = (cx2: Cx2): Map<string, Record<string, CxValue>> =>
  getAttributes(cx2, 'edge')

const getEdges = (cx2: Cx2): Edge[] => {
  return getAspect(cx2, CoreAspectTag.Edges) as Edge[]
}

const getVisualEditorProperties = (cx2: Cx2): VisualStyleOptions => {
  const filtered = cx2.filter((entry) => {
    return entry.hasOwnProperty(CoreAspectTag.VisualEditorProperties)
  })

  const attributeDeclarations =
    getAttributeDeclarations(cx2).attributeDeclarations[0]

  const nodeAttributeNames = Object.keys(attributeDeclarations.nodes || {})
  const edgeAttributeNames = Object.keys(attributeDeclarations.edges || {})

  const nodeColumnConfiguration = nodeAttributeNames.map((attributeName) => ({
    attributeName,
    visible: true,
  }))
  const edgeColumnConfiguration = edgeAttributeNames.map((attributeName) => ({
    attributeName,
    visible: true,
  }))

  if (filtered.length === 0) {
    return {
      visualEditorProperties: {
        nodeSizeLocked: false,
        arrowColorMatchesEdge: false,
        tableDisplayConfiguration: {
          nodeTable: {
            columnConfiguration: nodeColumnConfiguration,
          },
          edgeTable: {
            columnConfiguration: edgeColumnConfiguration,
          },
        },
      },
    }
  }
  const properties = Object.values(
    Object.values(filtered[0])[0][0],
  )[0] as VisualEditorProperties

  // Use the tableDisplayConfiguration from properties if it exists, otherwise use the generated one
  const tableDisplayConfiguration = properties?.tableDisplayConfiguration ?? {
    nodeTable: {
      columnConfiguration: nodeColumnConfiguration,
    },
    edgeTable: {
      columnConfiguration: edgeColumnConfiguration,
    },
  }

  // when a cx network is imported into cytoscape web, ensure that all the node attributes and column attributes
  // are populated in the tabledisplayconfiguration
  nodeAttributeNames.forEach((a) => {
    const attributeFound =
      tableDisplayConfiguration.nodeTable.columnConfiguration.find(
        (c) => c.attributeName === a,
      )

    if (!attributeFound) {
      tableDisplayConfiguration.nodeTable.columnConfiguration.push({
        attributeName: a,
        visible: true,
      })
    }
  })

  edgeAttributeNames.forEach((a) => {
    const attributeFound =
      tableDisplayConfiguration.edgeTable.columnConfiguration.find(
        (c) => c.attributeName === a,
      )

    if (!attributeFound) {
      tableDisplayConfiguration.edgeTable.columnConfiguration.push({
        attributeName: a,
        visible: true,
      })
    }
  })

  return {
    visualEditorProperties: {
      nodeSizeLocked: properties?.nodeSizeLocked ?? false,
      arrowColorMatchesEdge: properties.arrowColorMatchesEdge ?? false,
      tableDisplayConfiguration,
    },
  }
}

/**
 * Extract optional aspects from CX2
 *
 * Filters out core CX2 aspects and returns only optional/custom aspects.
 *
 * @param cx2 - CX2 data object
 * @returns Array of optional Aspects (opaque aspects)
 */
const getOptionalAspects = (cx2: Cx2): OpaqueAspects[] => {
  const CoreAspectTagValueSet = new Set<string>(
    Object.values(CoreAspectTag) as string[],
  )
  const optionalAspects: OpaqueAspects[] = []
  for (const entry of cx2) {
    if (entry !== undefined) {
      const key = Object.keys(entry)[0]
      if (
        !CoreAspectTagValueSet.has(key) &&
        key !== 'status' &&
        key !== 'CXVersion'
      ) {
        optionalAspects.push(entry as OpaqueAspects)
      }
    }
  }
  return optionalAspects
}

export {
  getNodes,
  getEdges,
  getNetworkAttributes,
  getAttributeDeclarations,
  getNodeAttributes,
  getEdgeAttributes,
  getVisualProperties,
  getNodeBypasses,
  getEdgeBypasses,
  getVisualEditorProperties,
  getOptionalAspects,
}
