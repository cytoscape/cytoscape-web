/**
 * Network- related  interfaces
 *
 * All public functions should be accessed through the NetworkFn object
 */
import * as NetworkFn from './impl/networkImpl'

export { NetworkAttributes } from '../TableModel/NetworkAttributes'
export { Edge } from './Edge'
export { GraphObject } from './GraphObject'
export { GraphObjectType } from './GraphObjectType'
export { Network } from './Network'
export { Node } from './Node'

export { NetworkFn as default }
