import cytoscape from 'cytoscape'
// @ts-expect-error-next-line
import cyCanvas from 'cytoscape-canvas'

export const registerCyExtensions = (): void => {
  cytoscape.use(cyCanvas)
}
