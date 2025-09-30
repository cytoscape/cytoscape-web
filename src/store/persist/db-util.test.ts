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

    it('should handle already deserialized NetworkView (with Maps) without conversion', () => {
      const networkView = {
        nodeViews: {
          node1: { values: new Map([['key1', 'value1']]) },
        },
        edgeViews: {
          edge1: { values: new Map([['key2', 'value2']]) },
        },
        values: new Map([['key3', 'value3']]),
      }

      // Pass the already deserialized NetworkView directly
      const result = deserializeNetworkView(networkView as any)

      // Should return the same Maps without conversion
      expect(result.nodeViews.node1.values).toBe(
        networkView.nodeViews.node1.values,
      )
      expect(result.edgeViews.edge1.values).toBe(
        networkView.edgeViews.edge1.values,
      )
      expect(result.values).toBe(networkView.values)
    })

    it('should handle mixed serialized and non-serialized data', () => {
      const mixedNetworkView = {
        nodeViews: {
          node1: { values: [['key1', 'value1']] }, // Array (serialized)
          node2: { values: new Map([['key2', 'value2']]) }, // Map (not serialized)
        },
        edgeViews: {
          edge1: { values: [['key3', 'value3']] }, // Array (serialized)
          edge2: { values: new Map([['key4', 'value4']]) }, // Map (not serialized)
        },
        values: [['key5', 'value5']], // Array (serialized)
      }

      const result = deserializeNetworkView(mixedNetworkView as any)

      // Arrays should be converted to Maps
      expect(result.nodeViews.node1.values).toEqual(
        new Map([['key1', 'value1']]),
      )
      expect(result.edgeViews.edge1.values).toEqual(
        new Map([['key3', 'value3']]),
      )
      expect(result.values).toEqual(new Map([['key5', 'value5']]))

      // Maps should remain unchanged
      expect(result.nodeViews.node2.values).toBe(
        mixedNetworkView.nodeViews.node2.values,
      )
      expect(result.edgeViews.edge2.values).toBe(
        mixedNetworkView.edgeViews.edge2.values,
      )
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

    it('should not add mapping property when mapping is undefined (fixes undefined mapping bug)', () => {
      // Create a visual style where most properties have no mapping (undefined)
      const visualStyle = {
        nodeShape: {
          group: 'node',
          name: 'nodeShape',
          type: 'nodeShape',
          displayName: 'Shape',
          defaultValue: 'round-rectangle',
          bypassMap: new Map(),
          // mapping is undefined (should not be added to serialized version)
        },
        nodeBackgroundColor: {
          group: 'node',
          name: 'nodeBackgroundColor',
          type: 'color',
          displayName: 'Fill Color',
          defaultValue: '#89D0F5',
          bypassMap: new Map(),
          // mapping is undefined (should not be added to serialized version)
        },
        nodeLabel: {
          group: 'node',
          name: 'nodeLabel',
          type: 'string',
          displayName: 'Label',
          defaultValue: '',
          bypassMap: new Map(),
          mapping: {
            type: MappingFunctionType.Passthrough,
            attribute: 'name',
            visualPropertyType: 'string',
            defaultValue: '',
          },
        },
      }

      const serialized = serializeVisualStyle(visualStyle as any)

      // Properties with undefined mapping should NOT have a mapping key
      expect(serialized.nodeShape).not.toHaveProperty('mapping')
      expect(serialized.nodeBackgroundColor).not.toHaveProperty('mapping')

      // Properties with actual mappings should have the mapping key
      expect(serialized.nodeLabel).toHaveProperty('mapping')
      expect(serialized.nodeLabel.mapping).toEqual({
        type: MappingFunctionType.Passthrough,
        attribute: 'name',
        visualPropertyType: 'string',
        defaultValue: '',
      })

      // Test round-trip serialization/deserialization
      const deserialized = deserializeVisualStyle(serialized as any)

      // After deserialization, properties that had no mapping should still have no mapping
      expect(deserialized.nodeShape).not.toHaveProperty('mapping')
      expect(deserialized.nodeBackgroundColor).not.toHaveProperty('mapping')

      // Properties that had mappings should still have mappings
      expect(deserialized.nodeLabel).toHaveProperty('mapping')
      expect(deserialized.nodeLabel.mapping).toEqual({
        type: MappingFunctionType.Passthrough,
        attribute: 'name',
        visualPropertyType: 'string',
        defaultValue: '',
      })

      // Verify that the structure is preserved exactly
      expect(Object.keys(serialized.nodeShape)).toEqual([
        'group',
        'name',
        'type',
        'displayName',
        'defaultValue',
        'bypassMap',
        // Note: 'mapping' is NOT in this list
      ])
    })

    it('should handle mixed undefined and defined mappings correctly', () => {
      const visualStyle = {
        nodeShape: {
          group: 'node',
          name: 'nodeShape',
          type: 'nodeShape',
          displayName: 'Shape',
          defaultValue: 'round-rectangle',
          bypassMap: new Map(),
          // No mapping property at all
        },
        nodeBorderColor: {
          group: 'node',
          name: 'nodeBorderColor',
          type: 'color',
          displayName: 'Border Color',
          defaultValue: '#CCCCCC',
          bypassMap: new Map(),
          mapping: undefined, // Explicitly undefined
        },
        nodeLabel: {
          group: 'node',
          name: 'nodeLabel',
          type: 'string',
          displayName: 'Label',
          defaultValue: '',
          bypassMap: new Map(),
          mapping: {
            type: MappingFunctionType.Passthrough,
            attribute: 'name',
            visualPropertyType: 'string',
            defaultValue: '',
          },
        },
      }

      const serialized = serializeVisualStyle(visualStyle as any)

      // Both undefined cases should result in no mapping property
      expect(serialized.nodeShape).not.toHaveProperty('mapping')
      expect(serialized.nodeBorderColor).not.toHaveProperty('mapping')
      expect(serialized.nodeLabel).toHaveProperty('mapping')

      const deserialized = deserializeVisualStyle(serialized as any)

      // After round-trip, structure should be preserved
      expect(deserialized.nodeShape).not.toHaveProperty('mapping')
      expect(deserialized.nodeBorderColor).not.toHaveProperty('mapping')
      expect(deserialized.nodeLabel).toHaveProperty('mapping')
    })

    it('should handle already deserialized VisualStyle (with Maps) without conversion', () => {
      const visualStyle = {
        nodeShape: {
          bypassMap: new Map([['key1', 'value1']]),
          mapping: {
            type: MappingFunctionType.Discrete,
            vpValueMap: new Map([['key2', 'value2']]),
          },
        },
        nodeBackgroundColor: {
          bypassMap: new Map([['key3', 'value3']]),
          // No mapping property
        },
      }

      // Pass the already deserialized VisualStyle directly
      const result = deserializeVisualStyle(visualStyle as any)

      // Should return the same Maps without conversion
      expect(result.nodeShape.bypassMap).toBe(visualStyle.nodeShape.bypassMap)
      expect((result.nodeShape.mapping as any).vpValueMap).toBe(
        (visualStyle.nodeShape.mapping as any).vpValueMap,
      )
      expect(result.nodeBackgroundColor.bypassMap).toBe(
        visualStyle.nodeBackgroundColor.bypassMap,
      )
    })

    it('should handle mixed serialized and non-serialized VisualStyle data', () => {
      const mixedVisualStyle = {
        nodeShape: {
          bypassMap: [['key1', 'value1']], // Array (serialized)
          mapping: {
            type: MappingFunctionType.Discrete,
            vpValueMap: [['key2', 'value2']], // Array (serialized)
          },
        },
        nodeBackgroundColor: {
          bypassMap: new Map([['key3', 'value3']]), // Map (not serialized)
          mapping: {
            type: MappingFunctionType.Discrete,
            vpValueMap: new Map([['key4', 'value4']]), // Map (not serialized)
          },
        },
      }

      const result = deserializeVisualStyle(mixedVisualStyle as any)

      // Arrays should be converted to Maps
      expect(result.nodeShape.bypassMap).toEqual(new Map([['key1', 'value1']]))
      expect((result.nodeShape.mapping as any).vpValueMap).toEqual(
        new Map([['key2', 'value2']]),
      )

      // Maps should remain unchanged
      expect(result.nodeBackgroundColor.bypassMap).toBe(
        mixedVisualStyle.nodeBackgroundColor.bypassMap,
      )
      expect((result.nodeBackgroundColor.mapping as any).vpValueMap).toBe(
        (mixedVisualStyle.nodeBackgroundColor.mapping as any).vpValueMap,
      )
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

    it('should handle already deserialized Table (with Map) without conversion', () => {
      const table = {
        rows: new Map([
          ['row1', { data: 'value1' }],
          ['row2', { data: 'value2' }],
        ]),
      }

      // Pass the already deserialized Table directly
      const result = deserializeTable(table as any)

      // Should return the same Map without conversion
      expect(result.rows).toBe(table.rows)
    })

    it('should handle mixed serialized and non-serialized Table data', () => {
      const mixedTable = {
        rows: [['row1', { data: 'value1' }]], // Array (serialized)
      }

      const result = deserializeTable(mixedTable as any)

      // Array should be converted to Map
      expect(result.rows).toEqual(new Map([['row1', { data: 'value1' }]]))
    })

    it('should handle edge cases in conditional conversion', () => {
      // Test with null/undefined values
      const tableWithNullRows = {
        rows: null,
      }

      const result1 = deserializeTable(tableWithNullRows as any)
      expect(result1.rows).toEqual(new Map())

      // Test with empty array
      const tableWithEmptyRows = {
        rows: [],
      }

      const result2 = deserializeTable(tableWithEmptyRows as any)
      expect(result2.rows).toEqual(new Map())
    })
  })

  describe('conditional conversion logic', () => {
    it('should correctly identify and convert arrays vs Maps', () => {
      // Test the conditionalConvertValues logic directly
      const testCases = [
        {
          input: [
            ['key1', 'value1'],
            ['key2', 'value2'],
          ],
          expected: 'Map',
          description: 'Array of entries should be converted to Map',
        },
        {
          input: new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
          ]),
          expected: 'Map',
          description: 'Existing Map should remain unchanged',
        },
        {
          input: null,
          expected: 'Map',
          description: 'Null should be converted to empty Map',
        },
        {
          input: undefined,
          expected: 'Map',
          description: 'Undefined should be converted to empty Map',
        },
        {
          input: [],
          expected: 'Map',
          description: 'Empty array should be converted to empty Map',
        },
      ]

      testCases.forEach(({ input, expected, description }) => {
        // Test NetworkView deserialization
        const networkView = {
          values: input,
          nodeViews: { node1: { values: input } },
          edgeViews: { edge1: { values: input } },
        }

        const result = deserializeNetworkView(networkView as any)

        expect(result.values instanceof Map).toBe(true)
        expect(result.nodeViews.node1.values instanceof Map).toBe(true)
        expect(result.edgeViews.edge1.values instanceof Map).toBe(true)
      })
    })

    it('should handle complex nested structures with mixed data types', () => {
      const complexNetworkView = {
        values: [['global', 'value']], // Array
        nodeViews: {
          node1: { values: new Map([['local1', 'value1']]) }, // Map
          node2: { values: [['local2', 'value2']] }, // Array
        },
        edgeViews: {
          edge1: { values: new Map([['edge1', 'value1']]) }, // Map
          edge2: { values: [['edge2', 'value2']] }, // Array
        },
      }

      const result = deserializeNetworkView(complexNetworkView as any)

      // Arrays should be converted
      expect(result.values).toEqual(new Map([['global', 'value']]))
      expect(result.nodeViews.node2.values).toEqual(
        new Map([['local2', 'value2']]),
      )
      expect(result.edgeViews.edge2.values).toEqual(
        new Map([['edge2', 'value2']]),
      )

      // Maps should remain unchanged
      expect(result.nodeViews.node1.values).toBe(
        complexNetworkView.nodeViews.node1.values,
      )
      expect(result.edgeViews.edge1.values).toBe(
        complexNetworkView.edgeViews.edge1.values,
      )
    })

    it('should preserve object references for unchanged Maps', () => {
      const originalMap = new Map([['key', 'value']])
      const networkView = {
        values: originalMap,
        nodeViews: { node1: { values: originalMap } },
        edgeViews: { edge1: { values: originalMap } },
      }

      const result = deserializeNetworkView(networkView as any)

      // Should be the exact same Map objects (reference equality)
      expect(result.values).toBe(originalMap)
      expect(result.nodeViews.node1.values).toBe(originalMap)
      expect(result.edgeViews.edge1.values).toBe(originalMap)
    })
  })
})
