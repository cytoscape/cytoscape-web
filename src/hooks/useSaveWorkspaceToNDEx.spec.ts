import { renderHook } from '@testing-library/react'

import {
  getNdexClient,
  TimeOutErrorIndicator,
  TimeOutErrorMessage,
} from '../api/ndex'
import { getWorkspaceFromDb } from '../db'
import { AppStatus } from '../models/AppModel/AppStatus'
import { ServiceApp } from '../models/AppModel/ServiceApp'
import { MessageSeverity } from '../models/MessageModel'
import NetworkFn, { Network } from '../models/NetworkModel'
import { NetworkSummary } from '../models/NetworkSummaryModel'
import { NetworkView } from '../models/ViewModel'
import { VisualStyle } from '../models/VisualStyleModel'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { useLoadCyNetwork } from './useLoadCyNetwork'
import { useMessageStore } from './stores/MessageStore'
import { useSaveCyNetworkCopyToNDEx } from './useSaveCyNetworkCopyToNDEx'
import { useSaveCyNetworkToNDEx } from './useSaveCyNetworkToNDEx'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useSaveWorkspace } from './useSaveWorkspaceToNDEx'

// Mock dependencies
jest.mock('../api/ndex', () => ({
  getNdexClient: jest.fn(),
  TimeOutErrorIndicator: 'TIMEOUT',
  TimeOutErrorMessage: 'Operation timed out',
}))

jest.mock('../db', () => ({
  ...jest.requireActual('../db'),
  getWorkspaceFromDb: jest.fn(),
}))

jest.mock('./useLoadCyNetwork', () => ({
  useLoadCyNetwork: jest.fn(),
}))

jest.mock('./useSaveCyNetworkToNDEx', () => ({
  useSaveCyNetworkToNDEx: jest.fn(),
}))

jest.mock('./useSaveCyNetworkCopyToNDEx', () => ({
  useSaveCyNetworkCopyToNDEx: jest.fn(),
}))

jest.mock('./stores/MessageStore', () => ({
  useMessageStore: jest.fn(),
}))

jest.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: jest.fn(),
}))

describe('useSaveWorkspace', () => {
  const mockAccessToken = 'test-token'
  const mockNetworkId = 'network-1'
  const mockAddMessage = jest.fn()
  const mockDeleteNetworkModifiedStatus = jest.fn()
  const mockSetId = jest.fn()
  const mockRenameWorkspace = jest.fn()
  const mockSetIsRemote = jest.fn()
  const mockSaveNetworkToNDEx = jest.fn()
  const mockSaveCopyToNDEx = jest.fn()
  const mockLoadCyNetwork = jest.fn()
  const mockNdexClient = {
    updateCyWebWorkspace: jest.fn(),
    createCyWebWorkspace: jest.fn(),
  }

  const createMockNetwork = (): Network => {
    return NetworkFn.createNetworkFromLists(
      mockNetworkId,
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
  }

  const createMockVisualStyle = (): VisualStyle => {
    return {} as VisualStyle
  }

  const createMockNetworkSummary = (): NetworkSummary => {
    return {
      externalId: mockNetworkId,
      name: 'Test Network',
      isNdex: true,
      ownerUUID: 'owner-1',
      isReadOnly: false,
      subnetworkIds: [],
      isValid: true,
      warnings: [],
      isShowcase: false,
      isCertified: false,
      indexLevel: 'all',
      hasLayout: false,
      hasSample: false,
      cxFileSize: 0,
      cx2FileSize: 0,
      properties: [],
      owner: 'owner',
      version: '1.0',
      completed: true,
      visibility: 'PUBLIC',
      nodeCount: 2,
      edgeCount: 1,
      description: 'Test network',
      creationTime: new Date(),
      isDeleted: false,
      modificationTime: new Date(),
    }
  }

  const createMockNetworkView = (): NetworkView => {
    return {
      id: mockNetworkId,
      selectedNodes: [],
      selectedEdges: [],
      nodeViews: {},
      edgeViews: {},
      values: new Map(),
    }
  }

  const createMockTableRecord = () => {
    return {
      nodeTable: {
        id: 'node-table-1',
        columns: [],
        rows: new Map(),
      },
      edgeTable: {
        id: 'edge-table-1',
        columns: [],
        rows: new Map(),
      },
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getNdexClient as jest.Mock).mockReturnValue(mockNdexClient)
    ;(useMessageStore as unknown as jest.Mock).mockReturnValue(mockAddMessage)
    ;(useSaveCyNetworkToNDEx as jest.Mock).mockReturnValue(mockSaveNetworkToNDEx)
    ;(useSaveCyNetworkCopyToNDEx as jest.Mock).mockReturnValue(mockSaveCopyToNDEx)
    ;(useLoadCyNetwork as jest.Mock).mockReturnValue(mockLoadCyNetwork)
    ;(useWorkspaceStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        deleteNetworkModifiedStatus: mockDeleteNetworkModifiedStatus,
        setId: mockSetId,
        renameWorkspace: mockRenameWorkspace,
        setIsRemote: mockSetIsRemote,
        workspace: {
          id: 'workspace-1',
          currentNetworkId: mockNetworkId,
          networkIds: [mockNetworkId],
        },
      }
      return selector(state)
    })
    ;(getWorkspaceFromDb as jest.Mock).mockResolvedValue({
      id: 'workspace-1',
      currentNetworkId: mockNetworkId,
      networkIds: [mockNetworkId],
    })
  })

  it('should successfully save workspace to NDEx', async () => {
    const network = createMockNetwork()
    const visualStyle = createMockVisualStyle()
    const summary = createMockNetworkSummary()
    const table = createMockTableRecord()
    const viewModel = createMockNetworkView()
    mockNdexClient.createCyWebWorkspace.mockResolvedValue({
      uuid: 'new-workspace-id',
    })

    const { result } = renderHook(() => useSaveWorkspace())
    const saveWorkspace = result.current

    await saveWorkspace(
      mockAccessToken,
      [mockNetworkId],
      { [mockNetworkId]: true },
      new Map([['network-1', network]]),
      { [mockNetworkId]: visualStyle },
      { [mockNetworkId]: summary },
      { [mockNetworkId]: table },
      { [mockNetworkId]: [viewModel] },
      {},
      {},
      false,
      'Test Workspace',
      'workspace-1',
      {},
      {},
    )

    expect(mockSaveNetworkToNDEx).toHaveBeenCalled()
    expect(mockNdexClient.createCyWebWorkspace).toHaveBeenCalled()
    expect(mockSetId).toHaveBeenCalledWith('new-workspace-id')
    expect(mockSetIsRemote).toHaveBeenCalledWith(true)
    expect(mockRenameWorkspace).toHaveBeenCalledWith('Test Workspace')
    expect(mockAddMessage).toHaveBeenCalledWith({
      message: 'Saved workspace to NDEx successfully.',
      duration: 3000,
      severity: MessageSeverity.SUCCESS,
    })
  })

  it('should update existing workspace when isUpdate is true', async () => {
    const network = createMockNetwork()
    const visualStyle = createMockVisualStyle()
    const summary = createMockNetworkSummary()
    const table = createMockTableRecord()
    const viewModel = createMockNetworkView()
    mockNdexClient.updateCyWebWorkspace.mockResolvedValue(undefined)

    const { result } = renderHook(() => useSaveWorkspace())
    const saveWorkspace = result.current

    await saveWorkspace(
      mockAccessToken,
      [mockNetworkId],
      { [mockNetworkId]: true },
      new Map([['network-1', network]]),
      { [mockNetworkId]: visualStyle },
      { [mockNetworkId]: summary },
      { [mockNetworkId]: table },
      { [mockNetworkId]: [viewModel] },
      {},
      {},
      true, // isUpdate
      'Updated Workspace',
      'workspace-1',
      {},
      {},
    )

    expect(mockNdexClient.updateCyWebWorkspace).toHaveBeenCalled()
    expect(mockNdexClient.createCyWebWorkspace).not.toHaveBeenCalled()
  })

  it('should load network from cache when missing', async () => {
    const visualStyle = createMockVisualStyle()
    const summary = createMockNetworkSummary()
    const table = createMockTableRecord()
    const viewModel = createMockNetworkView()
    const loadedNetwork = {
      network: createMockNetwork(),
      nodeTable: table.nodeTable,
      edgeTable: table.edgeTable,
      visualStyle,
      networkViews: [viewModel],
      visualStyleOptions: { visualEditorProperties: {} } as VisualStyleOptions,
      otherAspects: [],
      undoRedoStack: { undoStack: [], redoStack: [] },
    }
    mockLoadCyNetwork.mockResolvedValue(loadedNetwork)
    mockNdexClient.createCyWebWorkspace.mockResolvedValue({
      uuid: 'new-workspace-id',
    })

    const { result } = renderHook(() => useSaveWorkspace())
    const saveWorkspace = result.current

    await saveWorkspace(
      mockAccessToken,
      [mockNetworkId],
      { [mockNetworkId]: true },
      new Map(), // Empty network map
      {},
      { [mockNetworkId]: summary },
      {},
      {},
      {},
      {},
      false,
      'Test Workspace',
      'workspace-1',
      {},
      {},
    )

    expect(mockLoadCyNetwork).toHaveBeenCalledWith(mockNetworkId, mockAccessToken)
    expect(mockSaveNetworkToNDEx).toHaveBeenCalled()
  })

  it('should save copy for local networks', async () => {
    const network = createMockNetwork()
    const visualStyle = createMockVisualStyle()
    const summary = {
      ...createMockNetworkSummary(),
      isNdex: false, // Local network
    }
    const table = createMockTableRecord()
    const viewModel = createMockNetworkView()
    mockNdexClient.createCyWebWorkspace.mockResolvedValue({
      uuid: 'new-workspace-id',
    })

    const { result } = renderHook(() => useSaveWorkspace())
    const saveWorkspace = result.current

    await saveWorkspace(
      mockAccessToken,
      [mockNetworkId],
      { [mockNetworkId]: true },
      new Map([['network-1', network]]),
      { [mockNetworkId]: visualStyle },
      { [mockNetworkId]: summary },
      { [mockNetworkId]: table },
      { [mockNetworkId]: [viewModel] },
      {},
      {},
      false,
      'Test Workspace',
      'workspace-1',
      {},
      {},
    )

    expect(mockSaveCopyToNDEx).toHaveBeenCalled()
    expect(mockSaveNetworkToNDEx).not.toHaveBeenCalled()
  })

  it('should handle errors with timeout message', async () => {
    const network = createMockNetwork()
    const visualStyle = createMockVisualStyle()
    const summary = createMockNetworkSummary()
    const table = createMockTableRecord()
    const viewModel = createMockNetworkView()
    const timeoutError = new Error(TimeOutErrorIndicator)
    mockSaveNetworkToNDEx.mockRejectedValue(timeoutError)

    const { result } = renderHook(() => useSaveWorkspace())
    const saveWorkspace = result.current

    await saveWorkspace(
      mockAccessToken,
      [mockNetworkId],
      { [mockNetworkId]: true },
      new Map([['network-1', network]]),
      { [mockNetworkId]: visualStyle },
      { [mockNetworkId]: summary },
      { [mockNetworkId]: table },
      { [mockNetworkId]: [viewModel] },
      {},
      {},
      false,
      'Test Workspace',
      'workspace-1',
      {},
      {},
    )

    expect(mockAddMessage).toHaveBeenCalledWith({
      message: TimeOutErrorMessage,
      duration: 3000,
      severity: MessageSeverity.ERROR,
    })
  })

  it('should handle general errors', async () => {
    const network = createMockNetwork()
    const visualStyle = createMockVisualStyle()
    const summary = createMockNetworkSummary()
    const table = createMockTableRecord()
    const viewModel = createMockNetworkView()
    const error = new Error('Network save failed')
    mockSaveNetworkToNDEx.mockRejectedValue(error)

    const { result } = renderHook(() => useSaveWorkspace())
    const saveWorkspace = result.current

    await saveWorkspace(
      mockAccessToken,
      [mockNetworkId],
      { [mockNetworkId]: true },
      new Map([['network-1', network]]),
      { [mockNetworkId]: visualStyle },
      { [mockNetworkId]: summary },
      { [mockNetworkId]: table },
      { [mockNetworkId]: [viewModel] },
      {},
      {},
      false,
      'Test Workspace',
      'workspace-1',
      {},
      {},
    )

    expect(mockAddMessage).toHaveBeenCalledWith({
      message: expect.stringContaining('Error: Unable to save'),
      duration: 3000,
      severity: MessageSeverity.ERROR,
    })
  })
})

