import { MappingFunctionType } from '../../models'
import {
  mapToObject,
  objectToMap,
  serializeNetworkView,
  deserializeNetworkView,
  serializeVisualStyle,
  deserializeVisualStyle,
  serializeTable,
  deserializeTable,
} from './db-util'

describe('db-util', () => {
  describe('mapToObject and objectToMap', () => {
    it('should convert a Map to an object', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])
      const obj = mapToObject(map)

      expect(obj).toEqual({ key1: 'value1', key2: 'value2' })
    })

    it('should convert an object to a Map', () => {
      const obj = { key1: 'value1', key2: 'value2' }
      const map = objectToMap(obj)

      expect(map).toEqual(
        new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
      )
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
      expect(serialized.nodeViews.node1.values).toEqual({ key1: 'value1' })
      expect(serialized.edgeViews.edge1.values).toEqual({ key2: 'value2' })
      expect(serialized.values).toEqual({ key3: 'value3' })

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
      console.log('Serialized VisualStyle:', serialized)
      expect(serialized.nodeShape.bypassMap).toEqual({ key1: 'value1' })
      expect((serialized.nodeShape?.mapping as any)?.vpValueMap ?? {}).toEqual({
        key2: 'value2',
      })

      const deserialized = deserializeVisualStyle(serialized as any)
      expect(deserialized.nodeShape.bypassMap).toEqual(
        new Map([['key1', 'value1']]),
      )
      expect((deserialized.nodeShape.mapping as any).vpValueMap).toEqual(
        new Map([['key2', 'value2']]),
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
      expect(serialized.rows).toEqual({
        row1: { data: 'value1' },
        row2: { data: 'value2' },
      })

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
