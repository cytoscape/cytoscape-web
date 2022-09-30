import { GraphObject } from './GraphObject'

export interface Node extends GraphObject {
  // Utility function to get human-readable name
  getName?: () => string
}
