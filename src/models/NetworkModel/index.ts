/**
 * Network- related  interfaces
 *
 * All public functions should be accessed through the NetworkFn object
 */
import * as NetworkFn from './impl/CyNetwork'

export { Network } from './Network'
export { Edge } from './Edge'
export { Node } from './Node'
export { GraphObject } from './GraphObject'
export { NetworkAttributes } from '../TableModel/NetworkAttributes'

export { NetworkFn as default }
