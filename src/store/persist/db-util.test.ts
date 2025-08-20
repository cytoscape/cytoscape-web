import { MappingFunctionType } from '../../models'
import {
  maptoListEntries,
  listEntriesToMap,
  serializeNetworkView,
  deserializeNetworkView,
  serializeVisualStyle,
  deserializeVisualStyle,
  serializeTable,
  deserializeTable,
} from './db-util'

describe('db-util', () => {
  describe('maptoListEntries and listEntriesToMap', () => {
    it('should convert a Map to an array of entries', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])
      const entries = maptoListEntries(map)

      expect(entries).toEqual([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])
    })

    it('should convert an array of entries to a Map', () => {
      const entries: [string, string][] = [
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]
      const map = listEntriesToMap(entries)

      expect(map).toEqual(
        new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
      )
    })

    it('should preserve numeric keys when converting', () => {
      const entries: [number, string][] = [
        [0, 'blue'],
        [1, 'red'],
        [2, 'green'],
      ]
      const map = listEntriesToMap(entries)

      expect(map.get(0)).toBe('blue')
      expect(map.get(1)).toBe('red')
      expect(map.get(2)).toBe('green')

      // Verify keys are numbers, not strings
      expect(typeof Array.from(map.keys())[0]).toBe('number')
      expect(typeof Array.from(map.keys())[1]).toBe('number')
      expect(typeof Array.from(map.keys())[2]).toBe('number')
    })

    it('should preserve boolean keys when converting', () => {
      const entries: [boolean, string][] = [
        [true, 'yes'],
        [false, 'no'],
      ]
      const map = listEntriesToMap(entries)

      expect(map.get(true)).toBe('yes')
      expect(map.get(false)).toBe('no')

      // Verify keys are booleans, not strings
      expect(typeof Array.from(map.keys())[0]).toBe('boolean')
      expect(typeof Array.from(map.keys())[1]).toBe('boolean')
    })

    it('should handle empty or invalid input', () => {
      expect(maptoListEntries(null as any)).toEqual([])
      expect(maptoListEntries(undefined as any)).toEqual([])
      expect(listEntriesToMap(null as any)).toEqual(new Map())
      expect(listEntriesToMap(undefined as any)).toEqual(new Map())
      expect(listEntriesToMap([])).toEqual(new Map())
    })
  })

  describe('serializeNetworkView and deserializeNetworkView', () => {
    it('should serialize and deserialize a NetworkView object', () => {
      const networkView = {
        nodeViews: {
          node1: { values: new Map([['key1', 'value1']]) },
        },
        edgeViews: {
          edge1: { values: new Map([['key2', 'value2']]) },
        },
        values: new Map([['key3', 'value3']]),
      }

      const serialized = serializeNetworkView(networkView as any)
      expect(serialized.nodeViews.node1.values).toEqual([['key1', 'value1']])
      expect(serialized.edgeViews.edge1.values).toEqual([['key2', 'value2']])
      expect(serialized.values).toEqual([['key3', 'value3']])

      const deserialized = deserializeNetworkView(serialized as any)
      expect(deserialized.nodeViews.node1.values).toEqual(
        new Map([['key1', 'value1']]),
      )
      expect(deserialized.edgeViews.edge1.values).toEqual(
        new Map([['key2', 'value2']]),
      )
      expect(deserialized.values).toEqual(new Map([['key3', 'value3']]))
    })
  })

  describe('serializeVisualStyle and deserializeVisualStyle', () => {
    it('should serialize and deserialize a VisualStyle object', () => {
      const visualStyle = {
        nodeShape: {
          bypassMap: new Map([['key1', 'value1']]),
          mapping: {
            type: MappingFunctionType.Discrete,
            vpValueMap: new Map([['key2', 'value2']]),
          },
        },
      }

      const serialized = serializeVisualStyle(visualStyle as any)
      expect(serialized.nodeShape.bypassMap).toEqual([['key1', 'value1']])
      expect((serialized.nodeShape?.mapping as any)?.vpValueMap ?? []).toEqual([
        ['key2', 'value2'],
      ])

      const deserialized = deserializeVisualStyle(serialized as any)
      expect(deserialized.nodeShape.bypassMap).toEqual(
        new Map([['key1', 'value1']]),
      )
      expect((deserialized.nodeShape.mapping as any).vpValueMap).toEqual(
        new Map([['key2', 'value2']]),
      )
    })

    it('should preserve numeric keys in vpValueMap', () => {
      const visualStyle = {
        nodeBackgroundColor: {
          bypassMap: new Map([['key1', 'value1']]),
          mapping: {
            type: MappingFunctionType.Discrete,
            vpValueMap: new Map([
              [0, 'blue'],
              [1, 'red'],
              [2, 'green'],
            ]),
          },
        },
      }

      const serialized = serializeVisualStyle(visualStyle as any)
      expect(
        (serialized.nodeBackgroundColor?.mapping as any)?.vpValueMap,
      ).toEqual([
        [0, 'blue'],
        [1, 'red'],
        [2, 'green'],
      ])

      const deserialized = deserializeVisualStyle(serialized as any)
      const vpValueMap = (deserialized.nodeBackgroundColor.mapping as any)
        .vpValueMap

      // Verify the Map has numeric keys, not string keys
      expect(vpValueMap.get(0)).toBe('blue')
      expect(vpValueMap.get(1)).toBe('red')
      expect(vpValueMap.get(2)).toBe('green')

      // Verify keys are numbers, not strings
      expect(typeof Array.from(vpValueMap.keys())[0]).toBe('number')
      expect(typeof Array.from(vpValueMap.keys())[1]).toBe('number')
      expect(typeof Array.from(vpValueMap.keys())[2]).toBe('number')
    })
  })

  describe('serializeTable and deserializeTable', () => {
    it('should serialize and deserialize a Table object', () => {
      const table = {
        rows: new Map([
          ['row1', { data: 'value1' }],
          ['row2', { data: 'value2' }],
        ]),
      }

      const serialized = serializeTable(table as any)
      expect(serialized.rows).toEqual([
        ['row1', { data: 'value1' }],
        ['row2', { data: 'value2' }],
      ])

      const deserialized = deserializeTable(serialized as any)
      expect(deserialized.rows).toEqual(
        new Map([
          ['row1', { data: 'value1' }],
          ['row2', { data: 'value2' }],
        ]),
      )
    })
  })
})
