import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'

export const colorScale: d3Scale.ScaleLinear<string, string> = d3Scale
  .scaleLinear<string>()
  .domain([0, 5])
  .range(['hsl(175,100%,60%)', 'hsl(255,100%,60%)'])
  .interpolate(d3Interpolate.interpolateHcl)
