// src/app-api/useElementApi.test.ts
// Trivial hook test: verifies hook returns core elementApi object.
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { elementApi } from './core/elementApi'
import { useElementApi } from './useElementApi'

// Mock all stores so the core module can be imported in a test environment
vi.mock('../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: { getState: vi.fn(() => ({ networks: new Map() })) },
}))
vi.mock('../data/hooks/stores/TableStore', () => ({
  useTableStore: { getState: vi.fn(() => ({ tables: {} })) },
}))
vi.mock('../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: vi.fn(() => ({
      viewModels: {},
      deleteObjects: vi.fn(),
      addNodeView: vi.fn(),
      addEdgeView: vi.fn(),
      exclusiveSelect: vi.fn(),
      getViewModel: vi.fn(),
    })),
  },
}))
vi.mock('../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: vi.fn(() => ({ visualStyles: {}, deleteBypass: vi.fn() })),
  },
}))
vi.mock('../data/hooks/stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: {
    getState: vi.fn(() => ({ update: vi.fn() })),
  },
}))
vi.mock('../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: vi.fn(() => ({
      undoRedoStacks: {},
      setUndoStack: vi.fn(),
      setRedoStack: vi.fn(),
    })),
  },
}))
vi.mock('../data/hooks/stores/UiStateStore', () => ({
  useUiStateStore: {
    getState: vi.fn(() => ({ ui: { activeNetworkView: '' } })),
  },
}))
vi.mock('../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({ workspace: { currentNetworkId: '' } })),
  },
}))
vi.mock('../models/CyNetworkModel', () => ({
  createNodesCore: vi.fn(),
  createEdgesCore: vi.fn(),
  deleteNodesCore: vi.fn().mockReturnValue({
    deletedNodeIds: [],
    deletedEdges: [],
    deletedNodeViews: [],
    deletedEdgeViews: [],
    deletedNodeRows: new Map(),
    deletedEdgeRows: new Map(),
  }),
  deleteEdgesCore: vi.fn().mockReturnValue({
    deletedEdgeIds: [],
    deletedEdgeViews: [],
    deletedEdgeRows: new Map(),
  }),
}))

describe('useElementApi', () => {
  it('returns the core elementApi object', () => {
    const { result } = renderHook(() => useElementApi())
    expect(result.current).toBe(elementApi)
  })
})
