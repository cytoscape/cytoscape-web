import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'
import * as d3Hierarchy from 'd3-hierarchy'
import * as d3Selection from 'd3-selection'
import { VisualPropertyValueType } from '../../../../models/VisualStyleModel'
import { CirclePackingView } from '../../model/CirclePackingView'
import { NodeView } from '../../../../models/ViewModel'
import { D3TreeNode } from './D3TreeNode'
import { IdType } from '../../../../models/IdType'
import { find } from 'lodash'

// Number of letters to display in the label
const MAX_LABEL_LENGTH = 90
const MAX_LINE_NUMBER = 6
export const LETTERS_PER_LINE: number = MAX_LABEL_LENGTH / MAX_LINE_NUMBER

const SCALING_FACTOR = 1.15

const ROOT_COLOR = '#E5FBFF'
const LEAF_COLOR = 'rgb(0,220,255)'

export const getColorMapper = (
  domain: [number, number],
): d3Scale.ScaleLinear<string, string> => {
  return d3Scale
    .scaleLinear<string>()
    .domain(domain)
    .range([ROOT_COLOR, LEAF_COLOR])
    .interpolate(d3Interpolate.interpolateRgb)
}

export const getFontSize = (
  d: d3Hierarchy.HierarchyCircularNode<D3TreeNode>,
  label: string,
): number => {
  // Width of the area to display the label
  const width = d.r * 2 * SCALING_FACTOR

  const letterCount: number = label.length
  const baseSize: number = width / LETTERS_PER_LINE
  const oneLineSize: number = width / letterCount
  if (oneLineSize > baseSize) {
    return oneLineSize
  } else {
    return baseSize
  }
}

export const toCenter = (
  svg: any,
  dimensions: { width: number; height: number },
): void => {
  const centerX = dimensions.width / 2
  const centerY = dimensions.height / 2
  // Get the radius of the circle
  const radius = svg.select('circle').attr('r')

  let adjustedX = centerX - radius
  let adjustedY = centerY - radius

  if (dimensions.height > dimensions.width) {
    adjustedY = 0
  } else {
    adjustedX = 0
  }
  svg.attr('transform', `translate(${adjustedX}, ${adjustedY})`)
}

export const getLabel = (
  nodeId: string,
  cpView: CirclePackingView,
  defaultName: string,
): string => {
  let label: VisualPropertyValueType = ''
  const nodeViews = cpView.nodeViews
  if (nodeViews !== undefined) {
    const nv: NodeView = nodeViews[nodeId]
    if (nv !== undefined) {
      label = nv.values.get('nodeLabel') as VisualPropertyValueType
    }
  }

  let actualLabel = label
  if (label === undefined || label === '') {
    if (defaultName === undefined || defaultName === '') {
      actualLabel = ''
    } else {
      actualLabel = defaultName.toString()
    }
  } else {
    actualLabel = label.toString()
  }

  if (actualLabel.length > MAX_LABEL_LENGTH) {
    actualLabel = actualLabel.substring(0, MAX_LABEL_LENGTH) + '...'
  }

  return actualLabel
}

/**
 * Convert space separated label to multiple lines
 *
 * @param label
 */
const toLines = (label: string): string[] => {
  const lines: string[] = []

  const spaceSeparated = label.split(' ')
  // One word label
  if (spaceSeparated.length === 1) {
    return [label]
  }

  let currentString: string = spaceSeparated[0]

  for (let i = 1; i < spaceSeparated.length; i++) {
    const word = spaceSeparated[i]
    const joinedString = currentString + ', ' + word
    if (joinedString.length <= LETTERS_PER_LINE) {
      currentString += ', ' + word
    } else {
      lines.push(currentString)
      currentString = word
    }
  }
  if (currentString !== '') {
    lines.push(currentString)
  }

  return lines
}

const toMultiWordLines = (entries: string[]): string[] => {
  const lines: string[] = []

  let currentLine: string = ''

  entries.forEach((entry: string) => {
    const words = entry.split(' ')
    if (words.length === 1) {
      // One word entry
      currentLine += words[0]
    } else {
      currentLine += words[0]
      for (let i = 1; i < words.length; i++) {
        const word = words[i]
        if ((currentLine + ' ' + word).length <= LETTERS_PER_LINE) {
          // Add space if not the last word
          currentLine += ' ' + word
        } else {
          lines.push(currentLine)
          currentLine = word
        }
      }
    }

    // Add comma if not the last entry
    if (entry !== entries[entries.length - 1]) {
      currentLine += ', '
    }
    if (currentLine.length > LETTERS_PER_LINE) {
      lines.push(currentLine)
      currentLine = ''
    }
  })
  if (currentLine !== '') {
    lines.push(currentLine)
  }
  return lines
}

const separator = /[,|]+/
export const getWordLines = (label: string): string[] => {
  // 1. First try separator to split the label
  const entries: string[] = label.split(separator)
  if (entries.length === 1) {
    // No separator found. Try Split by space
    return toLines(label)
  } else {
    return toMultiWordLines(entries)
  }
}

/**
 * Default styling values
 *
 */
export const CpDefaults = {
  borderColor: '#666',
  selectedBorderColor: 'orange',
  leafBorderColor: 'red',
  borderWidth: 0.05,
  borderWidthHover: 1,
} as const

export const displaySelectedNodes = (
  selectedNodeSet: Set<string>,
  selectedLeaf: string,
) => {
  d3Selection
    .select('.circle-packing-wrapper')
    .selectAll('circle')
    .attr('stroke', (d: d3Hierarchy.HierarchyCircularNode<D3TreeNode>) => {
      if (selectedNodeSet.has(d.data.id)) {
        return CpDefaults.selectedBorderColor
      } else if (d.data.name === selectedLeaf) {
        return CpDefaults.leafBorderColor
      } else {
        return CpDefaults.borderColor
      }
    })
    .attr('stroke-width', (d: d3Hierarchy.HierarchyCircularNode<D3TreeNode>) =>
      selectedNodeSet.has(d.data.id) ||
      d.data.id === selectedLeaf ||
      d.data.name === selectedLeaf
        ? CpDefaults.borderWidthHover
        : CpDefaults.borderWidth,
    )
}

/**
 * Find the node in the D3 hierarchy
 *
 * @param id target node id
 * @param root Root of the hierarchy
 *
 * @returns The D3 hierarchy node if found, otherwise undefined
 */
export const findHierarchyNode = (
  id: IdType,
  node: d3Hierarchy.HierarchyCircularNode<D3TreeNode>,
): d3Hierarchy.HierarchyCircularNode<D3TreeNode> | undefined => {
  const nodeId: IdType = node.data.id
  if (nodeId === id) {
    return node
  }

  const children = node.children
  if (children !== undefined && children.length > 0) {
    for (const child of children) {
      const found = findHierarchyNode(id, child)
      if (found !== undefined && found.data.id === id) {
        return found
      }
    }
  }
  return undefined // Not found
}

export const getCircleDimension = (
  id: IdType,
  root: d3Hierarchy.HierarchyCircularNode<D3TreeNode>,
): [number, number, number] => {
  const node: d3Hierarchy.HierarchyCircularNode<D3TreeNode> | undefined =
    findHierarchyNode(id, root)
  if (node === undefined) {
    return [0, 0, 0]
  }

  return [node.r, node.x, node.y]
}
