import { act, renderHook } from '@testing-library/react'

import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import { useHcxValidatorStore } from '../features/HierarchyViewer/store/HcxValidatorStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useWorkspaceManager } from './useWorkspaceManager'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../db', () => ({
  ...jest.requireActual('../db'),
  putNetworkToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworksFromDb: jest.fn().mockResolvedValue(undefined),
  putNetworkSummaryToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkSummaryFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworkSummaryFromDb: jest.fn().mockResolvedValue(undefined),
  putNetworkViewToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkViewsFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworkViewsFromDb: jest.fn().mockResolvedValue(undefined),
  putVisualStyleToDb: jest.fn().mockResolvedValue(undefined),
  deleteVisualStyleFromDb: jest.fn().mockResolvedValue(undefined),
  clearVisualStyleFromDb: jest.fn().mockResolvedValue(undefined),
  putTablesToDb: jest.fn().mockResolvedValue(undefined),
  deleteTablesFromDb: jest.fn().mockResolvedValue(undefined),
  clearTablesFromDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock the hierarchy viewer store
jest.mock('../features/HierarchyViewer/store/HcxValidatorStore', () => ({
  useHcxValidatorStore: jest.fn(),
}))

// Mock the workspace store
jest.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    subscribe: jest.fn(),
    getState: jest.fn(() => ({
      workspace: {
        currentNetworkId: 'test-network-1',
        networkIds: ['test-network-1'],
      },
    })),
  },
}))

describe('useWorkspaceManager', () => {
  const createTestNetwork = (id: IdType): Network => {
    return NetworkFn.createNetworkFromLists(
      id,
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
  }

  const mockDeleteNetwork = jest.fn()
  const mockDeleteSummary = jest.fn()
  const mockDeleteView = jest.fn()
  const mockDeleteVisualStyle = jest.fn()
  const mockDeleteTables = jest.fn()
  const mockDeleteAllNetworks = jest.fn()
  const mockDeleteAllSummaries = jest.fn()
  const mockDeleteAllViews = jest.fn()
  const mockDeleteAllVisualStyles = jest.fn()
  const mockDeleteAllTables = jest.fn()
  const mockDeleteAspects = jest.fn()
  const mockDeleteNetworkModifiedStatus = jest.fn()
  const mockDeleteAllNetworkModifiedStatuses = jest.fn()
  const mockDeleteValidationResult = jest.fn()
  const mockDeleteAllValidationResults = jest.fn()
  const mockSetActiveNetworkView = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock network store
    ;(useNetworkStore as unknown as jest.Mock).mockReturnValue({
      delete: mockDeleteNetwork,
      deleteAll: mockDeleteAllNetworks,
    })

    // Mock summary store
    ;(useNetworkSummaryStore as unknown as jest.Mock).mockReturnValue({
      delete: mockDeleteSummary,
      deleteAll: mockDeleteAllSummaries,
    })

    // Mock view model store
    ;(useViewModelStore as unknown as jest.Mock).mockReturnValue({
      delete: mockDeleteView,
      deleteAll: mockDeleteAllViews,
    })

    // Mock visual style store
    ;(useVisualStyleStore as unknown as jest.Mock).mockReturnValue({
      delete: mockDeleteVisualStyle,
      deleteAll: mockDeleteAllVisualStyles,
    })

    // Mock table store
    ;(useTableStore as unknown as jest.Mock).mockReturnValue({
      delete: mockDeleteTables,
      deleteAll: mockDeleteAllTables,
    })

    // Mock opaque aspect store
    ;(useOpaqueAspectStore as unknown as jest.Mock).mockReturnValue({
      delete: mockDeleteAspects,
    })

    // Mock workspace store
    ;(useWorkspaceStore as unknown as jest.Mock).mockReturnValue({
      deleteNetworkModifiedStatus: mockDeleteNetworkModifiedStatus,
      deleteAllNetworkModifiedStatuses: mockDeleteAllNetworkModifiedStatuses,
    })

    // Mock UI state store
    ;(useUiStateStore as unknown as jest.Mock).mockReturnValue({
      setActiveNetworkView: mockSetActiveNetworkView,
      ui: {
        activeNetworkView: '',
      },
    })

    // Mock HCX validator store
    ;(useHcxValidatorStore as unknown as jest.Mock).mockReturnValue({
      deleteValidationResult: mockDeleteValidationResult,
      deleteAllValidationResults: mockDeleteAllValidationResults,
      validationResults: {},
    })
  })

  it('should handle network deletion from workspace', () => {
    const mockNetworkIds = ['network-1', 'network-2']
    const mockLastNetworkIds = ['network-1', 'network-2', 'network-3']

    let subscriber: (ids: string[], lastIds: string[]) => void
    ;(useWorkspaceStore.subscribe as jest.Mock).mockImplementation(
      (selector, callback) => {
        subscriber = callback
        return jest.fn() // unsubscribe function
      },
    )

    renderHook(() => useWorkspaceManager())

    // Trigger network deletion
    if (subscriber!) {
      subscriber(mockNetworkIds, mockLastNetworkIds)
    }

    expect(mockDeleteNetwork).toHaveBeenCalledWith('network-3')
    expect(mockDeleteSummary).toHaveBeenCalledWith('network-3')
    expect(mockDeleteView).toHaveBeenCalledWith('network-3')
    expect(mockDeleteVisualStyle).toHaveBeenCalledWith('network-3')
    expect(mockDeleteTables).toHaveBeenCalledWith('network-3')
    expect(mockDeleteNetworkModifiedStatus).toHaveBeenCalledWith('network-3')
    expect(mockDeleteAspects).toHaveBeenCalledWith('network-3')
  })

  it('should clear active network view when deleted network is active', () => {
    const mockNetworkIds: string[] = []
    const mockLastNetworkIds = ['network-1']

    ;(useUiStateStore as unknown as jest.Mock).mockReturnValue({
      setActiveNetworkView: mockSetActiveNetworkView,
      ui: {
        activeNetworkView: 'network-1',
      },
    })

    let subscriber: (ids: string[], lastIds: string[]) => void
    ;(useWorkspaceStore.subscribe as jest.Mock).mockImplementation(
      (selector, callback) => {
        subscriber = callback
        return jest.fn()
      },
    )

    renderHook(() => useWorkspaceManager())

    if (subscriber!) {
      subscriber(mockNetworkIds, mockLastNetworkIds)
    }

    expect(mockSetActiveNetworkView).toHaveBeenCalledWith('')
  })

  it('should delete validation result when network is deleted', () => {
    const mockNetworkIds: string[] = []
    const mockLastNetworkIds = ['network-1']

    ;(useHcxValidatorStore as unknown as jest.Mock).mockReturnValue({
      deleteValidationResult: mockDeleteValidationResult,
      deleteAllValidationResults: mockDeleteAllValidationResults,
      validationResults: {
        'network-1': { isValid: true },
      },
    })

    let subscriber: (ids: string[], lastIds: string[]) => void
    ;(useWorkspaceStore.subscribe as jest.Mock).mockImplementation(
      (selector, callback) => {
        subscriber = callback
        return jest.fn()
      },
    )

    renderHook(() => useWorkspaceManager())

    if (subscriber!) {
      subscriber(mockNetworkIds, mockLastNetworkIds)
    }

    expect(mockDeleteValidationResult).toHaveBeenCalledWith('network-1')
  })

  it('should handle deletion of all networks', () => {
    const mockNetworkIds: string[] = []
    const mockLastNetworkIds = ['network-1', 'network-2']

    let subscriber: (ids: string[], lastIds: string[]) => void
    ;(useWorkspaceStore.subscribe as jest.Mock).mockImplementation(
      (selector, callback) => {
        subscriber = callback
        return jest.fn()
      },
    )

    renderHook(() => useWorkspaceManager())

    if (subscriber!) {
      subscriber(mockNetworkIds, mockLastNetworkIds)
    }

    expect(mockDeleteAllNetworks).toHaveBeenCalled()
    expect(mockDeleteAllSummaries).toHaveBeenCalled()
    expect(mockDeleteAllViews).toHaveBeenCalled()
    expect(mockDeleteAllVisualStyles).toHaveBeenCalled()
    expect(mockDeleteAllTables).toHaveBeenCalled()
    expect(mockDeleteAllNetworkModifiedStatuses).toHaveBeenCalled()
    expect(mockDeleteAllValidationResults).toHaveBeenCalled()
    expect(mockSetActiveNetworkView).toHaveBeenCalledWith('')
  })

  it('should update active network view when current network ID changes', () => {
    let subscriber: (id: string, lastId: string) => void
    ;(useWorkspaceStore.subscribe as jest.Mock).mockImplementation(
      (selector, callback) => {
        // Check if it's the currentNetworkId subscriber
        if (selector.toString().includes('currentNetworkId')) {
          subscriber = callback
        }
        return jest.fn()
      },
    )

    renderHook(() => useWorkspaceManager())

    if (subscriber!) {
      subscriber('network-2', 'network-1')
    }

    expect(mockSetActiveNetworkView).toHaveBeenCalledWith('network-2')
  })

  it('should clear active network view when current network ID is empty', () => {
    let subscriber: (id: string, lastId: string) => void
    ;(useWorkspaceStore.subscribe as jest.Mock).mockImplementation(
      (selector, callback) => {
        if (selector.toString().includes('currentNetworkId')) {
          subscriber = callback
        }
        return jest.fn()
      },
    )

    renderHook(() => useWorkspaceManager())

    if (subscriber!) {
      subscriber('', 'network-1')
    }

    expect(mockSetActiveNetworkView).toHaveBeenCalledWith('')
  })
})

