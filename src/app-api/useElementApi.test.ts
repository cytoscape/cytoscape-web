// src/app-api/useElementApi.test.ts
// Trivial hook test: verifies hook returns core elementApi object.

import { renderHook } from '@testing-library/react'

import { elementApi } from './core/elementApi'
import { useElementApi } from './useElementApi'

// Mock all stores so the core module can be imported in a test environment
jest.mock('../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: { getState: jest.fn(() => ({ networks: new Map() })) },
}))
jest.mock('../data/hooks/stores/TableStore', () => ({
  useTableStore: { getState: jest.fn(() => ({ tables: {} })) },
}))
jest.mock('../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: jest.fn(() => ({
      viewModels: {},
      deleteObjects: jest.fn(),
      addNodeView: jest.fn(),
      addEdgeView: jest.fn(),
      exclusiveSelect: jest.fn(),
      getViewModel: jest.fn(),
    })),
  },
}))
jest.mock('../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: jest.fn(() => ({ visualStyles: {}, deleteBypass: jest.fn() })),
  },
}))
jest.mock('../data/hooks/stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: {
    getState: jest.fn(() => ({ update: jest.fn() })),
  },
}))
jest.mock('../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: jest.fn(() => ({
      undoRedoStacks: {},
      setUndoStack: jest.fn(),
      setRedoStack: jest.fn(),
    })),
  },
}))
jest.mock('../data/hooks/stores/UiStateStore', () => ({
  useUiStateStore: {
    getState: jest.fn(() => ({ ui: { activeNetworkView: '' } })),
  },
}))
jest.mock('../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({ workspace: { currentNetworkId: '' } })),
  },
}))
jest.mock('../models/CyNetworkModel', () => ({
  createNodesCore: jest.fn(),
  createEdgesCore: jest.fn(),
  deleteNodesCore: jest.fn().mockReturnValue({
    deletedNodeIds: [],
    deletedEdges: [],
    deletedNodeViews: [],
    deletedEdgeViews: [],
    deletedNodeRows: new Map(),
    deletedEdgeRows: new Map(),
  }),
  deleteEdgesCore: jest.fn().mockReturnValue({
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
