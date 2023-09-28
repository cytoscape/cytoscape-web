import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'

export const colorScale: d3Scale.ScaleLinear<string, string> = d3Scale
  .scaleLinear<string>()
  .domain([0, 10])
  .range(['rgba(250, 250, 250, 10)', 'rgba(200,200,200, 10)'])
  .interpolate(d3Interpolate.interpolateHcl)
