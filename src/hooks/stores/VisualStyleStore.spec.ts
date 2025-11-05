import { act, renderHook } from '@testing-library/react'

import { IdType } from '../../models/IdType'
import {
  MappingFunctionType,
  DiscreteMappingFunction,
  ContinuousMappingFunction,
  PassthroughMappingFunction,
} from '../../models/VisualStyleModel/VisualMappingFunction'
import { VisualPropertyName } from '../../models/VisualStyleModel/VisualPropertyName'
import { VisualStyle } from '../../models/VisualStyleModel/VisualStyle'
import { VisualPropertyValueTypeName } from '../../models/VisualStyleModel/VisualPropertyValueTypeName'
import { createVisualStyle } from '../../models/VisualStyleModel/impl/visualStyleFnImpl'
import { ValueTypeName } from '../../models/TableModel'
import { useVisualStyleStore } from './VisualStyleStore'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../../db', () => ({
  ...jest.requireActual('../../db'),
  putVisualStyleToDb: jest.fn().mockResolvedValue(undefined),
  deleteVisualStyleFromDb: jest.fn().mockResolvedValue(undefined),
  clearVisualStyleFromDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock the workspace store to provide a current network ID
jest.mock('./WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: {
        currentNetworkId: 'test-network-1',
      },
    })),
  },
}))

describe('useVisualStyleStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useVisualStyleStore())
    act(() => {
      result.current.deleteAll()
    })
  })

  describe('add', () => {
    it('should add a visual style for a network', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
      })

      expect(result.current.visualStyles[networkId]).toEqual(visualStyle)
    })

    it('should overwrite existing visual style for a network', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle1 = createVisualStyle()
      const visualStyle2 = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle1)
      })

      expect(result.current.visualStyles[networkId]).toEqual(visualStyle1)

      act(() => {
        result.current.add(networkId, visualStyle2)
      })

      expect(result.current.visualStyles[networkId]).toEqual(visualStyle2)
    })

    it('should handle multiple networks independently', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const visualStyle1 = createVisualStyle()
      const visualStyle2 = createVisualStyle()

      act(() => {
        result.current.add(networkId1, visualStyle1)
        result.current.add(networkId2, visualStyle2)
      })

      expect(result.current.visualStyles[networkId1]).toEqual(visualStyle1)
      expect(result.current.visualStyles[networkId2]).toEqual(visualStyle2)
    })
  })

  describe('setDefault', () => {
    it('should set the default value for a visual property', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.setDefault(networkId, 'nodeShape', 'ellipse')
      })

      expect(
        result.current.visualStyles[networkId].nodeShape.defaultValue,
      ).toBe('ellipse')
    })

    it('should update existing default value', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.setDefault(networkId, 'nodeBackgroundColor', '#FF0000')
        result.current.setDefault(networkId, 'nodeBackgroundColor', '#00FF00')
      })

      expect(
        result.current.visualStyles[networkId].nodeBackgroundColor.defaultValue,
      ).toBe('#00FF00')
    })
  })

  describe('setBypass', () => {
    it('should set bypass values for multiple elements', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()
      const elementIds: IdType[] = ['node-1', 'node-2', 'node-3']

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.setBypass(
          networkId,
          'nodeBackgroundColor',
          elementIds,
          '#FF0000',
        )
      })

      const bypassMap =
        result.current.visualStyles[networkId].nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBe('#FF0000')
      expect(bypassMap.get('node-2')).toBe('#FF0000')
      expect(bypassMap.get('node-3')).toBe('#FF0000')
    })

    it('should update existing bypass values', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.setBypass(networkId, 'nodeShape', ['node-1'], 'ellipse')
        result.current.setBypass(networkId, 'nodeShape', ['node-1'], 'diamond')
      })

      const bypassMap =
        result.current.visualStyles[networkId].nodeShape.bypassMap
      expect(bypassMap.get('node-1')).toBe('diamond')
    })
  })

  describe('deleteBypass', () => {
    it('should delete bypass values for multiple elements', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.setBypass(
          networkId,
          'nodeBackgroundColor',
          ['node-1', 'node-2'],
          '#FF0000',
        )
        result.current.deleteBypass(networkId, 'nodeBackgroundColor', [
          'node-1',
          'node-2',
        ])
      })

      const bypassMap =
        result.current.visualStyles[networkId].nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBeUndefined()
      expect(bypassMap.get('node-2')).toBeUndefined()
    })

    it('should handle deleting non-existent bypass values gracefully', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.deleteBypass(networkId, 'nodeBackgroundColor', [
          'node-999',
        ])
      })

      // Should not throw
      expect(result.current.visualStyles[networkId]).toBeDefined()
    })
  })

  describe('setBypassMap', () => {
    it('should set the entire bypass map', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()
      const newBypassMap = new Map<IdType, any>([
        ['node-1', '#FF0000'],
        ['node-2', '#00FF00'],
      ])

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.setBypassMap(
          networkId,
          'nodeBackgroundColor',
          newBypassMap,
        )
      })

      const bypassMap =
        result.current.visualStyles[networkId].nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBe('#FF0000')
      expect(bypassMap.get('node-2')).toBe('#00FF00')
    })

    it('should replace existing bypass map', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.setBypass(
          networkId,
          'nodeBackgroundColor',
          ['node-1'],
          '#FF0000',
        )
        const newBypassMap = new Map<IdType, any>([['node-2', '#00FF00']])
        result.current.setBypassMap(
          networkId,
          'nodeBackgroundColor',
          newBypassMap,
        )
      })

      const bypassMap =
        result.current.visualStyles[networkId].nodeBackgroundColor.bypassMap
      expect(bypassMap.get('node-1')).toBeUndefined()
      expect(bypassMap.get('node-2')).toBe('#00FF00')
    })
  })

  describe('createDiscreteMapping', () => {
    it('should create a discrete mapping function', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()
      const attributeName = 'type'

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createDiscreteMapping(
          networkId,
          'nodeShape',
          attributeName,
          ValueTypeName.String,
        )
      })

      const mapping = result.current.visualStyles[networkId].nodeShape
        .mapping as DiscreteMappingFunction
      expect(mapping).toBeDefined()
      expect(mapping.type).toBe(MappingFunctionType.Discrete)
      expect(mapping.attribute).toBe(attributeName)
      expect(mapping.vpValueMap).toBeInstanceOf(Map)
    })

    it('should preserve the default value', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()
      const originalDefault = visualStyle.nodeShape.defaultValue

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createDiscreteMapping(
          networkId,
          'nodeShape',
          'type',
          ValueTypeName.String,
        )
      })

      const mapping = result.current.visualStyles[networkId].nodeShape
        .mapping as DiscreteMappingFunction
      expect(mapping.defaultValue).toBe(originalDefault)
    })
  })

  describe('setDiscreteMappingValue', () => {
    it('should set mapping values for multiple attribute values', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()
      const values: any[] = ['type1', 'type2', 'type3']
      const vpValue = 'ellipse'

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createDiscreteMapping(
          networkId,
          'nodeShape',
          'type',
          ValueTypeName.String,
        )
        result.current.setDiscreteMappingValue(
          networkId,
          'nodeShape',
          values,
          vpValue,
        )
      })

      const mapping = result.current.visualStyles[networkId].nodeShape
        .mapping as DiscreteMappingFunction
      expect(mapping.vpValueMap.get('type1')).toBe(vpValue)
      expect(mapping.vpValueMap.get('type2')).toBe(vpValue)
      expect(mapping.vpValueMap.get('type3')).toBe(vpValue)
    })

    it('should update existing mapping values', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createDiscreteMapping(
          networkId,
          'nodeShape',
          'type',
          ValueTypeName.String,
        )
        result.current.setDiscreteMappingValue(
          networkId,
          'nodeShape',
          ['type1'],
          'ellipse',
        )
        result.current.setDiscreteMappingValue(
          networkId,
          'nodeShape',
          ['type1'],
          'diamond',
        )
      })

      const mapping = result.current.visualStyles[networkId].nodeShape
        .mapping as DiscreteMappingFunction
      expect(mapping.vpValueMap.get('type1')).toBe('diamond')
    })
  })

  describe('deleteDiscreteMappingValue', () => {
    it('should delete mapping values for multiple attribute values', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createDiscreteMapping(
          networkId,
          'nodeShape',
          'type',
          ValueTypeName.String,
        )
        result.current.setDiscreteMappingValue(
          networkId,
          'nodeShape',
          ['type1', 'type2'],
          'ellipse',
        )
        result.current.deleteDiscreteMappingValue(networkId, 'nodeShape', [
          'type1',
          'type2',
        ])
      })

      const mapping = result.current.visualStyles[networkId].nodeShape
        .mapping as DiscreteMappingFunction
      expect(mapping.vpValueMap.get('type1')).toBeUndefined()
      expect(mapping.vpValueMap.get('type2')).toBeUndefined()
    })
  })

  describe('setContinuousMappingValues', () => {
    it('should set continuous mapping values', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createContinuousMapping(
          networkId,
          'nodeWidth',
          VisualPropertyValueTypeName.Number,
          'score',
          [10, 20, 30, 40, 50],
          ValueTypeName.Double,
        )

        const min = { value: 10, vpValue: 20, inclusive: false }
        const max = { value: 50, vpValue: 100, inclusive: false }
        const controlPoints = [
          { value: 10, vpValue: 20 },
          { value: 30, vpValue: 60 },
          { value: 50, vpValue: 100 },
        ]

        result.current.setContinuousMappingValues(
          networkId,
          'nodeWidth',
          min,
          max,
          controlPoints,
          20,
          100,
        )
      })

      const mapping = result.current.visualStyles[networkId].nodeWidth
        .mapping as ContinuousMappingFunction
      expect(mapping.min.value).toBe(10)
      expect(mapping.min.vpValue).toBe(20)
      expect(mapping.max.value).toBe(50)
      expect(mapping.max.vpValue).toBe(100)
      expect(mapping.controlPoints).toHaveLength(3)
      expect(mapping.ltMinVpValue).toBe(20)
      expect(mapping.gtMaxVpValue).toBe(100)
    })
  })

  describe('createPassthroughMapping', () => {
    it('should create a passthrough mapping function', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()
      const attributeName = 'name'

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createPassthroughMapping(
          networkId,
          'nodeLabel',
          attributeName,
          ValueTypeName.String,
        )
      })

      const mapping = result.current.visualStyles[networkId].nodeLabel
        .mapping as PassthroughMappingFunction
      expect(mapping).toBeDefined()
      expect(mapping.type).toBe(MappingFunctionType.Passthrough)
      expect(mapping.attribute).toBe(attributeName)
    })

    it('should preserve the default value', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()
      const originalDefault = visualStyle.nodeLabel.defaultValue

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createPassthroughMapping(
          networkId,
          'nodeLabel',
          'name',
          ValueTypeName.String,
        )
      })

      const mapping = result.current.visualStyles[networkId].nodeLabel
        .mapping as PassthroughMappingFunction
      expect(mapping.defaultValue).toBe(originalDefault)
    })
  })

  describe('removeMapping', () => {
    it('should remove a mapping function', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createDiscreteMapping(
          networkId,
          'nodeShape',
          'type',
          ValueTypeName.String,
        )
        result.current.removeMapping(networkId, 'nodeShape')
      })

      expect(
        result.current.visualStyles[networkId].nodeShape.mapping,
      ).toBeUndefined()
    })
  })

  describe('setMapping', () => {
    it('should set a mapping function', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        const mapping: DiscreteMappingFunction = {
          type: MappingFunctionType.Discrete,
          attribute: 'type',
          vpValueMap: new Map([['type1', 'ellipse']]),
          visualPropertyType: 'nodeShape',
          defaultValue: 'round-rectangle',
        }
        result.current.setMapping(networkId, 'nodeShape', mapping)
      })

      const mapping = result.current.visualStyles[networkId].nodeShape
        .mapping as DiscreteMappingFunction
      expect(mapping.type).toBe(MappingFunctionType.Discrete)
      expect(mapping.attribute).toBe('type')
      expect(mapping.vpValueMap.get('type1')).toBe('ellipse')
    })

    it('should allow setting undefined to remove mapping', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.createDiscreteMapping(
          networkId,
          'nodeShape',
          'type',
          ValueTypeName.String,
        )
        result.current.setMapping(networkId, 'nodeShape', undefined)
      })

      expect(
        result.current.visualStyles[networkId].nodeShape.mapping,
      ).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('should delete a visual style for a network', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        result.current.add(networkId, visualStyle)
        result.current.delete(networkId)
      })

      expect(result.current.visualStyles[networkId]).toBeUndefined()
    })

    it('should not affect other networks when deleting one', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const visualStyle1 = createVisualStyle()
      const visualStyle2 = createVisualStyle()

      act(() => {
        result.current.add(networkId1, visualStyle1)
        result.current.add(networkId2, visualStyle2)
        result.current.delete(networkId1)
      })

      expect(result.current.visualStyles[networkId1]).toBeUndefined()
      expect(result.current.visualStyles[networkId2]).toEqual(visualStyle2)
    })
  })

  describe('deleteAll', () => {
    it('should delete all visual styles', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const visualStyle1 = createVisualStyle()
      const visualStyle2 = createVisualStyle()

      act(() => {
        result.current.add(networkId1, visualStyle1)
        result.current.add(networkId2, visualStyle2)
        result.current.deleteAll()
      })

      expect(result.current.visualStyles).toEqual({})
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow: add, set defaults, create mappings, set bypasses', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const networkId: IdType = 'network-1'
      const visualStyle = createVisualStyle()

      act(() => {
        // Add visual style
        result.current.add(networkId, visualStyle)
      })
      expect(result.current.visualStyles[networkId]).toBeDefined()

      act(() => {
        // Set default value
        result.current.setDefault(networkId, 'nodeShape', 'ellipse')
      })
      expect(
        result.current.visualStyles[networkId].nodeShape.defaultValue,
      ).toBe('ellipse')

      act(() => {
        // Create discrete mapping
        result.current.createDiscreteMapping(
          networkId,
          'nodeBackgroundColor',
          'type',
          ValueTypeName.String,
        )
      })
      const mapping = result.current.visualStyles[networkId].nodeBackgroundColor
        .mapping as DiscreteMappingFunction
      expect(mapping).toBeDefined()

      act(() => {
        // Set mapping values
        result.current.setDiscreteMappingValue(
          networkId,
          'nodeBackgroundColor',
          ['type1', 'type2'],
          '#FF0000',
        )
      })
      const updatedMapping = result.current.visualStyles[networkId]
        .nodeBackgroundColor.mapping as DiscreteMappingFunction
      expect(updatedMapping.vpValueMap.get('type1')).toBe('#FF0000')
      expect(updatedMapping.vpValueMap.get('type2')).toBe('#FF0000')

      act(() => {
        // Set bypass
        result.current.setBypass(networkId, 'nodeShape', ['node-1'], 'diamond')
      })
      const bypassMap =
        result.current.visualStyles[networkId].nodeShape.bypassMap
      expect(bypassMap.get('node-1')).toBe('diamond')

      act(() => {
        // Remove mapping
        result.current.removeMapping(networkId, 'nodeBackgroundColor')
      })
      expect(
        result.current.visualStyles[networkId].nodeBackgroundColor.mapping,
      ).toBeUndefined()
    })
  })
})
