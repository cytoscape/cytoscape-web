import { Cx2 } from './Cx2'
import { Aspect } from './Cx2/Aspect'
import {
  NetworkAttributeValue,
  NetworkAttributes,
} from './Cx2/CoreAspects/NetworkAttributes'
import { CoreAspectTag } from './Cx2/CoreAspectTag'
import { CxDescriptor } from './Cx2/CxDescriptor'
import { NiceCx } from './Cx2/NiceCx'
import { Node } from './Cx2/CoreAspects/Node'
import { Edge } from './Cx2/CoreAspects/Edge'
import { Cx2Network } from './Cx2Network'
import { MetaData, MetaDataValue } from './Cx2/MetaData'
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

export const CX_ANNOTATIONS_KEY = '__Annotations'

const isAspect = (aspect: Aspect | CxDescriptor): boolean => {
  const keys = Object.keys(aspect)
  if (keys.length === 1) {
    return true
  }
  return false
}

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

const getMetaData = (cx2: Cx2): MetaDataValue[] => {
  const filtered = cx2.filter((entry) => {
    return entry.hasOwnProperty(CoreAspectTag.MetaData)
  })

  if (filtered.length === 0) {
    return []
  }

  // TODO: multiple MetaData aspects?
  const targetEntry: MetaData = filtered[0] as MetaData
  return targetEntry.metaData
}

const getNodes = (cx2: Cx2): Node[] => {
  return getAspect(cx2, CoreAspectTag.Nodes) as Node[]
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

  if (filtered.length === 0) {
    return {
      visualEditorProperties: {
        nodeSizeLocked: false,
        arrowColorMatchesEdge: false,
      },
    }
  }
  const properties = Object.values(
    Object.values(filtered[0])[0][0],
  )[0] as VisualEditorProperties
  return {
    visualEditorProperties: {
      nodeSizeLocked: properties?.nodeSizeLocked ?? false,
      arrowColorMatchesEdge: properties.arrowColorMatchesEdge ?? false,
    },
  }
}

const toCx2Network = (cx2: Cx2): Cx2Network => {
  const networkAttributes: NetworkAttributeValue = {
    name: '',
    description: '',
    version: '',
  }

  const cx2Network: Cx2Network = {
    networkAttributes,
    nodes: {},
    edges: {},
  }

  cx2.forEach((fragment: CxDescriptor | Aspect) => {
    if (isAspect(fragment)) {
      const aspect = fragment as Aspect
      const aspectName: string = Object.keys(aspect)[0]
      const aspectValues: object[] = aspect[aspectName]

      if (aspectName === CoreAspectTag.Nodes) {
        const nodes: Node[] = aspectValues as Node[]
        nodes.forEach((node: Node) => {
          cx2Network.nodes[node.id] = node
        })
      } else if (aspectName === CoreAspectTag.Edges) {
        const edges: Edge[] = aspectValues as Edge[]
        edges.forEach((edge: Edge) => {
          cx2Network.edges[edge.id] = edge
        })
      } else if (aspectName === CoreAspectTag.NetworkAttributes) {
        cx2Network.networkAttributes = aspectValues[0] as NetworkAttributeValue
      } else {
        // cx2Network.opaqueAspects.set(aspectName, aspectValues)
        cx2Network[aspectName] = aspectValues
      }
    }
  })

  return cx2Network
}

const toNiceCx = (cx2: Cx2): NiceCx => {
  const niceCx: NiceCx = {}

  cx2.forEach((fragment: CxDescriptor | Aspect) => {
    if (isAspect(fragment)) {
      const aspect = fragment as Aspect
      const aspectName: string = Object.keys(aspect)[0]
      const aspectValues: object[] = aspect[aspectName]
      niceCx[aspectName] = aspectValues
    }
  })

  return niceCx
}

export {
  toNiceCx,
  toCx2Network,
  getNodes,
  getEdges,
  getMetaData,
  getNetworkAttributes,
  getAttributeDeclarations,
  getNodeAttributes,
  getEdgeAttributes,
  getVisualProperties,
  getNodeBypasses,
  getEdgeBypasses,
  getVisualEditorProperties,
}
