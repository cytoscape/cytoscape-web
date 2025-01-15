import { IdType } from '../../models'
import { GraphObjectType } from '../../models/NetworkModel'

// Define a unique key to store the generator on the global object
const GLOBAL_KEY = '__CYWEB_ID_GENERATOR__'
const globalScope: any = globalThis

if (!globalScope[GLOBAL_KEY]) {
  globalScope[GLOBAL_KEY] = (function* () {
    let id = 0
    while (true) {
      yield id++
    }
  })()
}

// Retrieve the singleton from the global scope
const idGenerator: Generator<number, number, unknown> = globalScope[GLOBAL_KEY]

/**
 * Get a unique ID for the given object type.
 * Guaranteed unique as long as this code runs in one JS runtime
 * and references this global generator.
 *
 * @param type The type of the ID (e.g., node or edge).
 * @returns A unique string ID.
 */
export const getId = (type: GraphObjectType): IdType => {
  const nextVal = idGenerator.next().value.toString()
  return type === GraphObjectType.NODE ? nextVal : 'e' + nextVal
}
