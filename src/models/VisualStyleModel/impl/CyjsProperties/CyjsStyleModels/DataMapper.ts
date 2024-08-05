import { VisualPropertyName } from '../../../VisualPropertyName'

/**
 * Only this mapping type is supported
 * (direct mapping from data to visual property)
 *
 * In this type, Visual Property names are NOT Cytoscape.js ones.
 */
export type DataMapper = `data(${VisualPropertyName})` | `data(${string})`
