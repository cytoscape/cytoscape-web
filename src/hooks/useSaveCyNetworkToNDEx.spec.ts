import { renderHook } from '@testing-library/react'

import {
  fetchNdexSummaries,
  getNetworkValidationStatus,
  updateNdexNetwork,
} from '../api/ndex'
import { exportCyNetworkToCx2 } from '../models/CxModel/impl'
import NetworkFn, { Network } from '../models/NetworkModel'
import { NetworkSummary } from '../models/NetworkSummaryModel'
import { NetworkView } from '../models/ViewModel'
import { VisualStyle } from '../models/VisualStyleModel'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useSaveCyNetworkToNDEx } from './useSaveCyNetworkToNDEx'

// Mock the API operations
jest.mock('../api/ndex', () => ({
  updateNdexNetwork: jest.fn(),
  getNetworkValidationStatus: jest.fn(),
  fetchNdexSummaries: jest.fn(),
}))

// Mock the CX2 exporter
jest.mock('../models/CxModel/impl', () => ({
  exportCyNetworkToCx2: jest.fn(),
}))

// Mock the network summary store
jest.mock('./stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: jest.fn(),
}))

describe('useSaveCyNetworkToNDEx', () => {
  const mockAccessToken = 'test-token'
  const mockNetworkId = 'network-1'
  const mockUpdateSummary = jest.fn()

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
      networkId: mockNetworkId,
      selectedNodes: [],
      selectedEdges: [],
      nodeViews: {},
      edgeViews: {},
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
    return [
      { CXVersion: '2.0' },
      { status: [{ success: true }] },
    ] as any
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useNetworkSummaryStore as jest.Mock).mockReturnValue(mockUpdateSummary)
  })

  describe('when viewModel is undefined', () => {
    it('should throw an error', async () => {
      const { result } = renderHook(() => useSaveCyNetworkToNDEx())
      const saveNetworkToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()

      await expect(
        saveNetworkToNDEx(
          mockAccessToken,
          mockNetworkId,
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
    it('should successfully save network to NDEx', async () => {
      const mockCx2 = createMockCx2()
      const updatedSummary = {
        ...createMockNetworkSummary(),
        modificationTime: new Date('2024-01-02'),
      }
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      ;(updateNdexNetwork as jest.Mock).mockResolvedValue(undefined)
      ;(getNetworkValidationStatus as jest.Mock).mockResolvedValue(true)
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([updatedSummary])

      const { result } = renderHook(() => useSaveCyNetworkToNDEx())
      const saveNetworkToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()

      await saveNetworkToNDEx(
        mockAccessToken,
        mockNetworkId,
        network,
        visualStyle,
        summary,
        nodeTable,
        edgeTable,
        viewModel,
      )

      expect(exportCyNetworkToCx2).toHaveBeenCalled()
      expect(updateNdexNetwork).toHaveBeenCalledWith(
        mockNetworkId,
        mockCx2,
        mockAccessToken,
      )
      expect(getNetworkValidationStatus).toHaveBeenCalledWith(
        mockNetworkId,
        mockAccessToken,
      )
      expect(fetchNdexSummaries).toHaveBeenCalledWith(
        mockNetworkId,
        mockAccessToken,
      )
      expect(mockUpdateSummary).toHaveBeenCalledWith(mockNetworkId, {
        modificationTime: updatedSummary.modificationTime,
      })
    })

    it('should throw error when network is rejected by NDEx', async () => {
      const mockCx2 = createMockCx2()
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      ;(updateNdexNetwork as jest.Mock).mockResolvedValue(undefined)
      ;(getNetworkValidationStatus as jest.Mock).mockResolvedValue(false)

      const { result } = renderHook(() => useSaveCyNetworkToNDEx())
      const saveNetworkToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()

      await expect(
        saveNetworkToNDEx(
          mockAccessToken,
          mockNetworkId,
          network,
          visualStyle,
          summary,
          nodeTable,
          edgeTable,
          viewModel,
        ),
      ).rejects.toThrow('The network is rejected by NDEx')

      expect(getNetworkValidationStatus).toHaveBeenCalled()
      expect(fetchNdexSummaries).not.toHaveBeenCalled()
    })

    it('should handle empty summary array from fetchNdexSummaries', async () => {
      const mockCx2 = createMockCx2()
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      ;(updateNdexNetwork as jest.Mock).mockResolvedValue(undefined)
      ;(getNetworkValidationStatus as jest.Mock).mockResolvedValue(true)
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([])

      const { result } = renderHook(() => useSaveCyNetworkToNDEx())
      const saveNetworkToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()

      await saveNetworkToNDEx(
        mockAccessToken,
        mockNetworkId,
        network,
        visualStyle,
        summary,
        nodeTable,
        edgeTable,
        viewModel,
      )

      expect(fetchNdexSummaries).toHaveBeenCalled()
      expect(mockUpdateSummary).not.toHaveBeenCalled()
    })

    it('should handle optional parameters', async () => {
      const mockCx2 = createMockCx2()
      const updatedSummary = {
        ...createMockNetworkSummary(),
        modificationTime: new Date('2024-01-02'),
      }
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      ;(updateNdexNetwork as jest.Mock).mockResolvedValue(undefined)
      ;(getNetworkValidationStatus as jest.Mock).mockResolvedValue(true)
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([updatedSummary])

      const { result } = renderHook(() => useSaveCyNetworkToNDEx())
      const saveNetworkToNDEx = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const nodeTable = createMockTable()
      const edgeTable = createMockTable()
      const visualStyleOptions: VisualStyleOptions = { visualEditorProperties: {} } as VisualStyleOptions
      const opaqueAspect = {}

      await saveNetworkToNDEx(
        mockAccessToken,
        mockNetworkId,
        network,
        visualStyle,
        summary,
        nodeTable,
        edgeTable,
        viewModel,
        visualStyleOptions,
        opaqueAspect,
      )

      expect(exportCyNetworkToCx2).toHaveBeenCalled()
    })
  })
})

