import { renderHook } from '@testing-library/react'

import { fetchNdexNetwork } from '../api/ndex'
import { getCyNetworkFromDb, getNetworkSummaryFromDb } from '../db'
import { Cx2 } from '../models/CxModel/Cx2'
import { createCyNetworkFromCx2 } from '../models/CxModel/impl'
import { CyNetwork } from '../models/CyNetworkModel'
import { IdType } from '../models/IdType'
import { NetworkSummary } from '../models/NetworkSummaryModel'
import { useLoadCyNetwork } from './useLoadCyNetwork'

// Mock the database operations
jest.mock('../db', () => ({
  getCyNetworkFromDb: jest.fn(),
  getNetworkSummaryFromDb: jest.fn(),
}))

// Mock the API operations
jest.mock('../api/ndex', () => ({
  fetchNdexNetwork: jest.fn(),
}))

// Mock the CX2 converter
jest.mock('../models/CxModel/impl', () => ({
  createCyNetworkFromCx2: jest.fn(),
}))

describe('useLoadCyNetwork', () => {
  const mockNetworkId: IdType = 'test-network-1'
  const mockAccessToken = 'test-token'

  const createMockCyNetwork = (id: IdType): CyNetwork => {
    return {
      network: {
        id,
        nodes: [{ id: 'n1' }, { id: 'n2' }],
        edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
      },
      nodeTable: {
        id: `${id}-nodes`,
        columns: [],
        rows: new Map(),
      },
      edgeTable: {
        id: `${id}-edges`,
        columns: [],
        rows: new Map(),
      },
      visualStyle: {} as any,
      networkViews: [],
      undoRedoStack: {
        undoStack: [],
        redoStack: [],
      },
    }
  }

  const createMockNetworkSummary = (
    id: IdType,
    isNdex: boolean = true,
  ): NetworkSummary => {
    return {
      isNdex,
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
      name: `Network ${id}`,
      properties: [],
      owner: 'owner',
      version: '1.0',
      completed: true,
      visibility: 'PUBLIC',
      nodeCount: 2,
      edgeCount: 1,
      description: 'Test network',
      creationTime: new Date(),
      externalId: id,
      isDeleted: false,
      modificationTime: new Date(),
    }
  }

  const createMockCx2 = (): Cx2 => {
    // Create a minimal valid Cx2 structure
    // Cx2 is a tuple: [CxDescriptor, ...Aspect[], Status]
    return [
      { CXVersion: '2.0' }, // CxDescriptor
      { status: [{ success: true }] }, // Status aspect
    ] as Cx2
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('when network is in cache', () => {
    it('should return the cached network immediately', async () => {
      const mockCyNetwork = createMockCyNetwork(mockNetworkId)
      ;(getCyNetworkFromDb as jest.Mock).mockResolvedValue(mockCyNetwork)

      const { result } = renderHook(() => useLoadCyNetwork())
      const loadCyNetwork = result.current

      const network = await loadCyNetwork(mockNetworkId, mockAccessToken)

      expect(network).toEqual(mockCyNetwork)
      expect(getCyNetworkFromDb).toHaveBeenCalledWith(mockNetworkId)
      expect(fetchNdexNetwork).not.toHaveBeenCalled()
    })
  })

  describe('when network is not in cache', () => {
    describe('when network is local-only', () => {
      it('should throw an error for local-only network not in cache', async () => {
        const mockSummary = createMockNetworkSummary(mockNetworkId, false)
        ;(getCyNetworkFromDb as jest.Mock).mockRejectedValue(
          new Error('Network not found'),
        )
        ;(getNetworkSummaryFromDb as jest.Mock).mockResolvedValue(mockSummary)

        const { result } = renderHook(() => useLoadCyNetwork())
        const loadCyNetwork = result.current

        await expect(
          loadCyNetwork(mockNetworkId, mockAccessToken),
        ).rejects.toThrow(
          `Local network "${mockSummary.name}" (${mockNetworkId}) is not found in cache. Local networks are stored only in your browser and cannot be retrieved from NDEx. If you cleared your browser data, this network may have been lost.`,
        )

        expect(getCyNetworkFromDb).toHaveBeenCalledWith(mockNetworkId)
        expect(getNetworkSummaryFromDb).toHaveBeenCalledWith(mockNetworkId)
        expect(fetchNdexNetwork).not.toHaveBeenCalled()
      })
    })

    describe('when network is from NDEx', () => {
      it('should fetch network from NDEx when not in cache', async () => {
        const mockCx2 = createMockCx2()
        const mockCyNetwork = createMockCyNetwork(mockNetworkId)
        ;(getCyNetworkFromDb as jest.Mock).mockRejectedValue(
          new Error('Network not found'),
        )
        ;(getNetworkSummaryFromDb as jest.Mock).mockResolvedValue(undefined)
        ;(fetchNdexNetwork as jest.Mock).mockResolvedValue(mockCx2)
        ;(createCyNetworkFromCx2 as jest.Mock).mockReturnValue(mockCyNetwork)

        const { result } = renderHook(() => useLoadCyNetwork())
        const loadCyNetwork = result.current

        const network = await loadCyNetwork(mockNetworkId, mockAccessToken)

        expect(network).toEqual(mockCyNetwork)
        expect(getCyNetworkFromDb).toHaveBeenCalledWith(mockNetworkId)
        expect(getNetworkSummaryFromDb).toHaveBeenCalledWith(mockNetworkId)
        expect(fetchNdexNetwork).toHaveBeenCalledWith(
          mockNetworkId,
          mockAccessToken,
        )
        expect(createCyNetworkFromCx2).toHaveBeenCalledWith(
          mockNetworkId,
          mockCx2,
        )
      })

      it('should fetch network from NDEx when summary indicates NDEx network', async () => {
        const mockCx2 = createMockCx2()
        const mockCyNetwork = createMockCyNetwork(mockNetworkId)
        const mockSummary = createMockNetworkSummary(mockNetworkId, true)
        ;(getCyNetworkFromDb as jest.Mock).mockRejectedValue(
          new Error('Network not found'),
        )
        ;(getNetworkSummaryFromDb as jest.Mock).mockResolvedValue(mockSummary)
        ;(fetchNdexNetwork as jest.Mock).mockResolvedValue(mockCx2)
        ;(createCyNetworkFromCx2 as jest.Mock).mockReturnValue(mockCyNetwork)

        const { result } = renderHook(() => useLoadCyNetwork())
        const loadCyNetwork = result.current

        const network = await loadCyNetwork(mockNetworkId, mockAccessToken)

        expect(network).toEqual(mockCyNetwork)
        expect(fetchNdexNetwork).toHaveBeenCalledWith(
          mockNetworkId,
          mockAccessToken,
        )
      })

      it('should handle fetch errors', async () => {
        const fetchError = new Error('Failed to fetch network')
        ;(getCyNetworkFromDb as jest.Mock).mockRejectedValue(
          new Error('Network not found'),
        )
        ;(getNetworkSummaryFromDb as jest.Mock).mockResolvedValue(undefined)
        ;(fetchNdexNetwork as jest.Mock).mockRejectedValue(fetchError)

        const { result } = renderHook(() => useLoadCyNetwork())
        const loadCyNetwork = result.current

        await expect(
          loadCyNetwork(mockNetworkId, mockAccessToken),
        ).rejects.toThrow('Failed to fetch network')

        expect(fetchNdexNetwork).toHaveBeenCalledWith(
          mockNetworkId,
          mockAccessToken,
        )
      })
    })
  })

  describe('when network is not in cache and no summary exists', () => {
    it('should attempt to fetch from NDEx', async () => {
      const mockCx2 = createMockCx2()
      const mockCyNetwork = createMockCyNetwork(mockNetworkId)
      ;(getCyNetworkFromDb as jest.Mock).mockRejectedValue(
        new Error('Network not found'),
      )
      ;(getNetworkSummaryFromDb as jest.Mock).mockResolvedValue(undefined)
      ;(fetchNdexNetwork as jest.Mock).mockResolvedValue(mockCx2)
      ;(createCyNetworkFromCx2 as jest.Mock).mockReturnValue(mockCyNetwork)

      const { result } = renderHook(() => useLoadCyNetwork())
      const loadCyNetwork = result.current

      const network = await loadCyNetwork(mockNetworkId, mockAccessToken)

      expect(network).toEqual(mockCyNetwork)
      expect(fetchNdexNetwork).toHaveBeenCalledWith(
        mockNetworkId,
        mockAccessToken,
      )
    })
  })

  describe('when access token is not provided', () => {
    it('should work without access token', async () => {
      const mockCx2 = createMockCx2()
      const mockCyNetwork = createMockCyNetwork(mockNetworkId)
      ;(getCyNetworkFromDb as jest.Mock).mockRejectedValue(
        new Error('Network not found'),
      )
      ;(getNetworkSummaryFromDb as jest.Mock).mockResolvedValue(undefined)
      ;(fetchNdexNetwork as jest.Mock).mockResolvedValue(mockCx2)
      ;(createCyNetworkFromCx2 as jest.Mock).mockReturnValue(mockCyNetwork)

      const { result } = renderHook(() => useLoadCyNetwork())
      const loadCyNetwork = result.current

      const network = await loadCyNetwork(mockNetworkId)

      expect(network).toEqual(mockCyNetwork)
      expect(fetchNdexNetwork).toHaveBeenCalledWith(mockNetworkId, undefined)
    })
  })
})
