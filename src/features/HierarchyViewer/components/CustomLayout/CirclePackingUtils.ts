import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'
import * as d3Hierarchy from 'd3-hierarchy'
import * as d3Selection from 'd3-selection'
import { VisualPropertyValueType } from '../../../../models/VisualStyleModel'
import { CirclePackingView } from '../../model/CirclePackingView'
import { NodeView } from '../../../../models/ViewModel'
import { D3TreeNode } from './D3TreeNode'

// Number of letters to display in the label
const MAX_LABEL_LENGTH = 120
const MAX_LINE_NUMBER = 5
export const LETTERS_PER_LINE: number = MAX_LABEL_LENGTH / MAX_LINE_NUMBER

export const getColorMapper = (
  domain: [number, number],
): d3Scale.ScaleLinear<string, string> => {
  return d3Scale
    .scaleLinear<string>()
    .domain(domain)
    .range(['white', 'rgb(0,220,255)'])
    .interpolate(d3Interpolate.interpolateRgb)
}

export const getFontSize = (
  d: d3Hierarchy.HierarchyCircularNode<D3TreeNode>,
  label: string,
): number => {
  // Width of the area to display the label
  const width = d.r * 2

  const letterCount: number = label.length
  const baseSize: number = width / LETTERS_PER_LINE
  const oneLineSize: number = width / letterCount
  if (oneLineSize > baseSize) {
    return oneLineSize
  } else if (letterCount < MAX_LABEL_LENGTH) {
    return width / (letterCount / MAX_LINE_NUMBER)
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
