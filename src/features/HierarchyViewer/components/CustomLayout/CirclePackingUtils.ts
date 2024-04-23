import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'
import * as d3Hierarchy from 'd3-hierarchy'
import { VisualPropertyValueType } from '../../../../models/VisualStyleModel'
import { CirclePackingView } from '../../model/CirclePackingView'
import { NodeView } from '../../../../models/ViewModel'

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
  d: d3Hierarchy.HierarchyCircularNode<any>,
): number => {
  return (d.r / 80) * 20
}

export const toCenter = (
  svg: any,
  dimensions: { width: number; height: number },
): void => {
  const centerX = dimensions.width / 2
  const centerY = dimensions.height / 2
  // Get the radius of the circle
  const radius = svg.select('circle').attr('r')

  const adjustedX = centerX - radius
  const adjustedY = centerY - radius

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

  if (label === undefined || label === '') {
    return defaultName
  }
  return label.toString()
}
