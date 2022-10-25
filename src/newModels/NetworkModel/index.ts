/**
 * Network interface
 *
 * All public functions should be accessed through the NetworkFn object
 *
 */
export { Network } from './Network'
export { Edge } from './Edge'
export { Node } from './Node'
export { GraphObject } from './GraphObject'

export { NetworkAttributes } from './NetworkAttributes'

import * as NetworkFn from './impl/CyNetwork'
export { NetworkFn as default }
