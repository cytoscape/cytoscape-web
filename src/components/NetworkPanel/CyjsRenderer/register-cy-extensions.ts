import cytoscape from 'cytoscape'
// @ts-expect-error-next-line
import pdf from 'cytoscape-pdf-export'
// @ts-expect-error-next-line
import svg from 'cytoscape-svg'
export const registerCyExtensions = (): void => {
  cytoscape.use(pdf)
  cytoscape.use(svg)
}
