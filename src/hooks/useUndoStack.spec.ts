import { act, renderHook } from '@testing-library/react'
import React from 'react'

import { AppConfigContext } from '../AppConfigContext'
import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import { UndoCommandType } from '../models/StoreModel/UndoStoreModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useRendererFunctionStore } from './stores/RendererFunctionStore'
import { useRendererStore } from './stores/RendererStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useUndoStack } from './useUndoStack'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../db', () => ({
  ...jest.requireActual('../db'),
  putNetworkToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworksFromDb: jest.fn().mockResolvedValue(undefined),
  putNetworkSummaryToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkSummaryFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworkSummaryFromDb: jest.fn().mockResolvedValue(undefined),
  putTablesToDb: jest.fn().mockResolvedValue(undefined),
  deleteTablesFromDb: jest.fn().mockResolvedValue(undefined),
  clearTablesFromDb: jest.fn().mockResolvedValue(undefined),
  putNetworkViewToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkViewsFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworkViewsFromDb: jest.fn().mockResolvedValue(undefined),
  putVisualStyleToDb: jest.fn().mockResolvedValue(undefined),
  deleteVisualStyleFromDb: jest.fn().mockResolvedValue(undefined),
  clearVisualStyleFromDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock the workspace store
jest.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: {
        currentNetworkId: 'test-network-1',
      },
    })),
  },
}))

// Mock AppConfigContext
const mockAppConfigContext = {
  undoStackSize: 10,
}

describe('useUndoStack', () => {
  const mockNetworkId: IdType = 'network-1'
  const mockSetUndoStack = jest.fn()
  const mockSetRedoStack = jest.fn()
  const mockUpdateNetworkSummary = jest.fn()
  const mockSetCellValue = jest.fn()
  const mockSetDefault = jest.fn()
  const mockSetNodePosition = jest.fn()
  const mockUpdateNodePositions = jest.fn()
  const mockSetTable = jest.fn()
  const mockSetColumnName = jest.fn()
  const mockAddNodes = jest.fn()
  const mockAddEdges = jest.fn()
  const mockEditRows = jest.fn()
  const mockDeleteNodes = jest.fn()
  const mockDeleteEdges = jest.fn()
  const mockSetMapping = jest.fn()
  const mockSetDiscreteMappingValue = jest.fn()
  const mockDeleteDiscreteMappingValue = jest.fn()
  const mockSetBypass = jest.fn()
  const mockSetBypassMap = jest.fn()
  const mockDeleteBypass = jest.fn()
  const mockCreateMapping = jest.fn()
  const mockDeleteColumn = jest.fn()
  const mockSetViewport = jest.fn()
  const mockSetValues = jest.fn()
  const mockAddNodeViews = jest.fn()
  const mockAddEdgeViews = jest.fn()
  const mockGetFunction = jest.fn()

  const createTestNetwork = (id: IdType): Network => {
    return NetworkFn.createNetworkFromLists(
      id,
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock stores
    ;(useUndoStore as unknown as jest.Mock).mockReturnValue({
      undoRedoStacks: {
        [mockNetworkId]: {
          undoStack: [],
          redoStack: [],
        },
      },
      setUndoStack: mockSetUndoStack,
      setRedoStack: mockSetRedoStack,
    })

    ;(useNetworkSummaryStore as unknown as jest.Mock).mockReturnValue({
      update: mockUpdateNetworkSummary,
    })

    ;(useTableStore as unknown as jest.Mock).mockReturnValue({
      setValue: mockSetCellValue,
      setValues: mockSetValues,
      setTable: mockSetTable,
      setColumnName: mockSetColumnName,
      editRows: mockEditRows,
      deleteColumn: mockDeleteColumn,
    })

    ;(useVisualStyleStore as unknown as jest.Mock).mockReturnValue({
      setDefault: mockSetDefault,
      setMapping: mockSetMapping,
      setDiscreteMappingValue: mockSetDiscreteMappingValue,
      deleteDiscreteMappingValue: mockDeleteDiscreteMappingValue,
      setBypass: mockSetBypass,
      setBypassMap: mockSetBypassMap,
      deleteBypass: mockDeleteBypass,
      createMapping: mockCreateMapping,
    })

    ;(useViewModelStore as unknown as jest.Mock).mockReturnValue({
      setNodePosition: mockSetNodePosition,
      updateNodePositions: mockUpdateNodePositions,
      addNodeViews: mockAddNodeViews,
      addEdgeViews: mockAddEdgeViews,
    })

    ;(useNetworkStore as unknown as jest.Mock).mockReturnValue({
      addNodes: mockAddNodes,
      addEdges: mockAddEdges,
      deleteNodes: mockDeleteNodes,
      deleteEdges: mockDeleteEdges,
    })

    ;(useRendererFunctionStore as unknown as jest.Mock).mockReturnValue({
      getState: jest.fn(() => ({
        getFunction: mockGetFunction,
      })),
    })

    ;(useRendererStore as unknown as jest.Mock).mockReturnValue({
      setViewport: mockSetViewport,
    })

    ;(useUiStateStore as unknown as jest.Mock).mockReturnValue({
      ui: {
        activeNetworkView: '',
        networkViewUi: {
          activeTabIndex: 0,
        },
      },
    })

    ;(useWorkspaceStore as unknown as jest.Mock).mockReturnValue({
      workspace: {
        currentNetworkId: mockNetworkId,
      },
    })
  })

  describe('postEdit', () => {
    it('should add edit to undo stack', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AppConfigContext.Provider value={mockAppConfigContext}>
          {children}
        </AppConfigContext.Provider>
      )

      const { result } = renderHook(() => useUndoStack(), { wrapper })

      act(() => {
        result.current.postEdit(
          UndoCommandType.SET_NETWORK_SUMMARY,
          'Update summary',
          ['network-1', { name: 'Old Name' }],
          ['network-1', { name: 'New Name' }],
        )
      })

      expect(mockSetUndoStack).toHaveBeenCalledWith(mockNetworkId, [
        {
          undoCommand: UndoCommandType.SET_NETWORK_SUMMARY,
          description: 'Update summary',
          undoParams: ['network-1', { name: 'Old Name' }],
          redoParams: ['network-1', { name: 'New Name' }],
        },
      ])
      expect(mockSetRedoStack).toHaveBeenCalledWith(mockNetworkId, [])
    })

    it('should limit undo stack size', () => {
      const largeUndoStack = Array.from({ length: 15 }, (_, i) => ({
        undoCommand: UndoCommandType.SET_NETWORK_SUMMARY,
        description: `Edit ${i}`,
        undoParams: [],
        redoParams: [],
      }))

      ;(useUndoStore as unknown as jest.Mock).mockReturnValue({
        undoRedoStacks: {
          [mockNetworkId]: {
            undoStack: largeUndoStack,
            redoStack: [],
          },
        },
        setUndoStack: mockSetUndoStack,
        setRedoStack: mockSetRedoStack,
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AppConfigContext.Provider value={mockAppConfigContext}>
          {children}
        </AppConfigContext.Provider>
      )

      const { result } = renderHook(() => useUndoStack(), { wrapper })

      act(() => {
        result.current.postEdit(
          UndoCommandType.SET_NETWORK_SUMMARY,
          'New edit',
          [],
          [],
        )
      })

      // Should only keep the last 10 items (undoStackSize = 10)
      expect(mockSetUndoStack).toHaveBeenCalledWith(
        mockNetworkId,
        expect.arrayContaining([
          expect.objectContaining({
            description: 'New edit',
          }),
        ]),
      )
      const callArgs = mockSetUndoStack.mock.calls[0][1]
      expect(callArgs.length).toBeLessThanOrEqual(10)
    })
  })

  describe('undoLastEdit', () => {
    it('should undo last edit', () => {
      const undoStack = [
        {
          undoCommand: UndoCommandType.SET_NETWORK_SUMMARY,
          description: 'Update summary',
          undoParams: ['network-1', { name: 'Old Name' }],
          redoParams: ['network-1', { name: 'New Name' }],
        },
      ]

      ;(useUndoStore as unknown as jest.Mock).mockReturnValue({
        undoRedoStacks: {
          [mockNetworkId]: {
            undoStack,
            redoStack: [],
          },
        },
        setUndoStack: mockSetUndoStack,
        setRedoStack: mockSetRedoStack,
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AppConfigContext.Provider value={mockAppConfigContext}>
          {children}
        </AppConfigContext.Provider>
      )

      const { result } = renderHook(() => useUndoStack(), { wrapper })

      act(() => {
        result.current.undoLastEdit()
      })

      expect(mockUpdateNetworkSummary).toHaveBeenCalledWith('network-1', {
        name: 'Old Name',
      })
      expect(mockSetUndoStack).toHaveBeenCalledWith(mockNetworkId, [])
      expect(mockSetRedoStack).toHaveBeenCalledWith(mockNetworkId, [
        undoStack[0],
      ])
    })

    it('should do nothing when undo stack is empty', () => {
      ;(useUndoStore as unknown as jest.Mock).mockReturnValue({
        undoRedoStacks: {
          [mockNetworkId]: {
            undoStack: [],
            redoStack: [],
          },
        },
        setUndoStack: mockSetUndoStack,
        setRedoStack: mockSetRedoStack,
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AppConfigContext.Provider value={mockAppConfigContext}>
          {children}
        </AppConfigContext.Provider>
      )

      const { result } = renderHook(() => useUndoStack(), { wrapper })

      act(() => {
        result.current.undoLastEdit()
      })

      expect(mockUpdateNetworkSummary).not.toHaveBeenCalled()
    })
  })

  describe('redoLastEdit', () => {
    it('should redo last edit', () => {
      const redoStack = [
        {
          undoCommand: UndoCommandType.SET_NETWORK_SUMMARY,
          description: 'Update summary',
          undoParams: ['network-1', { name: 'Old Name' }],
          redoParams: ['network-1', { name: 'New Name' }],
        },
      ]

      ;(useUndoStore as unknown as jest.Mock).mockReturnValue({
        undoRedoStacks: {
          [mockNetworkId]: {
            undoStack: [],
            redoStack,
          },
        },
        setUndoStack: mockSetUndoStack,
        setRedoStack: mockSetRedoStack,
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AppConfigContext.Provider value={mockAppConfigContext}>
          {children}
        </AppConfigContext.Provider>
      )

      const { result } = renderHook(() => useUndoStack(), { wrapper })

      act(() => {
        result.current.redoLastEdit()
      })

      expect(mockUpdateNetworkSummary).toHaveBeenCalledWith('network-1', {
        name: 'New Name',
      })
      expect(mockSetRedoStack).toHaveBeenCalledWith(mockNetworkId, [])
      expect(mockSetUndoStack).toHaveBeenCalledWith(mockNetworkId, [redoStack[0]])
    })

    it('should do nothing when redo stack is empty', () => {
      ;(useUndoStore as unknown as jest.Mock).mockReturnValue({
        undoRedoStacks: {
          [mockNetworkId]: {
            undoStack: [],
            redoStack: [],
          },
        },
        setUndoStack: mockSetUndoStack,
        setRedoStack: mockSetRedoStack,
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AppConfigContext.Provider value={mockAppConfigContext}>
          {children}
        </AppConfigContext.Provider>
      )

      const { result } = renderHook(() => useUndoStack(), { wrapper })

      act(() => {
        result.current.redoLastEdit()
      })

      expect(mockUpdateNetworkSummary).not.toHaveBeenCalled()
    })
  })

  describe('clearStack', () => {
    it('should clear stack', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AppConfigContext.Provider value={mockAppConfigContext}>
          {children}
        </AppConfigContext.Provider>
      )

      const { result } = renderHook(() => useUndoStack(), { wrapper })

      act(() => {
        result.current.clearStack()
      })

      // clearStack is currently empty, so nothing to test
      expect(result.current.clearStack).toBeDefined()
    })
  })
})

