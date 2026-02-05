import {
  DiscreteMappingFunction,
  MappingFunctionType,
  NetworkView,
  Table,
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
} from '../../../models'
import { FilterConfig } from '../../../models/FilterModel/FilterConfig'

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
export type VisualPropertyWithRecords = ReplaceMapsWithArrayEntries<
  VisualProperty<VisualPropertyValueType>
>
export type DiscreteMappingFunctionWithRecords =
  ReplaceMapsWithArrayEntries<DiscreteMappingFunction>
export type FilterConfigWithRecords = ReplaceMapsWithArrayEntries<FilterConfig>

// Utility functions to convert between Map and Array of entries
// These functions are necessary because JavaScript Map objects cannot be directly stored in IndexedDB in Safari.
// IndexedDB in Safari does not support structured cloning of Map objects, so we must convert them to arrays of entries.
//
// CONDITIONAL DESERIALIZATION APPROACH:
// Deserialization functions check if values are arrays of entries (need conversion) or already Maps (no conversion needed).
// This allows the same deserialization functions to handle both serialized and non-serialized data.
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
  networkView: NetworkViewWithRecords | NetworkView,
): NetworkView => {
  // Helper function to conditionally convert values
  const conditionalConvertValues = (values: any) => {
    if (Array.isArray(values)) {
      // It's an array of entries, convert to Map
      return listEntriesToMap(values)
    } else if (values instanceof Map) {
      // It's already a Map, return as-is
      return values
    }
    // Fallback: try to convert anyway
    return listEntriesToMap(values)
  }

  const deserializedNetworkView = {
    ...networkView,
    nodeViews: Object.fromEntries(
      Object.entries(networkView.nodeViews).map(([k, nv]) => [
        k,
        {
          ...nv,
          values: conditionalConvertValues(nv.values),
        },
      ]),
    ),
    edgeViews: Object.fromEntries(
      Object.entries(networkView.edgeViews).map(([k, ev]) => [
        k,
        {
          ...ev,
          values: conditionalConvertValues(ev.values),
        },
      ]),
    ),
    values: conditionalConvertValues(networkView.values),
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
      // Destructure to exclude mapping if it's undefined
      const { mapping, ...rest } = v
      const serializedVp: Partial<VisualPropertyWithRecords> = {
        ...rest,
        bypassMap: maptoListEntries(v.bypassMap),
      }

      // Only add mapping if it actually exists and has a value
      if (mapping !== undefined) {
        if (mapping.type === MappingFunctionType.Discrete) {
          ;(serializedVp as any).mapping = {
            ...mapping,
            vpValueMap: maptoListEntries(
              (mapping as DiscreteMappingFunction).vpValueMap,
            ),
          }
        } else {
          ;(serializedVp as any).mapping = mapping
        }
      }
      // If mapping is undefined, don't add the key at all

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
  visualStyle: VisualStyleWithRecords | VisualStyle,
): VisualStyle => {
  // Helper function to conditionally convert values
  const conditionalConvertValues = (values: any) => {
    if (Array.isArray(values)) {
      // It's an array of entries, convert to Map
      return listEntriesToMap(values)
    } else if (values instanceof Map) {
      // It's already a Map, return as-is
      return values
    }
    // Fallback: try to convert anyway
    return listEntriesToMap(values)
  }

  const deserializedVs = Object.fromEntries(
    Object.entries(visualStyle).map(([k, v]) => {
      const deserializedVp: any = {
        ...v,
        bypassMap: conditionalConvertValues(v.bypassMap),
      }

      // Only add mapping if it actually exists and has a value
      if (v.mapping !== undefined) {
        if (v.mapping.type === MappingFunctionType.Discrete) {
          deserializedVp.mapping = {
            ...v.mapping,
            vpValueMap: conditionalConvertValues((v.mapping as any).vpValueMap),
          }
        } else {
          deserializedVp.mapping = v.mapping
        }
      }
      // If mapping is undefined, don't add the key at all

      return [k, deserializedVp]
    }),
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
export const deserializeTable = (table: TableWithRecords | Table): Table => {
  // Helper function to conditionally convert values
  const conditionalConvertValues = (values: any) => {
    if (Array.isArray(values)) {
      // It's an array of entries, convert to Map
      return listEntriesToMap(values)
    } else if (values instanceof Map) {
      // It's already a Map, return as-is
      return values
    }
    // Fallback: try to convert anyway
    return listEntriesToMap(values)
  }

  const deserializedTable = {
    ...table,
    rows: conditionalConvertValues(table.rows),
  }

  return deserializedTable as Table
}

/**
 * Converts a `FilterConfig` object into a serialized format by replacing all `Map` properties
 * with arrays of entries. This is necessary for storing the object in IndexedDB, as `Map` objects
 * are not supported in Safari's IndexedDB implementation.
 *
 * @param filterConfig - The `FilterConfig` object to serialize.
 * @returns A serialized `FilterConfig` object with `Map` properties replaced by arrays of entries.
 */
export const serializeFilterConfig = (
  filterConfig: FilterConfig,
): FilterConfigWithRecords => {
  // If there's no visualMapping or it's not a DiscreteMappingFunction, return as-is
  if (
    !filterConfig.visualMapping ||
    filterConfig.visualMapping.type !== MappingFunctionType.Discrete
  ) {
    return filterConfig as FilterConfigWithRecords
  }

  // Serialize the vpValueMap in the DiscreteMappingFunction
  const discreteMapping = filterConfig.visualMapping as DiscreteMappingFunction
  const serializedMapping = {
    ...discreteMapping,
    vpValueMap: maptoListEntries(discreteMapping.vpValueMap),
  }

  return {
    ...filterConfig,
    visualMapping: serializedMapping,
  } as FilterConfigWithRecords
}

/**
 * Converts a serialized `FilterConfig` object (with arrays of entries) back into its original format
 * by replacing arrays of entries with `Map` objects. This is necessary after retrieving the object
 * from IndexedDB.
 *
 * @param filterConfig - The serialized `FilterConfig` object to deserialize.
 * @returns A deserialized `FilterConfig` object with `Map` properties restored.
 */
export const deserializeFilterConfig = (
  filterConfig: FilterConfigWithRecords | FilterConfig,
): FilterConfig => {
  // Helper function to conditionally convert values
  const conditionalConvertValues = (values: any) => {
    if (Array.isArray(values)) {
      // It's an array of entries, convert to Map
      return listEntriesToMap(values)
    } else if (values instanceof Map) {
      // It's already a Map, return as-is
      return values
    }
    // Fallback: try to convert anyway
    return listEntriesToMap(values)
  }

  // If there's no visualMapping or it's not a DiscreteMappingFunction, return as-is
  if (
    !filterConfig.visualMapping ||
    filterConfig.visualMapping.type !== MappingFunctionType.Discrete
  ) {
    return filterConfig as FilterConfig
  }

  // Deserialize the vpValueMap in the DiscreteMappingFunction
  const serializedMapping = filterConfig.visualMapping as any
  const deserializedMapping = {
    ...serializedMapping,
    vpValueMap: conditionalConvertValues(serializedMapping.vpValueMap),
  }

  return {
    ...filterConfig,
    visualMapping: deserializedMapping,
  } as FilterConfig
}
