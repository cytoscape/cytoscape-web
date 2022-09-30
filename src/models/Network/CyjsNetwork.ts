import { Network } from '.'
import { NetworkModel } from './NetworkModel'

export class CyjsNetwork extends Network {
  
  private _cyjs: any // This is the Cytoscape.js instance

  constructor(model: NetworkModel) {
    super(model)
  }

  // Add more functions here...
}
