import {
  DiscreteMappingFunction,
  MappingFunctionType,
  NetworkView,
  Table,
  VisualStyle,
} from '../../models'

// Utility type to recursively replace all Map<K, V> with Record<K & string, V>
type ReplaceMapsWithRecords<T> =
  T extends Map<infer K, infer V>
    ? Record<K & string, ReplaceMapsWithRecords<V>>
    : T extends Array<infer U>
      ? Array<ReplaceMapsWithRecords<U>>
      : T extends object
        ? { [P in keyof T]: ReplaceMapsWithRecords<T[P]> }
        : T

// Example: NetworkViewWithRecords has all Maps replaced by Records
export type NetworkViewWithRecords = ReplaceMapsWithRecords<NetworkView>

export type VisualStyleWithRecords = ReplaceMapsWithRecords<VisualStyle>
export type TableWithRecords = ReplaceMapsWithRecords<Table>
export type DiscreteMappingFunctionWithRecords =
  ReplaceMapsWithRecords<DiscreteMappingFunction>

// Utility functions to convert between Map and Object
// These functions are necessary because JavaScript Map objects cannot be directly stored in IndexedDB in Safari.
// IndexedDB in Safari does not support structured cloning of Map objects, so we must convert them to plain objects.
export const mapToObject = (map: Map<any, any>): Record<any, any> => {
  if (!(map instanceof Map)) {
    return map
  }
  return Object.fromEntries(map.entries())
}

export const objectToMap = (obj: Record<any, any>): Map<string, any> => {
  return new Map(Object.entries(obj ?? {}))
}
/**
 * Converts a `NetworkView` object into a serialized format by replacing all `Map` properties
 * with plain objects. This is necessary for storing the object in IndexedDB, as `Map` objects
 * are not supported in Safari's IndexedDB implementation.
 *
 * @param networkView - The `NetworkView` object to serialize.
 * @returns A serialized `NetworkView` object with `Map` properties replaced by plain objects.
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
          values: mapToObject(nv.values),
        },
      ]),
    ),
    edgeViews: Object.fromEntries(
      Object.entries(networkView.edgeViews).map(([k, ev]) => [
        k,
        {
          ...ev,
          values: mapToObject(ev.values),
        },
      ]),
    ),
    values: mapToObject(networkView.values),
  }
}

/**
 * Converts a serialized `NetworkView` object (with plain objects) back into its original format
 * by replacing plain objects with `Map` objects. This is necessary after retrieving the object
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
          values: new Map(Object.entries(nv.values)),
        },
      ]),
    ),
    edgeViews: Object.fromEntries(
      Object.entries(networkView.edgeViews).map(([k, ev]) => [
        k,
        {
          ...ev,
          values: new Map(Object.entries(ev.values)),
        },
      ]),
    ),
    values: new Map(Object.entries(networkView.values)),
  } as NetworkView

  return deserializedNetworkView as NetworkView
}

/**
 * Converts a `VisualStyle` object into a serialized format by replacing all `Map` properties
 * with plain objects. This is necessary for storing the object in IndexedDB, as `Map` objects
 * are not supported in Safari's IndexedDB implementation.
 *
 * @param visualStyle - The `VisualStyle` object to serialize.
 * @returns A serialized `VisualStyle` object with `Map` properties replaced by plain objects.
 */
export const serializeVisualStyle = (
  visualStyle: VisualStyle,
): VisualStyleWithRecords => {
  const serializedVs = Object.fromEntries(
    Object.entries(visualStyle).map(([k, v]) => {
      const serializedVp = {
        ...v,
        bypassMap: mapToObject(v.bypassMap),
        mapping:
          v.mapping?.type === MappingFunctionType.Discrete
            ? {
                ...v.mapping,
                vpValueMap: mapToObject(
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
 * Converts a serialized `VisualStyle` object (with plain objects) back into its original format
 * by replacing plain objects with `Map` objects. This is necessary after retrieving the object
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
                vpValueMap: new Map(
                  Object.entries(
                    (v.mapping as DiscreteMappingFunction).vpValueMap,
                  ),
                ),
              }
            : v.mapping,

        bypassMap: new Map(Object.entries(v.bypassMap)),
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
    rows: mapToObject(table.rows),
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
    rows: objectToMap(table.rows),
  }

  return deserializedTable as Table
}
