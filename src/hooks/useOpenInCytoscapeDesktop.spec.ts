import { renderHook } from '@testing-library/react'

import { exportCyNetworkToCx2 } from '../models/CxModel/impl'
import { CyNetwork } from '../models/CyNetworkModel'
import { MessageSeverity } from '../models/MessageModel'
import NetworkFn, { Network } from '../models/NetworkModel'
import { NetworkSummary } from '../models/NetworkSummaryModel'
import { NetworkView } from '../models/ViewModel'
import { VisualStyle } from '../models/VisualStyleModel'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { useMessageStore } from './stores/MessageStore'
import { useOpenNetworkInCytoscape } from './useOpenInCytoscapeDesktop'

// Mock the message store
jest.mock('./stores/MessageStore', () => ({
  useMessageStore: jest.fn(),
}))

// Mock the CX2 exporter
jest.mock('../models/CxModel/impl', () => ({
  exportCyNetworkToCx2: jest.fn(),
}))

describe('useOpenNetworkInCytoscape', () => {
  const mockAddMessage = jest.fn()
  const mockPostCX2NetworkToCytoscape = jest.fn()

  const createMockNetwork = (): Network => {
    return NetworkFn.createNetworkFromLists(
      'network-1',
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
  }

  const createMockVisualStyle = (): VisualStyle => {
    return {} as VisualStyle
  }

  const createMockNetworkSummary = (): NetworkSummary => {
    return {
      externalId: 'network-1',
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
      networkId: 'network-1',
      selectedNodes: [],
      selectedEdges: [],
      nodeViews: {},
      edgeViews: {},
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

  const createMockCx2 = () => {
    return [
      { CXVersion: '2.0' },
      { status: [{ success: true }] },
    ] as any
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useMessageStore as jest.Mock).mockReturnValue(mockAddMessage)
  })

  describe('when viewModel is undefined', () => {
    it('should show warning message and return early', async () => {
      const { result } = renderHook(() => useOpenNetworkInCytoscape())
      const openNetworkInCytoscape = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const table = createMockTableRecord()
      const cyndex = {
        postCX2NetworkToCytoscape: mockPostCX2NetworkToCytoscape,
      } as any

      await openNetworkInCytoscape(
        network,
        visualStyle,
        undefined,
        table,
        { visualEditorProperties: {} } as VisualStyleOptions,
        undefined,
        undefined,
        cyndex,
      )

      expect(mockAddMessage).toHaveBeenCalledWith({
        message: 'Could not find the current network view model.',
        duration: 4000,
        severity: MessageSeverity.WARNING,
      })
      expect(exportCyNetworkToCx2).not.toHaveBeenCalled()
      expect(mockPostCX2NetworkToCytoscape).not.toHaveBeenCalled()
    })
  })

  describe('when viewModel is provided', () => {
    it('should successfully open network in Cytoscape Desktop', async () => {
      const mockCx2 = createMockCx2()
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      mockPostCX2NetworkToCytoscape.mockResolvedValue(undefined)

      const { result } = renderHook(() => useOpenNetworkInCytoscape())
      const openNetworkInCytoscape = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const table = createMockTableRecord()
      const cyndex = {
        postCX2NetworkToCytoscape: mockPostCX2NetworkToCytoscape,
      } as any

      await openNetworkInCytoscape(
        network,
        visualStyle,
        summary,
        table,
        { visualEditorProperties: {} } as VisualStyleOptions,
        viewModel,
        undefined,
        cyndex,
      )

      expect(mockAddMessage).toHaveBeenCalledWith({
        message: 'Sending this network to Cytoscape Desktop...',
        duration: 3000,
        severity: MessageSeverity.INFO,
      })

      expect(exportCyNetworkToCx2).toHaveBeenCalled()
      expect(mockPostCX2NetworkToCytoscape).toHaveBeenCalledWith(mockCx2)

      expect(mockAddMessage).toHaveBeenCalledWith({
        message: 'Network successfully opened in Cytoscape Desktop.',
        duration: 3000,
        severity: MessageSeverity.SUCCESS,
      })
    })

    it('should create summary when summary is undefined', async () => {
      const mockCx2 = createMockCx2()
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      mockPostCX2NetworkToCytoscape.mockResolvedValue(undefined)

      const { result } = renderHook(() => useOpenNetworkInCytoscape())
      const openNetworkInCytoscape = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const viewModel = createMockNetworkView()
      const table = createMockTableRecord()
      const cyndex = {
        postCX2NetworkToCytoscape: mockPostCX2NetworkToCytoscape,
      } as any

      await openNetworkInCytoscape(
        network,
        visualStyle,
        undefined,
        table,
        { visualEditorProperties: {} } as VisualStyleOptions,
        viewModel,
        undefined,
        cyndex,
        'Custom Network Label',
      )

      expect(exportCyNetworkToCx2).toHaveBeenCalled()
      const cyNetworkArg = (exportCyNetworkToCx2 as jest.Mock).mock.calls[0][0] as CyNetwork
      expect(cyNetworkArg.network).toEqual(network)
      expect(cyNetworkArg.networkViews).toEqual([viewModel])
    })

    it('should handle errors when posting to Cytoscape fails', async () => {
      const mockCx2 = createMockCx2()
      const error = new Error('Connection failed')
      ;(exportCyNetworkToCx2 as jest.Mock).mockReturnValue(mockCx2)
      mockPostCX2NetworkToCytoscape.mockRejectedValue(error)

      const { result } = renderHook(() => useOpenNetworkInCytoscape())
      const openNetworkInCytoscape = result.current

      const network = createMockNetwork()
      const visualStyle = createMockVisualStyle()
      const summary = createMockNetworkSummary()
      const viewModel = createMockNetworkView()
      const table = createMockTableRecord()
      const cyndex = {
        postCX2NetworkToCytoscape: mockPostCX2NetworkToCytoscape,
      } as any

      await openNetworkInCytoscape(
        network,
        visualStyle,
        summary,
        table,
        { visualEditorProperties: {} } as VisualStyleOptions,
        viewModel,
        undefined,
        cyndex,
      )

      expect(mockAddMessage).toHaveBeenCalledWith({
        message:
          'To use this feature, you need Cytoscape 3.6.0 or higher running on your machine (default port: 1234) and the CyNDEx-2 app installed.',
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    })
  })
})

