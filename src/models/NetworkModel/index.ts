/**
 * Network- related  interfaces
 *
 * All public functions should be accessed through the NetworkFn object
 */
import * as NetworkFn from './impl/networkImpl'

export type { NetworkAttributes } from '../TableModel/NetworkAttributes'
export type { Edge } from './Edge'
export type { GraphObject } from './GraphObject'
export { GraphObjectType } from './GraphObjectType'
export type { Network } from './Network'
export type { Node } from './Node'

export { NetworkFn as default }
