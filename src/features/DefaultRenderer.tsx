import { Network } from '../models/NetworkModel'
import { DEFAULT_RENDERER_ID } from '../models/RendererModel/impl/defaultRenderer'
import { Renderer } from '../models/RendererModel/Renderer'
import { CyjsRenderer } from './NetworkPanel/CyjsRenderer/CyjsRenderer'

/**
 * Default renderer for node-link diagrams based on Cytoscape.js
 * wrapped in the common renderer interface
 */
export const DefaultRenderer: Renderer = {
  id: DEFAULT_RENDERER_ID,
  name: 'Network View',
  description: 'Node-link diagram renderer based on Cytoscape.js',
  getComponent: (
    networkData: Network,
    initialSize?: { w: number; h: number },
    visible?: boolean,
    hasTab?: boolean,
  ) => <CyjsRenderer network={networkData} hasTab={hasTab} />,
}
