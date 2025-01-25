import cytoscape from 'cytoscape'
// @ts-expect-error-next-line
import pdf from 'cytoscape-pdf-export'
// @ts-expect-error-next-line
import svg from 'cytoscape-svg'
// @ts-expect-error-next-line
import cyCanvas from 'cytoscape-canvas'

export const registerCyExtensions = (): void => {
  cytoscape.use(pdf)
  cytoscape.use(svg)
  cytoscape.use(cyCanvas)
}
