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
    // If both fail, log and return a safe copy using manual deep copy
    logDb.warn('[toPlainObject] Failed to clone object, using fallback:', e)
    // Manual deep copy as last resort (with cycle detection)
    return manualDeepCopy(obj, new WeakSet())
  }
}

// Helper function for manual deep copy with cycle detection
const manualDeepCopy = <T>(obj: T, visited: WeakSet<object>): T => {
  if (obj === null || typeof obj !== 'object') {
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
      plain[key] = manualDeepCopy((obj as any)[key], visited)
    }
  }
  return plain
}
