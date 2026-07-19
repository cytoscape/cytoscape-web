import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IdType } from '../../../models/IdType'
import { ValueTypeName } from '../../../models/TableModel'
import { createVisualStyle } from '../../../models/VisualStyleModel/impl/visualStyleFnImpl'
import {
  ContinuousMappingFunction,
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
} from '../../../models/VisualStyleModel/VisualMappingFunction'
import { VisualPropertyValueTypeName } from '../../../models/VisualStyleModel/VisualPropertyValueTypeName'
import { DEFAULT_STYLE_NAME } from '../../../models/VisualStyleModel'
import { createStyleSet } from '../../../models/VisualStyleModel/impl/visualStyleSetImpl'
import { useUndoStore } from './UndoStore'
import {
  getVisualStyleSetSnapshot,
  useVisualStyleStore,
} from './VisualStyleStore'

// Mock the database operations to avoid IndexedDB issues in tests
vi.mock('../../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db')>()
  return {
    ...actual,
    putNetworkToDb: vi.fn().mockResolvedValue(undefined),
    deleteNetworkFromDb: vi.fn().mockResolvedValue(undefined),
    clearNetworksFromDb: vi.fn().mockResolvedValue(undefined),
    putTableToDb: vi.fn().mockResolvedValue(undefined),
    deleteTableFromDb: vi.fn().mockResolvedValue(undefined),
    clearTablesFromDb: vi.fn().mockResolvedValue(undefined),
    putViewModelToDb: vi.fn().mockResolvedValue(undefined),
    putNetworkViewToDb: vi.fn().mockResolvedValue(undefined),
    putNetworkViewsToDb: vi.fn().mockResolvedValue(undefined),
    deleteViewModelFromDb: vi.fn().mockResolvedValue(undefined),
    deleteNetworkViewsFromDb: vi.fn().mockResolvedValue(undefined),
    clearViewModelsFromDb: vi.fn().mockResolvedValue(undefined),
    clearNetworkViewsFromDb: vi.fn().mockResolvedValue(undefined),
    putTablesToDb: vi.fn().mockResolvedValue(undefined),
    getNetworkFromDb: vi.fn().mockResolvedValue(undefined),
    getTablesFromDb: vi.fn().mockResolvedValue(undefined),
    getViewModelFromDb: vi.fn().mockResolvedValue(undefined),
  }
})

// Mock the workspace store to provide a current network ID
vi.mock('./WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
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

  describe('style sets (multiple visual styles)', () => {
    const networkId: IdType = 'network-1'

    it('add should initialize a single-entry style set named Default', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle())
      })

      const setState = result.current.styleSets[networkId]
      expect(setState).toBeDefined()
      const entries = Object.values(setState.styles)
      expect(entries).toHaveLength(1)
      expect(entries[0].name).toBe(DEFAULT_STYLE_NAME)
      expect(setState.activeStyleId).toBe(entries[0].id)
      // Active entry content lives in the working copy, not in the set
      expect(entries[0].visualStyle).toBeUndefined()
    })

    it('add should preserve an existing style set (renderer re-add scenario)', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.createStyle(networkId, 'Publication')
      })
      expect(
        Object.keys(result.current.styleSets[networkId].styles),
      ).toHaveLength(2)

      // The renderer calls add() again with the current style — the set
      // must survive
      const replacement = createVisualStyle()
      act(() => {
        result.current.add(networkId, replacement)
      })
      expect(
        Object.keys(result.current.styleSets[networkId].styles),
      ).toHaveLength(2)
      expect(result.current.visualStyles[networkId]).toEqual(replacement)
    })

    it('add should adopt a provided style set (CX2 import scenario)', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const activeStyle = createVisualStyle()
      const inactiveStyle = createVisualStyle()
      const styleSet = {
        activeStyleId: 'style-a',
        styles: {
          'style-a': { id: 'style-a', name: 'Main', visualStyle: activeStyle },
          'style-b': {
            id: 'style-b',
            name: 'Publication',
            visualStyle: inactiveStyle,
          },
        },
      }
      act(() => {
        result.current.add(networkId, activeStyle, styleSet)
      })

      const setState = result.current.styleSets[networkId]
      expect(setState.activeStyleId).toBe('style-a')
      expect(setState.styles['style-a'].visualStyle).toBeUndefined()
      expect(setState.styles['style-b'].visualStyle).toEqual(inactiveStyle)
      expect(setState.styles['style-b'].name).toBe('Publication')
    })

    it('add should ignore an invalid provided style set', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle(), {
          activeStyleId: 'dangling',
          styles: {},
        })
      })
      const setState = result.current.styleSets[networkId]
      expect(Object.values(setState.styles)).toHaveLength(1)
      expect(setState.styles[setState.activeStyleId]).toBeDefined()
    })

    it('switchStyle should swap the working copy and keep edits per style', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      let publicationId: IdType | undefined
      act(() => {
        result.current.add(networkId, createVisualStyle())
        publicationId = result.current.createStyle(networkId, 'Publication')
      })
      const defaultId = Object.keys(
        result.current.styleSets[networkId].styles,
      ).find((id) => id !== publicationId) as IdType

      act(() => {
        result.current.setDefault(networkId, 'nodeShape', 'ellipse')
        result.current.switchStyle(networkId, publicationId as IdType)
      })

      // Publication was cloned before the ellipse edit
      expect(result.current.styleSets[networkId].activeStyleId).toBe(
        publicationId,
      )
      expect(
        result.current.visualStyles[networkId].nodeShape.defaultValue,
      ).not.toBe('ellipse')

      act(() => {
        result.current.setDefault(networkId, 'nodeShape', 'diamond')
        result.current.switchStyle(networkId, defaultId)
      })
      expect(
        result.current.visualStyles[networkId].nodeShape.defaultValue,
      ).toBe('ellipse')

      act(() => {
        result.current.switchStyle(networkId, publicationId as IdType)
      })
      expect(
        result.current.visualStyles[networkId].nodeShape.defaultValue,
      ).toBe('diamond')
    })

    it('switchStyle should clear the undo/redo history of the network', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const { result: undoResult } = renderHook(() => useUndoStore())
      let publicationId: IdType | undefined
      act(() => {
        result.current.add(networkId, createVisualStyle())
        publicationId = result.current.createStyle(networkId, 'Publication')
        undoResult.current.addStack(networkId, {
          undoStack: [
            {
              undoCommand: 'SET_DEFAULT_VP_VALUE' as any,
              description: 'test',
              undoParams: [],
              redoParams: [],
            },
          ],
          redoStack: [],
        })
      })
      expect(
        undoResult.current.undoRedoStacks[networkId].undoStack,
      ).toHaveLength(1)

      act(() => {
        result.current.switchStyle(networkId, publicationId as IdType)
      })
      expect(
        undoResult.current.undoRedoStacks[networkId].undoStack,
      ).toHaveLength(0)
    })

    it('switchStyle should ignore unknown styles and unknown networks', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.switchStyle(networkId, 'nonexistent-style')
        result.current.switchStyle('nonexistent-network', 'x')
      })
      expect(result.current.styleSets[networkId]).toBeDefined()
      expect(result.current.visualStyles[networkId]).toBeDefined()
    })

    it('createStyle should de-duplicate names', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.createStyle(networkId)
        result.current.createStyle(networkId)
      })
      const names = Object.values(
        result.current.styleSets[networkId].styles,
      ).map((entry) => entry.name)
      expect(names).toContain('New Style')
      expect(names).toContain('New Style 2')
    })

    it('createStyle should return undefined for an unknown network', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      let newId: IdType | undefined = 'sentinel'
      act(() => {
        newId = result.current.createStyle('nonexistent-network')
      })
      expect(newId).toBeUndefined()
    })

    it('duplicateStyle should copy the active style content', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.setDefault(networkId, 'nodeShape', 'ellipse')
      })
      const activeId = result.current.styleSets[networkId].activeStyleId
      let copyId: IdType | undefined
      act(() => {
        copyId = result.current.duplicateStyle(networkId, activeId)
      })
      const copy = result.current.styleSets[networkId].styles[copyId as IdType]
      expect(copy.name).toBe(`Copy of ${DEFAULT_STYLE_NAME}`)
      expect(copy.visualStyle?.nodeShape.defaultValue).toBe('ellipse')

      // The copy must be independent of the active working copy
      act(() => {
        result.current.setDefault(networkId, 'nodeShape', 'diamond')
      })
      expect(
        result.current.styleSets[networkId].styles[copyId as IdType].visualStyle
          ?.nodeShape.defaultValue,
      ).toBe('ellipse')
    })

    it('duplicateStyle should copy an INACTIVE style content', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      let publicationId: IdType | undefined
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.setDefault(networkId, 'nodeShape', 'ellipse')
        // snapshot of the ellipse style becomes the inactive 'Publication'
        publicationId = result.current.createStyle(networkId, 'Publication')
        result.current.setDefault(networkId, 'nodeShape', 'diamond')
      })
      let copyId: IdType | undefined
      act(() => {
        copyId = result.current.duplicateStyle(
          networkId,
          publicationId as IdType,
        )
      })
      expect(copyId).toBeDefined()
      const copy =
        result.current.styleSets[networkId].styles[copyId as IdType]
      expect(copy.name).toBe('Copy of Publication')
      expect(copy.visualStyle?.nodeShape.defaultValue).toBe('ellipse')
    })

    it('createStyle/duplicateStyle/importStyle should refuse beyond the style cap', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const activeStyle = createVisualStyle()
      // Build a set already at the cap (importer rejects larger sets, so
      // the store must refuse to grow past it)
      const styles: Record<string, any> = {}
      for (let i = 0; i < 50; i++) {
        styles[`style-${i}`] = {
          id: `style-${i}`,
          name: `Style ${i}`,
          visualStyle: createVisualStyle(),
        }
      }
      styles['style-0'].visualStyle = activeStyle
      act(() => {
        result.current.add(networkId, activeStyle, {
          activeStyleId: 'style-0',
          styles,
        })
      })

      let created: IdType | undefined = 'sentinel'
      let duplicated: IdType | undefined = 'sentinel'
      let imported: IdType | undefined = 'sentinel'
      act(() => {
        created = result.current.createStyle(networkId, 'Too Many')
        duplicated = result.current.duplicateStyle(networkId, 'style-1')
        imported = result.current.importStyle(
          networkId,
          'Too Many',
          createVisualStyle(),
        )
      })
      expect(created).toBeUndefined()
      expect(duplicated).toBeUndefined()
      expect(imported).toBeUndefined()
      expect(
        Object.keys(result.current.styleSets[networkId].styles),
      ).toHaveLength(50)
    })

    it('renameStyle should de-duplicate against sibling names', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      let otherId: IdType | undefined
      act(() => {
        result.current.add(networkId, createVisualStyle())
        otherId = result.current.createStyle(networkId, 'Publication')
        result.current.renameStyle(
          networkId,
          otherId as IdType,
          DEFAULT_STYLE_NAME,
        )
      })
      expect(
        result.current.styleSets[networkId].styles[otherId as IdType].name,
      ).toBe(`${DEFAULT_STYLE_NAME} 2`)
    })

    it('deleteStyle should refuse to delete the last style', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle())
      })
      const onlyId = result.current.styleSets[networkId].activeStyleId
      act(() => {
        result.current.deleteStyle(networkId, onlyId)
      })
      expect(result.current.styleSets[networkId].styles[onlyId]).toBeDefined()
      expect(result.current.visualStyles[networkId]).toBeDefined()
    })

    it('deleteStyle should promote another style when deleting the active one', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      let publicationId: IdType | undefined
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.setDefault(networkId, 'nodeShape', 'ellipse')
        publicationId = result.current.createStyle(networkId, 'Publication')
        result.current.switchStyle(networkId, publicationId as IdType)
        result.current.setDefault(networkId, 'nodeShape', 'diamond')
      })
      act(() => {
        result.current.deleteStyle(networkId, publicationId as IdType)
      })
      const setState = result.current.styleSets[networkId]
      expect(setState.styles[publicationId as IdType]).toBeUndefined()
      expect(Object.values(setState.styles)).toHaveLength(1)
      // The remaining (previously inactive) style is active again with its
      // own content restored in the working copy
      expect(
        result.current.visualStyles[networkId].nodeShape.defaultValue,
      ).toBe('ellipse')
    })

    it('deleteStyle should remove an inactive style without touching the working copy', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      let publicationId: IdType | undefined
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.setDefault(networkId, 'nodeShape', 'ellipse')
        publicationId = result.current.createStyle(networkId, 'Publication')
      })
      act(() => {
        result.current.deleteStyle(networkId, publicationId as IdType)
      })
      expect(
        result.current.styleSets[networkId].styles[publicationId as IdType],
      ).toBeUndefined()
      expect(
        result.current.visualStyles[networkId].nodeShape.defaultValue,
      ).toBe('ellipse')
    })

    it('importStyle should deep-copy the provided style', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const template = createVisualStyle()
      template.nodeShape.defaultValue = 'ellipse'
      let importedId: IdType | undefined
      act(() => {
        result.current.add(networkId, createVisualStyle())
        importedId = result.current.importStyle(
          networkId,
          'From Library',
          template,
        )
      })
      // Mutating the source after import must not affect the stored copy
      template.nodeShape.defaultValue = 'diamond'
      const entry =
        result.current.styleSets[networkId].styles[importedId as IdType]
      expect(entry.name).toBe('From Library')
      expect(entry.visualStyle?.nodeShape.defaultValue).toBe('ellipse')
    })

    it('getVisualStyleSetSnapshot should assemble the full set', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.setDefault(networkId, 'nodeShape', 'ellipse')
        result.current.createStyle(networkId, 'Publication')
      })
      const snapshot = getVisualStyleSetSnapshot(networkId)
      expect(snapshot).toBeDefined()
      if (snapshot === undefined) return
      const entries = Object.values(snapshot.styles)
      expect(entries).toHaveLength(2)
      // Every entry of the snapshot carries full content
      entries.forEach((entry) => {
        expect(entry.visualStyle).toBeDefined()
      })
      expect(
        snapshot.styles[snapshot.activeStyleId].visualStyle.nodeShape
          .defaultValue,
      ).toBe('ellipse')
    })

    it('getVisualStyleSetSnapshot should return undefined for unknown networks', () => {
      expect(getVisualStyleSetSnapshot('nonexistent-network')).toBeUndefined()
    })

    it('delete should remove the style set as well', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.delete(networkId)
      })
      expect(result.current.styleSets[networkId]).toBeUndefined()
    })

    it('deleteAll should remove all style sets', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      act(() => {
        result.current.add(networkId, createVisualStyle())
        result.current.add('network-2', createVisualStyle())
        result.current.deleteAll()
      })
      expect(result.current.styleSets).toEqual({})
    })

    it('createStyleSet helper output should be accepted by add', () => {
      const { result } = renderHook(() => useVisualStyleStore())
      const visualStyle = createVisualStyle()
      const styleSet = createStyleSet(visualStyle, 'Imported')
      act(() => {
        result.current.add(networkId, visualStyle, styleSet)
      })
      const setState = result.current.styleSets[networkId]
      expect(setState.styles[setState.activeStyleId].name).toBe('Imported')
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
