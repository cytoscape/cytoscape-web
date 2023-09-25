import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'

export const colorScale: d3Scale.ScaleLinear<string, string> = d3Scale
  .scaleLinear<string>()
  .domain([0, 5])
  .range(['hsl(152,80%,80%)', 'hsl(228,30%,40%)'])
  .interpolate(d3Interpolate.interpolateHcl)
