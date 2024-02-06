import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'

export const getColorMapper = (
  domain: [number, number],
): d3Scale.ScaleLinear<string, string> => {
  return d3Scale
    .scaleLinear<string>()
    .domain(domain)
    .range(['white', 'rgb(0,220,255)'])
    .interpolate(d3Interpolate.interpolateRgb)
}
