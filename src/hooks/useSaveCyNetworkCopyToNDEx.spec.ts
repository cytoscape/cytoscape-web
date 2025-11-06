import { renderHook } from '@testing-library/react'

import {
  fetchNdexSummaries,
  getNdexClient,
  getNetworkValidationStatus,
} from '../api/ndex'
import { putNetworkSummaryToDb } from '../db'
import { exportCyNetworkToCx2 } from '../models/CxModel/impl'
import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import { NetworkSummary } from '../models/NetworkSummaryModel'
import { NetworkView } from '../models/ViewModel'
import { VisualStyle } from '../models/VisualStyleModel'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { useUrlNavigation } from './navigation/useUrlNavigation'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useSaveCyNetworkCopyToNDEx } from './useSaveCyNetworkCopyToNDEx'

// Mock the API operations
jest.mock('../api/ndex', () => ({
  getNdexClient: jest.fn(),
  getNetworkValidationStatus: jest.fn(),
  fetchNdexSummaries: jest.fn(),
}))

// Mock the database operations
jest.mock('../db', () => ({
  ...jest.requireActual('../db'),
  putNetworkSummaryToDb: jest.fn(),
}))

// Mock the CX2 exporter
jest.mock('../models/CxModel/impl', () => ({
  exportCyNetworkToCx2: jest.fn(),
}))

// Mock the stores
jest.mock('./stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: jest.fn(),
}))

jest.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: jest.fn(),
}))

jest.mock('./navigation/useUrlNavigation', () => ({
  useUrlNavigation: jest.fn(),
}))

describe('useSaveCyNetworkCopyToNDEx', () => {
  const mockAccessToken = 'test-token'
  const mockNetworkId = 'network-1'
  const mockNewNetworkId = 'new-network-1'
  const mockAddNetworkToWorkspace = jest.fn()
  const mockDeleteNetworkFromWorkspace = jest.fn()
  const mockSetCurrentNetworkId = jest.fn()
  const mockAddSummary = jest.fn()
  const mockNavigateToNetwork = jest.fn()

  const createMockNetwork = (id: IdType = mockNetworkId): Network => {
    return NetworkFn.createNetworkFromLists(
      id,
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
  }

  const createMockVisualStyle = (): VisualStyle => {
    return {} as VisualStyle
  }

  const createMockNetworkSummary = (
    id: IdType = mockNetworkId,
  ): NetworkSummary => {
    return {
      externalId: id,
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

  const createMockTable = () => {
    return {
      id: 'table-1',
      columns: [],
      rows: new Map(),
    }
  }

  const createMockCx2 = () => {
    return [{ CXVersion: '2.0' }, { status: [{ success: true }] }] as any
  }

  const mockNdexClient = {
    createNetworkFromRawCX2: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getNdexClient as jest.Mock).mockReturnValue(mockNdexClient)
    ;(useNetworkSummaryStore as unknown as jest.Mock).mockImplementation(
      (selector: any) => {
        const state = {
          add: mockAddSummary,
        }
        return selector(state)
      },
    )
    ;(useWorkspaceStore as unknown as jest.Mock).mockImplementation(
      (selector: any) => {
        const state = {
          addNetworkIds: mockAddNetworkToWorkspace,
          deleteNetwork: mockDeleteNetworkFromWorkspace,
          setCurrentNetworkId: mockSetCurrentNetworkId,
          workspace: {
            id: 'workspace-1',
            networkIds: [mockNetworkId],
          },
        }
        return selector(state)
      },
    )
    ;(useUrlNavigation as jest.Mock).mockReturnValue({
      navigateToNetwork: mockNavigateToNetwork,
    })
    ;(putNetworkSummaryToDb as jest.Mock).mockResolvedValue(undefined)
  })

  describe('when viewModel is undefined', () => {
    it('should throw an error', async () => {
      const { result } = renderHook(() => useSaveCyNetworkCopyToNDEx())
      const saveCopyToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()

      await expect(
        saveCopyToNDEx(
          mockAccessToken,
          network,
          visualStyle,
          summary,
          nodeTable,
          edgeTable,
          undefined,
        ),
      ).rejects.toThrow('Could not find the current network view model.')
    })
  })

  describe('when viewModel is provided', () => {
    it('should successfully save copy to NDEx', async () => {
      const mockCx2 = createMockCx2()
      const newSummary = createMockNetworkSummary(mockNewNetworkId)
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      mockNdexClient.createNetworkFromRawCX2.mockResolvedValue({
        uuid: mockNewNetworkId,
      })
      ;(getNetworkValidationStatus as jest.Mock).mockResolvedValue(true)
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([newSummary])

      const { result } = renderHook(() => useSaveCyNetworkCopyToNDEx())
      const saveCopyToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()

      const uuid = await saveCopyToNDEx(
        mockAccessToken,
        network,
        visualStyle,
        summary,
        nodeTable,
        edgeTable,
        viewModel,
      )

      expect(uuid).toBe(mockNewNetworkId)
      expect(exportCyNetworkToCx2).toHaveBeenCalled()
      expect(mockNdexClient.createNetworkFromRawCX2).toHaveBeenCalledWith(
        mockCx2,
      )
      expect(getNetworkValidationStatus).toHaveBeenCalledWith(
        mockNewNetworkId,
        mockAccessToken,
      )
      expect(fetchNdexSummaries).toHaveBeenCalledWith(
        mockNewNetworkId,
        mockAccessToken,
      )
      expect(putNetworkSummaryToDb).toHaveBeenCalledWith(newSummary)
      expect(mockAddSummary).toHaveBeenCalledWith(mockNewNetworkId, newSummary)
      expect(mockAddNetworkToWorkspace).toHaveBeenCalledWith(mockNewNetworkId)
      expect(mockSetCurrentNetworkId).toHaveBeenCalledWith(mockNewNetworkId)
      expect(mockNavigateToNetwork).toHaveBeenCalled()
    })

    it('should throw error when network is rejected by NDEx', async () => {
      const mockCx2 = createMockCx2()
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      mockNdexClient.createNetworkFromRawCX2.mockResolvedValue({
        uuid: mockNewNetworkId,
      })
      ;(getNetworkValidationStatus as jest.Mock).mockResolvedValue(false)

      const { result } = renderHook(() => useSaveCyNetworkCopyToNDEx())
      const saveCopyToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()

      await expect(
        saveCopyToNDEx(
          mockAccessToken,
          network,
          visualStyle,
          summary,
          nodeTable,
          edgeTable,
          viewModel,
        ),
      ).rejects.toThrow('The network is rejected by NDEx')

      expect(getNetworkValidationStatus).toHaveBeenCalled()
    })

    it('should delete original network when deleteOriginal is true', async () => {
      const mockCx2 = createMockCx2()
      const newSummary = createMockNetworkSummary(mockNewNetworkId)
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      mockNdexClient.createNetworkFromRawCX2.mockResolvedValue({
        uuid: mockNewNetworkId,
      })
      ;(getNetworkValidationStatus as jest.Mock).mockResolvedValue(true)
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([newSummary])

      const mockWorkspace = {
        id: 'workspace-1',
        networkIds: [mockNetworkId, 'network-2'],
      }
      ;(useWorkspaceStore as unknown as jest.Mock).mockImplementation(
        (selector: any) => {
          const state = {
            addNetworkIds: mockAddNetworkToWorkspace,
            deleteNetwork: mockDeleteNetworkFromWorkspace,
            setCurrentNetworkId: mockSetCurrentNetworkId,
            workspace: mockWorkspace,
          }
          return selector(state)
        },
      )

      const { result } = renderHook(() => useSaveCyNetworkCopyToNDEx())
      const saveCopyToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()

      await saveCopyToNDEx(
        mockAccessToken,
        network,
        visualStyle,
        summary,
        nodeTable,
        edgeTable,
        viewModel,
        undefined,
        undefined,
        true, // deleteOriginal
      )

      expect(mockDeleteNetworkFromWorkspace).toHaveBeenCalledWith(mockNetworkId)
      expect(mockSetCurrentNetworkId).toHaveBeenCalledWith('network-2')
      expect(mockNavigateToNetwork).toHaveBeenCalledWith(
        expect.objectContaining({
          networkId: 'network-2',
        }),
      )
    })

    it('should use summary name when deleteOriginal is true', async () => {
      const mockCx2 = createMockCx2()
      const newSummary = createMockNetworkSummary(mockNewNetworkId)
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      mockNdexClient.createNetworkFromRawCX2.mockResolvedValue({
        uuid: mockNewNetworkId,
      })
      ;(getNetworkValidationStatus as jest.Mock).mockResolvedValue(true)
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([newSummary])

      const { result } = renderHook(() => useSaveCyNetworkCopyToNDEx())
      const saveCopyToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()

      await saveCopyToNDEx(
        mockAccessToken,
        network,
        visualStyle,
        summary,
        nodeTable,
        edgeTable,
        viewModel,
        undefined,
        undefined,
        true,
      )

      expect(exportCyNetworkToCx2).toHaveBeenCalledWith(
        expect.any(Object),
        summary,
        summary.name, // Should use summary name, not "Copy of ..."
      )
    })
  })
})
