import {
  DiscreteMappingFunction,
  MappingFunctionType,
  NetworkView,
  Table,
  VisualStyle,
} from '../../models'

// Utility type to recursively replace all Map<K, V> with Array<[K, V]>
type ReplaceMapsWithArrayEntries<T> =
  T extends Map<infer K, infer V>
    ? Array<[K, ReplaceMapsWithArrayEntries<V>]>
    : T extends Array<infer U>
      ? Array<ReplaceMapsWithArrayEntries<U>>
      : T extends object
        ? { [P in keyof T]: ReplaceMapsWithArrayEntries<T[P]> }
        : T

// Example: NetworkViewWithRecords has all Maps replaced by Records
export type NetworkViewWithRecords = ReplaceMapsWithArrayEntries<NetworkView>

export type VisualStyleWithRecords = ReplaceMapsWithArrayEntries<VisualStyle>
export type TableWithRecords = ReplaceMapsWithArrayEntries<Table>
export type DiscreteMappingFunctionWithRecords =
  ReplaceMapsWithArrayEntries<DiscreteMappingFunction>

// Utility functions to convert between Map and Array of entries
// These functions are necessary because JavaScript Map objects cannot be directly stored in IndexedDB in Safari.
// IndexedDB in Safari does not support structured cloning of Map objects, so we must convert them to arrays of entries.
export const maptoListEntries = (map: Map<any, any>): Array<[any, any]> => {
  if (!(map instanceof Map)) {
    return []
  }
  return Array.from(map.entries())
}

export const listEntriesToMap = (list: Array<[any, any]>): Map<any, any> => {
  const m = new Map()
  if (Array.isArray(list)) {
    list.forEach(([k, v]) => {
      m.set(k, v)
    })
  }
  return m
}
/**
 * Converts a `NetworkView` object into a serialized format by replacing all `Map` properties
 * with arrays of entries. This is necessary for storing the object in IndexedDB, as `Map` objects
 * are not supported in Safari's IndexedDB implementation.
 *
 * @param networkView - The `NetworkView` object to serialize.
 * @returns A serialized `NetworkView` object with `Map` properties replaced by arrays of entries.
 */
export const serializeNetworkView = (
  networkView: NetworkView,
): NetworkViewWithRecords => {
  return {
    ...networkView,
    nodeViews: Object.fromEntries(
      Object.entries(networkView.nodeViews).map(([k, nv]) => [
        k,
        {
          ...nv,
          values: maptoListEntries(nv.values),
        },
      ]),
    ),
    edgeViews: Object.fromEntries(
      Object.entries(networkView.edgeViews).map(([k, ev]) => [
        k,
        {
          ...ev,
          values: maptoListEntries(ev.values),
        },
      ]),
    ),
    values: maptoListEntries(networkView.values),
  }
}

/**
 * Converts a serialized `NetworkView` object (with arrays of entries) back into its original format
 * by replacing arrays of entries with `Map` objects. This is necessary after retrieving the object
 * from IndexedDB.
 *
 * @param networkView - The serialized `NetworkView` object to deserialize.
 * @returns A deserialized `NetworkView` object with `Map` properties restored.
 */
export const deserializeNetworkView = (
  networkView: NetworkViewWithRecords,
): NetworkView => {
  const deserializedNetworkView = {
    ...networkView,
    nodeViews: Object.fromEntries(
      Object.entries(networkView.nodeViews).map(([k, nv]) => [
        k,
        {
          ...nv,
          values: listEntriesToMap(nv.values),
        },
      ]),
    ),
    edgeViews: Object.fromEntries(
      Object.entries(networkView.edgeViews).map(([k, ev]) => [
        k,
        {
          ...ev,
          values: listEntriesToMap(ev.values),
        },
      ]),
    ),
    values: listEntriesToMap(networkView.values),
  } as NetworkView

  return deserializedNetworkView as NetworkView
}

/**
 * Converts a `VisualStyle` object into a serialized format by replacing all `Map` properties
 * with arrays of entries. This is necessary for storing the object in IndexedDB, as `Map` objects
 * are not supported in Safari's IndexedDB implementation.
 *
 * @param visualStyle - The `VisualStyle` object to serialize.
 * @returns A serialized `VisualStyle` object with `Map` properties replaced by arrays of entries.
 */
export const serializeVisualStyle = (
  visualStyle: VisualStyle,
): VisualStyleWithRecords => {
  const serializedVs = Object.fromEntries(
    Object.entries(visualStyle).map(([k, v]) => {
      const serializedVp = {
        ...v,
        bypassMap: maptoListEntries(v.bypassMap),
        mapping:
          v.mapping?.type === MappingFunctionType.Discrete
            ? {
                ...v.mapping,
                vpValueMap: maptoListEntries(
                  (v.mapping as DiscreteMappingFunction).vpValueMap,
                ),
              }
            : v.mapping,
      }

      return [k, serializedVp]
    }),
  )

  return serializedVs as VisualStyleWithRecords
}

/**
 * Converts a serialized `VisualStyle` object (with arrays of entries) back into its original format
 * by replacing arrays of entries with `Map` objects. This is necessary after retrieving the object
 * from IndexedDB.
 *
 * @param visualStyle - The serialized `VisualStyle` object to deserialize.
 * @returns A deserialized `VisualStyle` object with `Map` properties restored.
 */
export const deserializeVisualStyle = (
  visualStyle: VisualStyleWithRecords,
): VisualStyle => {
  const deserializedVs = Object.fromEntries(
    Object.entries(visualStyle).map(([k, v]) => [
      k,
      {
        ...v,
        mapping:
          v.mapping?.type === MappingFunctionType.Discrete
            ? {
                ...v.mapping,
                vpValueMap: listEntriesToMap((v.mapping as any).vpValueMap),
              }
            : v.mapping,

        bypassMap: listEntriesToMap(v.bypassMap),
      },
    ]),
  )

  return deserializedVs as VisualStyle
}

/**
 * Converts a `Table` object into a serialized format by replacing its `rows` property
 * (a `Map`) with a plain object. This is necessary for storing the object in IndexedDB,
 * as `Map` objects are not supported in Safari's IndexedDB implementation.
 *
 * @param table - The `Table` object to serialize.
 * @returns A serialized `Table` object with the `rows` property replaced by a plain object.
 */
export const serializeTable = (table: Table): TableWithRecords => {
  return {
    ...table,
    rows: maptoListEntries(table.rows),
  }
}

/**
 * Converts a serialized `Table` object (with a plain object for `rows`) back into its original
 * format by replacing the plain object with a `Map`. This is necessary after retrieving the
 * object from IndexedDB.
 *
 * @param table - The serialized `Table` object to deserialize.
 * @returns A deserialized `Table` object with the `rows` property restored as a `Map`.
 */
export const deserializeTable = (table: TableWithRecords): Table => {
  const deserializedTable = {
    ...table,
    rows: listEntriesToMap(table.rows),
  }

  return deserializedTable as Table
}
