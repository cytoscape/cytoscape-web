// src/app-api/core/visualStyleApi.styleSet.test.ts
//
// applyVisualStyle / getVisualStyle against the REAL VisualStyleStore.
//
// Separate from visualStyleApi.test.ts, which replaces the whole store with
// hand-written fakes: the properties these methods have to guarantee — the
// style is deep-copied, bypasses are stripped, the copy becomes active — are
// properties of `importStyle` and `switchStyle` themselves, so a faked store
// would only test the fake. Only WorkspaceStore (the modified flag) and
// UndoStore (the undo entry) are mocked here, because those are what the
// assertions read.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IdType } from '../../models/IdType'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import {
  MAX_STYLES_PER_NETWORK,
  VisualPropertyName,
  VisualStyle,
  VisualStyleSet,
} from '../../models/VisualStyleModel'
import { createVisualStyle } from '../../models/VisualStyleModel/impl/visualStyleFnImpl'
import { AppCodes } from '../types/ApiResult'

vi.mock('../../data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/db')>()
  return {
    ...actual,
    putVisualStyleSetToDb: vi.fn().mockResolvedValue(undefined),
    putUndoRedoStackToDb: vi.fn().mockResolvedValue(undefined),
    deleteVisualStyleFromDb: vi.fn().mockResolvedValue(undefined),
    clearVisualStyleFromDb: vi.fn().mockResolvedValue(undefined),
  }
})

const mockSetNetworkModified = vi.fn()
const mockNetworkModified: Record<string, boolean> = {}

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      workspace: {
        currentNetworkId: 'net1',
        networkModified: mockNetworkModified,
      },
      setNetworkModified: mockSetNetworkModified,
    })),
  },
}))

const mockSetUndoStack = vi.fn()
const mockSetRedoStack = vi.fn()
const mockAddStack = vi.fn()

vi.mock('../../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: vi.fn(() => ({
      undoRedoStacks: {},
      setUndoStack: mockSetUndoStack,
      setRedoStack: mockSetRedoStack,
      addStack: mockAddStack,
    })),
  },
}))

// Imported after the mocks so the store picks them up
const { useVisualStyleStore } = await import(
  '../../data/hooks/stores/VisualStyleStore'
)
const { visualStyleApi } = await import('./visualStyleApi')

const VPN = VisualPropertyName

/** Register a network with a single default style, as network loading does. */
const registerNetwork = (networkId: IdType): void => {
  useVisualStyleStore.getState().add(networkId, createVisualStyle())
}

const activeStyleOf = (networkId: IdType): VisualStyle =>
  useVisualStyleStore.getState().visualStyles[networkId]

const styleSetOf = (networkId: IdType) =>
  useVisualStyleStore.getState().styleSets[networkId]

/**
 * A style distinguishable from the default one, with a bypass and a mapping,
 * so a copy can be told apart from what it replaced.
 */
const sourceStyle = (): VisualStyle => {
  const style = createVisualStyle()
  return {
    ...style,
    [VPN.NodeBackgroundColor]: {
      ...style[VPN.NodeBackgroundColor],
      defaultValue: '#123456',
      bypassMap: new Map([['n1', '#ff0000']]),
    },
    [VPN.NodeLabel]: {
      ...style[VPN.NodeLabel],
      mapping: {
        type: 'passthrough',
        attribute: 'name',
        visualPropertyType: 'string',
        defaultValue: '',
      },
    },
  } as VisualStyle
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(mockNetworkModified).forEach((k) => delete mockNetworkModified[k])
  useVisualStyleStore.getState().deleteAll()
})

describe('getVisualStyle', () => {
  it('fails with APP1 for a network with no style in memory', () => {
    const result = visualStyleApi.getVisualStyle('nope')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('returns the active style, bypasses included', () => {
    registerNetwork('net1')
    useVisualStyleStore
      .getState()
      .setBypass('net1', VPN.NodeBackgroundColor, ['n1'], '#ff0000')

    const result = visualStyleApi.getVisualStyle('net1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(
        result.data.visualStyle[VPN.NodeBackgroundColor].bypassMap.get('n1'),
      ).toBe('#ff0000')
    }
  })

  it('returns a detached copy — mutating it does not reach the network', () => {
    registerNetwork('net1')
    const before = activeStyleOf('net1')[VPN.NodeBackgroundColor].defaultValue

    const result = visualStyleApi.getVisualStyle('net1')
    expect(result.success).toBe(true)
    if (!result.success) return

    // The stored style is deeply frozen by Immer; the copy must not be
    result.data.visualStyle[VPN.NodeBackgroundColor].defaultValue = '#abcdef'
    result.data.visualStyle[VPN.NodeBackgroundColor].bypassMap.set(
      'n9',
      '#abcdef',
    )

    expect(activeStyleOf('net1')[VPN.NodeBackgroundColor].defaultValue).toBe(
      before,
    )
    expect(
      activeStyleOf('net1')[VPN.NodeBackgroundColor].bypassMap.has('n9'),
    ).toBe(false)
  })
})

describe('applyVisualStyle', () => {
  it('fails with APP1 for a network with no style in memory', () => {
    const result = visualStyleApi.applyVisualStyle('nope', sourceStyle())

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['an object with no visual property', { notAProperty: 1 }],
    [
      'a property with no group',
      { [VPN.NodeLabel]: { type: 'string', defaultValue: '' } },
    ],
    [
      'a property with an unknown group',
      {
        [VPN.NodeLabel]: {
          group: 'hyperedge',
          type: 'string',
          defaultValue: '',
        },
      },
    ],
    [
      'a property with no defaultValue',
      { [VPN.NodeLabel]: { group: 'node', type: 'string' } },
    ],
    [
      'a mapping with an unknown type',
      {
        [VPN.NodeLabel]: {
          group: 'node',
          type: 'string',
          defaultValue: '',
          mapping: { type: 'quadratic', attribute: 'name' },
        },
      },
    ],
  ])('fails with APP9 for %s', (_label, malformed) => {
    registerNetwork('net1')
    const styleCountBefore = Object.keys(styleSetOf('net1').styles).length

    const result = visualStyleApi.applyVisualStyle(
      'net1',
      malformed as unknown as VisualStyle,
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
    // Rejected before the store was touched
    expect(Object.keys(styleSetOf('net1').styles)).toHaveLength(
      styleCountBefore,
    )
  })

  it('adds the style to the set and makes it active', () => {
    registerNetwork('net1')
    const previousStyleId = styleSetOf('net1').activeStyleId

    const result = visualStyleApi.applyVisualStyle('net1', sourceStyle())

    expect(result.success).toBe(true)
    if (!result.success) return
    const { styleId } = result.data

    expect(Object.keys(styleSetOf('net1').styles)).toHaveLength(2)
    expect(styleSetOf('net1').activeStyleId).toBe(styleId)
    expect(styleId).not.toBe(previousStyleId)
    // The working copy is now the applied style's content
    expect(activeStyleOf('net1')[VPN.NodeBackgroundColor].defaultValue).toBe(
      '#123456',
    )
    expect(activeStyleOf('net1')[VPN.NodeLabel].mapping?.attribute).toBe('name')
  })

  it('leaves the previously active style in the set, unchanged', () => {
    registerNetwork('net1')
    const previousStyleId = styleSetOf('net1').activeStyleId
    const previousColor =
      activeStyleOf('net1')[VPN.NodeBackgroundColor].defaultValue

    visualStyleApi.applyVisualStyle('net1', sourceStyle())

    const parked = styleSetOf('net1').styles[previousStyleId]
    expect(parked).toBeDefined()
    expect(parked.visualStyle?.[VPN.NodeBackgroundColor].defaultValue).toBe(
      previousColor,
    )
  })

  it('copies on assign — later edits to the passed object do not reach the network', () => {
    registerNetwork('net1')
    const passed = sourceStyle()

    visualStyleApi.applyVisualStyle('net1', passed)
    passed[VPN.NodeBackgroundColor].defaultValue = '#999999'

    expect(activeStyleOf('net1')[VPN.NodeBackgroundColor].defaultValue).toBe(
      '#123456',
    )
  })

  it('copies on assign — later edits to the network do not reach the passed object', () => {
    registerNetwork('net1')
    const passed = sourceStyle()

    visualStyleApi.applyVisualStyle('net1', passed)
    visualStyleApi.setDefault('net1', VPN.NodeBackgroundColor, '#999999')

    expect(passed[VPN.NodeBackgroundColor].defaultValue).toBe('#123456')
  })

  it('strips bypasses — they name the source network s elements', () => {
    registerNetwork('net1')

    visualStyleApi.applyVisualStyle('net1', sourceStyle())

    expect(activeStyleOf('net1')[VPN.NodeBackgroundColor].bypassMap.size).toBe(
      0,
    )
  })

  it('names the entry "Imported style" by default and de-duplicates a second copy', () => {
    registerNetwork('net1')

    const first = visualStyleApi.applyVisualStyle('net1', sourceStyle())
    const second = visualStyleApi.applyVisualStyle('net1', sourceStyle())

    expect(first.success && second.success).toBe(true)
    if (!first.success || !second.success) return
    expect(styleSetOf('net1').styles[first.data.styleId].name).toBe(
      'Imported style',
    )
    expect(styleSetOf('net1').styles[second.data.styleId].name).toBe(
      'Imported style 2',
    )
  })

  it('honors the name option', () => {
    registerNetwork('net1')

    const result = visualStyleApi.applyVisualStyle('net1', sourceStyle(), {
      name: 'MCODE cluster',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(styleSetOf('net1').styles[result.data.styleId].name).toBe(
      'MCODE cluster',
    )
  })

  it('records one SWITCH_STYLE undo entry on the target network s stack', () => {
    registerNetwork('net1')
    const previousStyleId = styleSetOf('net1').activeStyleId

    const result = visualStyleApi.applyVisualStyle('net1', sourceStyle())
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(mockSetUndoStack).toHaveBeenCalledTimes(1)
    const [networkId, stack] = mockSetUndoStack.mock.calls[0]
    expect(networkId).toBe('net1')
    expect(stack).toHaveLength(1)
    expect(stack[0].undoCommand).toBe(UndoCommandType.SWITCH_STYLE)
    expect(stack[0].undoParams).toEqual(['net1', previousStyleId])
    expect(stack[0].redoParams).toEqual(['net1', result.data.styleId])
  })

  it('describes the undo entry with the STORED name, not the requested one', () => {
    registerNetwork('net1')
    visualStyleApi.applyVisualStyle('net1', sourceStyle(), { name: 'Blue' })
    mockSetUndoStack.mockClear()

    visualStyleApi.applyVisualStyle('net1', sourceStyle(), { name: 'Blue' })

    const [, stack] = mockSetUndoStack.mock.calls[0]
    expect(stack[0].description).toBe('Switch style to "Blue 2"')
  })

  it('marks the target network modified', () => {
    registerNetwork('net1')

    visualStyleApi.applyVisualStyle('net1', sourceStyle())

    expect(mockSetNetworkModified).toHaveBeenCalledWith('net1', true)
  })

  it('fails with APP14 once the network owns MAX_STYLES_PER_NETWORK styles', () => {
    // Built directly rather than by calling createStyle 49 times: every
    // entry can share one style object, so the fixture costs one clone.
    const shared = createVisualStyle()
    const styles: VisualStyleSet['styles'] = {}
    for (let i = 0; i < MAX_STYLES_PER_NETWORK; i += 1) {
      const id = `style-${i}`
      styles[id] = { id, name: `Style ${i}`, visualStyle: shared }
    }
    useVisualStyleStore
      .getState()
      .add('net1', shared, { activeStyleId: 'style-0', styles })

    const result = visualStyleApi.applyVisualStyle('net1', sourceStyle())

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.STYLE_SET_FULL.code)
      expect(result.error.message).toContain(String(MAX_STYLES_PER_NETWORK))
    }
    expect(Object.keys(styleSetOf('net1').styles)).toHaveLength(
      MAX_STYLES_PER_NETWORK,
    )
    expect(styleSetOf('net1').activeStyleId).toBe('style-0')
  })

  it('carries a style from one network to another', () => {
    registerNetwork('net1')
    registerNetwork('net2')
    useVisualStyleStore
      .getState()
      .setDefault('net1', VPN.NodeBackgroundColor, '#abcdef')

    const read = visualStyleApi.getVisualStyle('net1')
    expect(read.success).toBe(true)
    if (!read.success) return
    const applied = visualStyleApi.applyVisualStyle(
      'net2',
      read.data.visualStyle,
    )

    expect(applied.success).toBe(true)
    expect(activeStyleOf('net2')[VPN.NodeBackgroundColor].defaultValue).toBe(
      '#abcdef',
    )
    // net1 is untouched: its own set still holds exactly one style
    expect(Object.keys(styleSetOf('net1').styles)).toHaveLength(1)
  })
})
