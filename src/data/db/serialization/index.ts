/**
 * Serialization utilities for IndexedDB operations.
 *
 * This module provides serialization functions to convert complex JavaScript objects
 * into formats that can be safely stored in IndexedDB.
 *
 * ## Map Serialization
 * Converts Map objects to arrays of entries (required for Safari IndexedDB compatibility).
 * See `mapSerialization.ts` for:
 * - `serializeTable`, `deserializeTable`
 * - `serializeNetworkView`, `deserializeNetworkView`
 * - `serializeVisualStyle`, `deserializeVisualStyle`
 * - `serializeFilterConfig`, `deserializeFilterConfig`
 *
 * ## Immer Serialization
 * Converts Immer proxies to plain objects (required for Zustand state persistence).
 * See `immerSerialization.ts` for:
 * - `toPlainObject` - Converts Immer proxies and other objects to plain objects
 */

// Map serialization (Map → Array conversions)
export * from './mapSerialization'

// Immer serialization (Immer proxy → plain object)
export { toPlainObject } from './immerSerialization'

