import { logDb } from '../../../debug'

/**
 * Converts an object to a plain object, handling Immer proxies and other non-serializable types.
 * This is necessary because Immer proxies cannot be serialized to IndexedDB.
 *
 * Uses `structuredClone` when available (modern browsers), which correctly handles:
 * - Immer proxies
 * - Circular references (with limitations)
 * - Typed arrays, Maps, Sets, Dates, etc.
 *
 * Falls back to JSON serialization for older browsers, which handles:
 * - Plain objects and arrays
 * - Primitives
 * - Dates (as strings)
 *
 * As a last resort, performs a manual deep copy for edge cases.
 *
 * @param obj - The object to convert to a plain object
 * @returns A plain object with all proxies converted to plain objects, suitable for IndexedDB serialization
 *
 * @example
 * ```typescript
 * import { toPlainObject } from '../db/serialization'
 *
 * const immerProxy = get().someState // Immer proxy from Zustand
 * const plainObject = toPlainObject(immerProxy) // Safe to serialize
 * await putToDb(plainObject)
 * ```
 */
export const toPlainObject = <T>(obj: T): T => {
  try {
    // Use structuredClone if available (modern browsers) - handles proxies correctly
    if (typeof structuredClone !== 'undefined') {
      return structuredClone(obj)
    }
    // Fallback to JSON serialization for older browsers
    return JSON.parse(JSON.stringify(obj))
  } catch (e) {
    // structuredClone fails for objects with functions, symbols, or other non-cloneable types
    // This is expected for some objects (e.g., Network with Cytoscape.js internals, objects with functions)
    // Use manual deep copy which skips functions and non-serializable properties
    const isDataCloneError =
      e instanceof Error &&
      (e.name === 'DataCloneError' ||
        e.message?.includes('could not be cloned') ||
        e.message?.includes('structuredClone'))

    if (!isDataCloneError) {
      // Only log unexpected errors, not expected DataCloneError
      logDb.warn('[toPlainObject] Failed to clone object, using fallback:', e)
    }
    // Manual deep copy as last resort (with cycle detection, skips functions)
    return manualDeepCopy(obj, new WeakSet())
  }
}

// Helper function for manual deep copy with cycle detection
// Skips functions and other non-serializable types
const manualDeepCopy = <T>(obj: T, visited: WeakSet<object>): T => {
  if (obj === null) {
    return obj
  }
  // Skip functions - they cannot be serialized
  if (typeof obj === 'function') {
    return undefined as unknown as T
  }
  if (typeof obj !== 'object') {
    return obj
  }
  // Handle circular references
  if (visited.has(obj as object)) {
    // Return a placeholder to break the cycle
    return {} as T
  }
  visited.add(obj as object)
  if (Array.isArray(obj)) {
    return obj.map((item) => manualDeepCopy(item, visited)) as unknown as T
  }
  const plain: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as any)[key]
      // Skip functions and symbols
      if (typeof value === 'function' || typeof value === 'symbol') {
        continue
      }
      // Skip internal Cytoscape.js properties that contain functions
      if (key === '_store' || key === '_private' || key.startsWith('_')) {
        continue
      }
      plain[key] = manualDeepCopy(value, visited)
    }
  }
  return plain
}
