import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useHcxValidatorStore } from '../../features/HierarchyViewer/store/HcxValidatorStore'
import type { CyNetwork } from '../../models/CyNetworkModel'
import type { IdType } from '../../models/IdType'
import { G6Layout } from '../../models/LayoutModel/impl/G6/g6Layout'
import NetworkFn from '../../models/NetworkModel'
import type { NetworkSummary } from '../../models/NetworkSummaryModel'
import { createTable } from '../../models/TableModel/impl/inMemoryTable'
import type { NetworkView } from '../../models/ViewModel'
import type { VisualStyle } from '../../models/VisualStyleModel'
import { useLayoutStore } from './stores/LayoutStore'
import { useMessageStore } from './stores/MessageStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useTableStore } from './stores/TableStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useRegisterNetwork } from './useRegisterNetwork'

// Store persistence must not hit IndexedDB
vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  const mocked: Record<string, any> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

const NET_ID = 'net-1'

const makeCyNetwork = (): CyNetwork => {
  const network = NetworkFn.createNetworkFromLists(
    NET_ID,
    [{ id: 'n1' }, { id: 'n2' }],
    [{ id: 'e1', s: 'n1', t: 'n2' }],
  )
  const viewModel = {
    id: NET_ID,
    viewId: `${NET_ID}-view`,
    type: 'network',
    nodeViews: {},
    edgeViews: {},
    selectedNodes: [],
    selectedEdges: [],
  } as unknown as NetworkView
  return {
    network,
    nodeTable: createTable(`${NET_ID}-nodes`),
    edgeTable: createTable(`${NET_ID}-edges`),
    visualStyle: {} as VisualStyle,
    networkViews: [viewModel],
    undoRedoStack: { undoStack: [], redoStack: [] },
  }
}

const makeSummary = (
  overrides: Partial<NetworkSummary> = {},
): NetworkSummary =>
  ({
    externalId: NET_ID,
    name: 'Test Network',
    properties: [],
    hasLayout: true,
    ...overrides,
  }) as unknown as NetworkSummary

describe('useRegisterNetwork', () => {
  beforeEach(() => {
    act(() => {
      useNetworkStore.getState().deleteAll()
      useTableStore.getState().deleteAll()
      useViewModelStore.getState().deleteAll()
      useVisualStyleStore.getState().deleteAll()
      useNetworkSummaryStore.getState().deleteAll()
      useUndoStore.getState().deleteAllStacks()
      useMessageStore.setState({ messages: [] })
    })
  })

  it('registers every slice of a CyNetwork into its store', () => {
    const cyNetwork = makeCyNetwork()
    const { result } = renderHook(() => useRegisterNetwork())

    act(() => {
      result.current(NET_ID, cyNetwork, makeSummary())
    })

    expect(useNetworkStore.getState().networks.has(NET_ID)).toBe(true)
    expect(useTableStore.getState().tables[NET_ID]).toBeDefined()
    expect(useVisualStyleStore.getState().visualStyles[NET_ID]).toBeDefined()
    expect(useViewModelStore.getState().viewModels[NET_ID]).toBeDefined()
    expect(useNetworkSummaryStore.getState().summaries[NET_ID]).toBeDefined()
    expect(useUndoStore.getState().undoRedoStacks[NET_ID]).toEqual({
      undoStack: [],
      redoStack: [],
    })
  })

  it('does not run a layout when the summary already has one', () => {
    const apply = vi.fn()
    act(() => {
      useLayoutStore.setState({
        layoutEngines: [{ ...G6Layout, apply }] as any,
      })
    })
    const { result } = renderHook(() => useRegisterNetwork())

    act(() => {
      result.current(NET_ID, makeCyNetwork(), makeSummary({ hasLayout: true }))
    })

    expect(apply).toHaveBeenCalledTimes(0)
  })

  it('applies a default layout for a layout-less network and syncs stores on completion', () => {
    // Fake engine: invokes the completion callback synchronously
    const apply = vi.fn(
      (
        _nodes: unknown,
        _edges: unknown,
        afterLayout: (positions: Map<IdType, [number, number]>) => void,
      ) => {
        afterLayout(new Map([['n1', [42, 24]]]))
      },
    )
    act(() => {
      useLayoutStore.setState({
        layoutEngines: [{ ...G6Layout, apply }] as any,
      })
    })
    const { result } = renderHook(() => useRegisterNetwork())

    act(() => {
      result.current(
        NET_ID,
        makeCyNetwork(),
        makeSummary({ hasLayout: false }),
      )
    })

    expect(apply).toHaveBeenCalledTimes(1)
    expect(useNetworkSummaryStore.getState().summaries[NET_ID].hasLayout).toBe(
      true,
    )
    expect(useLayoutStore.getState().isRunning).toBe(false)
  })

  it('flags an invalid HCX network with a warning message and a validation result', () => {
    const hcxSummary = makeSummary({
      properties: [
        // HCX::interactionNetworkUUID marks the network as HCX; a node
        // table without the required HCX columns fails validation.
        {
          predicateString: 'HCX::interactionNetworkUUID',
          value: 'abc-123',
          predicateType: 'string',
        },
        {
          predicateString: 'ndexSchema',
          value: 'hierarchy_v0.1',
          predicateType: 'string',
        },
      ] as unknown as NetworkSummary['properties'],
    })
    const { result } = renderHook(() => useRegisterNetwork())

    act(() => {
      result.current(NET_ID, makeCyNetwork(), hcxSummary)
    })

    const validation =
      useHcxValidatorStore.getState().validationResults[NET_ID]
    expect(validation).toBeDefined()
    expect(validation.isValid).toBe(false)
    expect(
      useMessageStore
        .getState()
        .messages.some((m) => m.message.includes('not a valid HCX network')),
    ).toBe(true)
  })
})
