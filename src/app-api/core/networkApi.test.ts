import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/networkApi.test.ts
// Plain Jest tests for networkApi core — no renderHook, no React context.
import { ApiErrorCode } from '../types/ApiResult'
import { networkApi } from './networkApi'

// ── Mock: uuid ────────────────────────────────────────────────────────────────

vi.mock('uuid', () => ({ v4: () => 'test-uuid' }))

// ── Mock: CX2 validator ───────────────────────────────────────────────────────

const mockValidateCX2 = vi.fn()

vi.mock('../../models/CxModel/impl/validator', () => ({
  validateCX2: (...args: unknown[]) => mockValidateCX2(...args),
}))

// ── Mock: CX2 → CyNetwork converter ──────────────────────────────────────────

const mockCreateCyNetworkFromCx2 = vi.fn()

vi.mock('../../models/CxModel/impl', () => ({
  createCyNetworkFromCx2: (...args: unknown[]) =>
    mockCreateCyNetworkFromCx2(...args),
}))

// ── Mock stores ───────────────────────────────────────────────────────────────

const mockNetworks = new Map<string, any>()
const mockNetworkActions = {
  add: vi.fn(),
  delete: vi.fn(),
  deleteAll: vi.fn(),
}

vi.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: vi.fn(() => ({
      ...mockNetworkActions,
      networks: mockNetworks,
    })),
  },
}))

const mockSummaryActions = {
  add: vi.fn(),
  delete: vi.fn(),
  deleteAll: vi.fn(),
}

vi.mock('../../data/hooks/stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: {
    getState: vi.fn(() => mockSummaryActions),
  },
}))

const mockViewModelActions = {
  add: vi.fn(),
  delete: vi.fn(),
  deleteAll: vi.fn(),
}

vi.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: vi.fn(() => mockViewModelActions),
  },
}))

const mockVisualStyleActions = {
  add: vi.fn(),
  delete: vi.fn(),
  deleteAll: vi.fn(),
  createPassthroughMapping: vi.fn(),
}
const mockVisualStyles: Record<string, any> = {}

vi.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: vi.fn(() => ({
      ...mockVisualStyleActions,
      visualStyles: mockVisualStyles,
    })),
  },
}))

const mockTableActions = {
  add: vi.fn(),
  delete: vi.fn(),
  deleteAll: vi.fn(),
}

vi.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: {
    getState: vi.fn(() => mockTableActions),
  },
}))

const mockOpaqueAspectActions = {
  delete: vi.fn(),
  deleteAll: vi.fn(),
}

vi.mock('../../data/hooks/stores/OpaqueAspectStore', () => ({
  useOpaqueAspectStore: {
    getState: vi.fn(() => mockOpaqueAspectActions),
  },
}))

const mockUndoActions = {
  deleteStack: vi.fn(),
  deleteAllStacks: vi.fn(),
}

vi.mock('../../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: vi.fn(() => mockUndoActions),
  },
}))

let mockActiveNetworkView = ''
const mockUiStateActions = {
  setActiveNetworkView: vi.fn((id: string) => {
    mockActiveNetworkView = id
  }),
}

vi.mock('../../data/hooks/stores/UiStateStore', () => ({
  useUiStateStore: {
    getState: vi.fn(() => ({
      ...mockUiStateActions,
      ui: { activeNetworkView: mockActiveNetworkView },
    })),
  },
}))

let mockWorkspaceState = {
  networkIds: [] as string[],
  currentNetworkId: '',
  id: 'ws1',
}
const mockWorkspaceActions = {
  addNetworkIds: vi.fn((id: string) => {
    mockWorkspaceState.networkIds.push(id)
  }),
  setCurrentNetworkId: vi.fn((id: string) => {
    mockWorkspaceState.currentNetworkId = id
  }),
  deleteNetwork: vi.fn((id: string) => {
    mockWorkspaceState.networkIds = mockWorkspaceState.networkIds.filter(
      (n) => n !== id,
    )
  }),
  deleteAllNetworks: vi.fn(() => {
    mockWorkspaceState.networkIds = []
  }),
  deleteNetworkModifiedStatus: vi.fn(),
  deleteAllNetworkModifiedStatuses: vi.fn(),
}

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      ...mockWorkspaceActions,
      workspace: {
        networkIds: mockWorkspaceState.networkIds,
        currentNetworkId: mockWorkspaceState.currentNetworkId,
        id: mockWorkspaceState.id,
      },
    })),
  },
}))

const mockValidationResults: Record<string, any> = {}
const mockHcxActions = {
  deleteValidationResult: vi.fn((id: string) => {
    delete mockValidationResults[id]
  }),
  deleteAllValidationResults: vi.fn(() => {
    Object.keys(mockValidationResults).forEach(
      (k) => delete mockValidationResults[k],
    )
  }),
}

vi.mock(
  '../../features/HierarchyViewer/store/HcxValidatorStore',
  () => ({
    useHcxValidatorStore: {
      getState: vi.fn(() => ({
        ...mockHcxActions,
        validationResults: mockValidationResults,
      })),
    },
  }),
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFakeCyNetwork(id: string) {
  return {
    network: {
      id,
      nodes: [{ id: '0' }, { id: '1' }],
      edges: [{ id: 'e0', s: '0', t: '1' }],
    },
    networkAttributes: {
      id,
      attributes: { name: 'Test Network', description: 'desc', version: '1' },
    },
    nodeTable: { id, rows: new Map() },
    edgeTable: { id, rows: new Map() },
    visualStyle: {},
    networkViews: [{}],
    undoRedoStack: { undoStack: [], redoStack: [] },
  }
}

function resetMocks() {
  mockNetworks.clear()
  mockWorkspaceState = { networkIds: [], currentNetworkId: '', id: 'ws1' }
  mockActiveNetworkView = ''
  Object.keys(mockValidationResults).forEach(
    (k) => delete mockValidationResults[k],
  )
  vi.clearAllMocks()
  mockValidateCX2.mockReturnValue({ isValid: true, errors: [], warnings: [] })
  mockCreateCyNetworkFromCx2.mockReturnValue(makeFakeCyNetwork('test-uuid'))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('networkApi', () => {
  beforeEach(() => {
    resetMocks()
  })

  // ── createNetworkFromEdgeList ─────────────────────────────────────────────

  describe('createNetworkFromEdgeList', () => {
    const edgeList: Array<[string, string]> = [['A', 'B'], ['B', 'C']]

    it('returns ok with networkId and cyNetwork on success', () => {
      const result = networkApi.createNetworkFromEdgeList({
        name: 'My Network',
        edgeList,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.networkId).toBe('test-uuid')
        expect(result.data.cyNetwork).toBeDefined()
      }
    })

    it('adds to all 5 core stores', () => {
      networkApi.createNetworkFromEdgeList({ name: 'Net', edgeList })
      expect(mockNetworkActions.add).toHaveBeenCalledTimes(1)
      expect(mockVisualStyleActions.add).toHaveBeenCalledTimes(1)
      expect(mockTableActions.add).toHaveBeenCalledTimes(1)
      expect(mockViewModelActions.add).toHaveBeenCalledTimes(1)
      expect(mockSummaryActions.add).toHaveBeenCalledTimes(1)
    })

    it('creates passthrough mapping for node labels', () => {
      networkApi.createNetworkFromEdgeList({ name: 'Net', edgeList })
      expect(mockVisualStyleActions.createPassthroughMapping).toHaveBeenCalledWith(
        'test-uuid',
        expect.any(String), // VisualPropertyName.NodeLabel
        'name',
        expect.any(String), // ValueTypeName.String
      )
    })

    it('does NOT add to workspace by default (addToWorkspace=false)', () => {
      networkApi.createNetworkFromEdgeList({ name: 'Net', edgeList })
      expect(mockWorkspaceActions.addNetworkIds).not.toHaveBeenCalled()
      expect(mockWorkspaceActions.setCurrentNetworkId).not.toHaveBeenCalled()
    })

    it('adds to workspace when addToWorkspace=true', () => {
      networkApi.createNetworkFromEdgeList({
        name: 'Net',
        edgeList,
        addToWorkspace: true,
      })
      expect(mockWorkspaceActions.addNetworkIds).toHaveBeenCalledWith('test-uuid')
      expect(mockWorkspaceActions.setCurrentNetworkId).toHaveBeenCalledWith(
        'test-uuid',
      )
    })

    it('returns fail(InvalidInput) when name is empty', () => {
      const result = networkApi.createNetworkFromEdgeList({
        name: '',
        edgeList,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      }
    })

    it('returns fail(InvalidInput) when name is whitespace only', () => {
      const result = networkApi.createNetworkFromEdgeList({
        name: '   ',
        edgeList,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      }
    })

    it('returns fail(InvalidInput) when edgeList is empty', () => {
      const result = networkApi.createNetworkFromEdgeList({
        name: 'Net',
        edgeList: [],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      }
    })

    it('returns fail(OperationFailed) when a store throws', () => {
      mockNetworkActions.add.mockImplementationOnce(() => {
        throw new Error('store failure')
      })
      const result = networkApi.createNetworkFromEdgeList({
        name: 'Net',
        edgeList,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
      }
    })
  })

  // ── createNetworkFromCx2 ──────────────────────────────────────────────────

  describe('createNetworkFromCx2', () => {
    const fakeCx2 = [{ CXVersion: '2.0', hasFragments: false }, []]

    it('calls validateCX2 before processing', () => {
      networkApi.createNetworkFromCx2({ cxData: fakeCx2 as any })
      expect(mockValidateCX2).toHaveBeenCalledWith(fakeCx2)
    })

    it('returns fail(InvalidCx2) when validation fails', () => {
      mockValidateCX2.mockReturnValueOnce({
        isValid: false,
        errors: [],
        warnings: [],
        errorMessage: 'Bad CX2',
      })
      const result = networkApi.createNetworkFromCx2({ cxData: fakeCx2 as any })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.InvalidCx2)
        expect(result.error.message).toBe('Bad CX2')
      }
    })

    it('returns ok with networkId and cyNetwork on success', () => {
      const result = networkApi.createNetworkFromCx2({ cxData: fakeCx2 as any })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.networkId).toBe('test-uuid')
        expect(result.data.cyNetwork).toBeDefined()
      }
    })

    it('adds to workspace and sets current network by default', () => {
      networkApi.createNetworkFromCx2({ cxData: fakeCx2 as any })
      expect(mockWorkspaceActions.addNetworkIds).toHaveBeenCalledWith('test-uuid')
      expect(mockWorkspaceActions.setCurrentNetworkId).toHaveBeenCalledWith(
        'test-uuid',
      )
    })

    it('skips addNetworkIds when addToWorkspace=false', () => {
      networkApi.createNetworkFromCx2({
        cxData: fakeCx2 as any,
        addToWorkspace: false,
      })
      expect(mockWorkspaceActions.addNetworkIds).not.toHaveBeenCalled()
    })

    it('skips setCurrentNetworkId when navigate=false', () => {
      networkApi.createNetworkFromCx2({
        cxData: fakeCx2 as any,
        navigate: false,
      })
      expect(mockWorkspaceActions.setCurrentNetworkId).not.toHaveBeenCalled()
    })

    it('returns fail(OperationFailed) when converter throws', () => {
      mockCreateCyNetworkFromCx2.mockImplementationOnce(() => {
        throw new Error('convert failure')
      })
      const result = networkApi.createNetworkFromCx2({ cxData: fakeCx2 as any })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
      }
    })
  })

  // ── deleteNetwork ─────────────────────────────────────────────────────────

  describe('deleteNetwork', () => {
    beforeEach(() => {
      // Set up a network to delete
      mockNetworks.set('net1', { id: 'net1' })
      mockWorkspaceState.networkIds = ['net1', 'net2']
      mockWorkspaceState.currentNetworkId = 'net1'
    })

    it('returns ok() when network exists and is deleted', () => {
      const result = networkApi.deleteNetwork('net1')
      expect(result.success).toBe(true)
    })

    it('calls delete on all required stores', () => {
      networkApi.deleteNetwork('net1')
      expect(mockNetworkActions.delete).toHaveBeenCalledWith('net1')
      expect(mockSummaryActions.delete).toHaveBeenCalledWith('net1')
      expect(mockViewModelActions.delete).toHaveBeenCalledWith('net1')
      expect(mockVisualStyleActions.delete).toHaveBeenCalledWith('net1')
      expect(mockTableActions.delete).toHaveBeenCalledWith('net1')
      expect(mockOpaqueAspectActions.delete).toHaveBeenCalledWith('net1')
      expect(mockUndoActions.deleteStack).toHaveBeenCalledWith('net1')
      expect(mockWorkspaceActions.deleteNetworkModifiedStatus).toHaveBeenCalledWith('net1')
      expect(mockWorkspaceActions.deleteNetwork).toHaveBeenCalledWith('net1')
    })

    it('navigates to next network by default (navigate=true)', () => {
      networkApi.deleteNetwork('net1')
      // 'net2' is the next network in workspace.networkIds
      expect(mockWorkspaceActions.setCurrentNetworkId).toHaveBeenCalledWith(
        'net2',
      )
    })

    it('does not navigate when navigate=false', () => {
      networkApi.deleteNetwork('net1', { navigate: false })
      expect(mockWorkspaceActions.setCurrentNetworkId).not.toHaveBeenCalled()
    })

    it('returns fail(NetworkNotFound) when network does not exist', () => {
      const result = networkApi.deleteNetwork('missing')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      }
    })

    it('clears HCX validation result if present', () => {
      mockValidationResults['net1'] = { isValid: true }
      networkApi.deleteNetwork('net1')
      expect(mockHcxActions.deleteValidationResult).toHaveBeenCalledWith('net1')
    })

    it('does not call deleteValidationResult if no validation result exists', () => {
      networkApi.deleteNetwork('net1')
      expect(mockHcxActions.deleteValidationResult).not.toHaveBeenCalled()
    })

    it('returns fail(OperationFailed) when a store throws', () => {
      mockNetworkActions.delete.mockImplementationOnce(() => {
        throw new Error('store failure')
      })
      const result = networkApi.deleteNetwork('net1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
      }
    })
  })

  // ── deleteCurrentNetwork ──────────────────────────────────────────────────

  describe('deleteCurrentNetwork', () => {
    it('returns fail(NoCurrentNetwork) when no network is selected', () => {
      mockWorkspaceState.currentNetworkId = ''
      const result = networkApi.deleteCurrentNetwork()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NoCurrentNetwork)
      }
    })

    it('delegates to deleteNetwork with the current network ID', () => {
      mockNetworks.set('net1', { id: 'net1' })
      mockWorkspaceState.currentNetworkId = 'net1'
      mockWorkspaceState.networkIds = ['net1']
      const result = networkApi.deleteCurrentNetwork()
      expect(result.success).toBe(true)
      expect(mockNetworkActions.delete).toHaveBeenCalledWith('net1')
    })
  })

  // ── deleteAllNetworks ─────────────────────────────────────────────────────

  describe('deleteAllNetworks', () => {
    it('returns ok()', () => {
      const result = networkApi.deleteAllNetworks()
      expect(result.success).toBe(true)
    })

    it('calls deleteAll on all required stores', () => {
      networkApi.deleteAllNetworks()
      expect(mockNetworkActions.deleteAll).toHaveBeenCalled()
      expect(mockSummaryActions.deleteAll).toHaveBeenCalled()
      expect(mockViewModelActions.deleteAll).toHaveBeenCalled()
      expect(mockVisualStyleActions.deleteAll).toHaveBeenCalled()
      expect(mockTableActions.deleteAll).toHaveBeenCalled()
      expect(mockOpaqueAspectActions.deleteAll).toHaveBeenCalled()
      expect(mockUndoActions.deleteAllStacks).toHaveBeenCalled()
      expect(mockWorkspaceActions.deleteAllNetworkModifiedStatuses).toHaveBeenCalled()
      expect(mockHcxActions.deleteAllValidationResults).toHaveBeenCalled()
      expect(mockWorkspaceActions.deleteAllNetworks).toHaveBeenCalled()
    })

    it('returns fail(OperationFailed) when a store throws', () => {
      mockNetworkActions.deleteAll.mockImplementationOnce(() => {
        throw new Error('store failure')
      })
      const result = networkApi.deleteAllNetworks()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
      }
    })
  })
})
