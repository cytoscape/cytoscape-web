import * as d3Hierarchy from 'd3-hierarchy'

let originals = new Set()
let aliases = new Set()
const branches = new Map()

/**
 * Takes hierarchy in Cytoscape.js format and generates new D3 tree
 * object
 *
 * @param cyjs
 * @returns {*}
 */
const cyjs2tree = (cyjs, networkActions) => {
  if (!cyjs) {
    return null
  }

  //Find root of the tree
  const nodes = cyjs.elements.nodes
  const edges = cyjs.elements.edges
  let nodeMap = {}
  const root = preprocessNodes(nodes, edges, nodeMap)
  const rootId = root.data.id

  // Create table first to use D3 function
  let table = transform(rootId, edges, nodeMap)

  // Run stratification function
  const tree = d3Hierarchy
    .stratify()
    .id(d => d.id)
    .parentId(d => d.parent)(table)

  table = null
  nodeMap = null

  const geneMap = new Map()
  const duplicates = new Set()

  createGeneMap(tree, geneMap, duplicates)

  // At this point, duplicate nodes does not have children.

  networkActions.setGeneMap(geneMap)

  // Re-wire tree to use reference for copy nodes
  getOriginalBranches(tree)

  // Add it to copies
  addBranches(tree)
  return tree
}

const findRoot = (edges, nodeSet) => {
  let nonRoots = new Set()
  let targets = new Set()

  let idx = edges.length
  while (idx--) {
    const source = edges[idx].data.source
    const target = edges[idx].data.target
    nonRoots.add(source)
    targets.add(target)
  }

  let vals = Array.from(targets)
  let idx2 = vals.length
  let rootId = null
  console.log(nodeSet.size, nonRoots.size)
  while (idx2--) {
    const node = vals[idx2]
    if (!nonRoots.has(node)) {
      rootId = node
      break
    }
  }
  return rootId
}

const createGeneMap = (treeNode, geneMap, duplicates) => {
  const current = treeNode

  const children = current.children

  if (children === undefined) {
    // This is a leaf node

    if (treeNode.data.NodeType === 'Gene') {
      addSelfToAllParents(treeNode.parent, geneMap, treeNode.data.Label)
    } else {
      // This is a link node
      // duplicates.add(treeNode.data.Label)
      // geneMap.set(treeNode.id.toString(), new Set())
    }
    return
  }

  let numChildren = children.length

  while (numChildren--) {
    const childNode = children[numChildren]
    createGeneMap(childNode, geneMap, duplicates)
  }
}

const addSelfToAllParents = (treeNode, geneMap, geneName) => {
  const id = treeNode.data.Label
  let idList = geneMap.get(id)
  if (!idList) {
    idList = new Set()
    geneMap.set(id, idList)
  }

  idList.add(geneName)

  const parent = treeNode.parent
  if (parent === null || parent === undefined || treeNode.parent === '') {
    return
  }

  addSelfToAllParents(parent, geneMap, geneName)
}

const preprocessNodes = (nodes, edges, nodeMap) => {
  let idx = nodes.length

  // Root info is stored in network data
  let root = null

  while (idx--) {
    const node = nodes[idx]
    const data = node.data
    const label = data['Label']
    if (
      (label && !label.includes('Hidden') && !label.includes('Linked')) ||
      !label
    ) {
      const isRoot = data.isRoot
      if (isRoot) {
        root = nodes[idx]
      }

      const isAlias = data.alias
      if (isAlias) {
        originals.add(data.originalId)
        aliases.add(data.id)
      }

      const nodeData = nodes[idx].data
      nodeMap[nodeData.id] = nodeData
    }
  }

  if (root === null || root === undefined) {
    let rootId = findRoot(edges, new Set(Object.keys(nodeMap)))
    if (rootId === null) {
      throw new Error('This data is not a tree.')
    } else {
      root = { data: nodeMap[rootId] }
    }
  }
  return root
}

/**
 * Convert CYJS JSON to table
 * @param rootId
 * @param edges
 * @param nodeMap
 * @returns {Array}
 */
const transform = (rootId, edges, nodeMap) => {
  const table = []

  let rootLabel = nodeMap[rootId].Label
  if (rootLabel === undefined || rootLabel === null) {
    rootLabel = nodeMap[rootId].id
  }

  table.push({
    id: nodeMap[rootId].id,
    Label: rootLabel,
    parent: '',
    props: nodeMap[rootId]
  })

  edges.forEach(edge => {
    const source = nodeMap[edge.data.source]
    const target = nodeMap[edge.data.target]

    if (
      source !== undefined &&
      target !== undefined &&
      nodeMap[source.id] !== undefined &&
      nodeMap[target.id] !== undefined
    ) {
      if (
        edge.data['Is_Tree_Edge'] === 'Tree' ||
        edge.data['Is_Tree_Edge'] === undefined
      ) {
        let label = source.Label
        if (!label) {
          label = ''
        }
        let nodeType = source.NodeType
        if (!nodeType) {
          nodeType = 'Term'
        }

        let size = source.Size
        if (!size) {
          size = source.size
        }

        const node = {
          id: source.id,
          Label: label,
          parent: target.id,
          value: size,
          NodeType: nodeType,
          props: source,
          alias: source.alias
        }

        if (source.originalId) {
          node['originalId'] = source.originalId
        }
        table.push(node)
      }
    }
  })

  return table
}

const getOriginalBranches = node => {
  if (originals.has(node.id)) {
    branches.set(node.id, node)
  }

  const children = node.children
  if (children) {
    let childCount = children.length
    while (childCount--) {
      getOriginalBranches(children[childCount])
    }
  }
}

const addBranches = node => {
  const originalId = node.data.props.originalId
  const alias = node.data.props.alias

  const nodeChildren = node.children
  // if (nodeChildren !== undefined) {
  //   let len = nodeChildren.length
  //   let termFound = false
  //   while (len--) {
  //     const child = nodeChildren[len]
  //     if (child.data.NodeType !== 'Gene') {
  //       termFound = true
  //       break
  //     }
  //   }
  //   if (!termFound) {
  //     delete node.children
  //     return
  //   }
  // }

  // Remove children of gene-only term

  if (alias) {
    const branch = branches.get(originalId)

    // Add this branch only if it has terms inside.
    const children = branch.children
    // if (children !== undefined) {
    //   let numChildren = children.length
    //   let withTerm = false
    //   while (numChildren--) {
    //     const child = children[numChildren]
    //     if (child.data.NodeType !== 'Gene') {
    //       withTerm = true
    //       break
    //     }
    //   }
    //   if (!withTerm) {
    //     return
    //   }
    // }
    node.depth = branch.depth
    node.height = branch.height
    node['children'] = children
    node['data'] = branch.data
    node['id'] = branch.id
  }

  if (nodeChildren) {
    let childCount = nodeChildren.length
    while (childCount--) {
      const child = nodeChildren[childCount]
      addBranches(child)
    }
  }
}

export default cyjs2tree
