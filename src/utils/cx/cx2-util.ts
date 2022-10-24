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

const getEdges = (cx2: Cx2): Edge[] => {
  return getAspect(cx2, CoreAspectTag.Edges) as Edge[]
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
}
