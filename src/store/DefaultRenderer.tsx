import { CyjsRenderer } from "../components/NetworkPanel/CyjsRenderer";
import { Network } from "../models/NetworkModel";
import { Renderer } from "../models/RendererModel/Renderer";

/**
 * Default renderer for node-link diagrams based on Cytoscape.js 
 * wrapped in the common renderer interface
 */
export const DefaultRenderer: Renderer = {
  id: 'cyjs',
  name: 'Network View',
  description: 'Node-link diagram renderer based on Cytoscape.js',
  getComponent: (networkData: Network) => (
    <CyjsRenderer network={networkData} />
  ),
}