import { renderHook } from '@testing-library/react'

import { fetchNdexSummaries } from '../api/ndex'
import {
  getNetworkSummariesFromDb,
  putNetworkSummaryToDb,
} from '../db'
import { IdType } from '../models/IdType'
import { NetworkSummary } from '../models/NetworkSummaryModel'
import { useLoadNetworkSummaries } from './useLoadNetworkSummaries'

// Mock the database operations
jest.mock('../db', () => ({
  getNetworkSummariesFromDb: jest.fn(),
  putNetworkSummaryToDb: jest.fn(),
}))

// Mock the API operations
jest.mock('../api/ndex', () => ({
  fetchNdexSummaries: jest.fn(),
}))

describe('useLoadNetworkSummaries', () => {
  const mockNetworkId1: IdType = 'test-network-1'
  const mockNetworkId2: IdType = 'test-network-2'
  const mockAccessToken = 'test-token'

  const createMockNetworkSummary = (id: IdType): NetworkSummary => {
    return {
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
      name: `Network ${id}`,
      properties: [],
      owner: 'owner',
      version: '1.0',
      completed: true,
      visibility: 'PUBLIC',
      nodeCount: 10,
      edgeCount: 20,
      description: 'Test network',
      creationTime: new Date(),
      externalId: id,
      isDeleted: false,
      modificationTime: new Date(),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('when all summaries are in cache', () => {
    it('should return cached summaries for single network ID', async () => {
      const mockSummary = createMockNetworkSummary(mockNetworkId1)
      ;(getNetworkSummariesFromDb as jest.Mock).mockResolvedValue([
        mockSummary,
      ])
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([])

      const { result } = renderHook(() => useLoadNetworkSummaries())
      const loadNetworkSummaries = result.current

      const summaries = await loadNetworkSummaries(
        mockNetworkId1,
        mockAccessToken,
      )

      expect(summaries).toEqual({
        [mockNetworkId1]: mockSummary,
      })
      expect(getNetworkSummariesFromDb).toHaveBeenCalledWith([mockNetworkId1])
      expect(fetchNdexSummaries).toHaveBeenCalledWith([], mockAccessToken)
      expect(putNetworkSummaryToDb).not.toHaveBeenCalled()
    })

    it('should return cached summaries for multiple network IDs', async () => {
      const mockSummary1 = createMockNetworkSummary(mockNetworkId1)
      const mockSummary2 = createMockNetworkSummary(mockNetworkId2)
      ;(getNetworkSummariesFromDb as jest.Mock).mockResolvedValue([
        mockSummary1,
        mockSummary2,
      ])
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([])

      const { result } = renderHook(() => useLoadNetworkSummaries())
      const loadNetworkSummaries = result.current

      const summaries = await loadNetworkSummaries(
        [mockNetworkId1, mockNetworkId2],
        mockAccessToken,
      )

      expect(summaries).toEqual({
        [mockNetworkId1]: mockSummary1,
        [mockNetworkId2]: mockSummary2,
      })
      expect(getNetworkSummariesFromDb).toHaveBeenCalledWith([
        mockNetworkId1,
        mockNetworkId2,
      ])
      expect(fetchNdexSummaries).toHaveBeenCalledWith([], mockAccessToken)
    })

    it('should handle duplicate IDs in input', async () => {
      const mockSummary = createMockNetworkSummary(mockNetworkId1)
      ;(getNetworkSummariesFromDb as jest.Mock).mockResolvedValue([
        mockSummary,
      ])
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([])

      const { result } = renderHook(() => useLoadNetworkSummaries())
      const loadNetworkSummaries = result.current

      const summaries = await loadNetworkSummaries(
        [mockNetworkId1, mockNetworkId1],
        mockAccessToken,
      )

      expect(summaries).toEqual({
        [mockNetworkId1]: mockSummary,
      })
      expect(getNetworkSummariesFromDb).toHaveBeenCalledWith([mockNetworkId1])
      expect(fetchNdexSummaries).toHaveBeenCalledWith([], mockAccessToken)
    })
  })

  describe('when some summaries are missing from cache', () => {
    it('should fetch missing summaries from NDEx and cache them', async () => {
      const mockSummary1 = createMockNetworkSummary(mockNetworkId1)
      const mockSummary2 = createMockNetworkSummary(mockNetworkId2)
      ;(getNetworkSummariesFromDb as jest.Mock).mockResolvedValue([
        mockSummary1,
        undefined, // Second summary is missing
      ])
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([mockSummary2])
      ;(putNetworkSummaryToDb as jest.Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLoadNetworkSummaries())
      const loadNetworkSummaries = result.current

      const summaries = await loadNetworkSummaries(
        [mockNetworkId1, mockNetworkId2],
        mockAccessToken,
      )

      expect(summaries).toEqual({
        [mockNetworkId1]: mockSummary1,
        [mockNetworkId2]: mockSummary2,
      })
      expect(getNetworkSummariesFromDb).toHaveBeenCalledWith([
        mockNetworkId1,
        mockNetworkId2,
      ])
      expect(fetchNdexSummaries).toHaveBeenCalledWith(
        [mockNetworkId2],
        mockAccessToken,
      )
      expect(putNetworkSummaryToDb).toHaveBeenCalledWith(mockSummary2)
    })

    it('should fetch all summaries when none are in cache', async () => {
      const mockSummary1 = createMockNetworkSummary(mockNetworkId1)
      const mockSummary2 = createMockNetworkSummary(mockNetworkId2)
      ;(getNetworkSummariesFromDb as jest.Mock).mockResolvedValue([
        undefined,
        undefined,
      ])
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([
        mockSummary1,
        mockSummary2,
      ])
      ;(putNetworkSummaryToDb as jest.Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLoadNetworkSummaries())
      const loadNetworkSummaries = result.current

      const summaries = await loadNetworkSummaries(
        [mockNetworkId1, mockNetworkId2],
        mockAccessToken,
      )

      expect(summaries).toEqual({
        [mockNetworkId1]: mockSummary1,
        [mockNetworkId2]: mockSummary2,
      })
      expect(fetchNdexSummaries).toHaveBeenCalledWith(
        [mockNetworkId1, mockNetworkId2],
        mockAccessToken,
      )
      expect(putNetworkSummaryToDb).toHaveBeenCalledTimes(2)
    })
  })

  describe('when fetch returns undefined summaries', () => {
    it('should filter out undefined summaries', async () => {
      const mockSummary1 = createMockNetworkSummary(mockNetworkId1)
      ;(getNetworkSummariesFromDb as jest.Mock).mockResolvedValue([
        undefined,
      ])
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([
        mockSummary1,
        undefined,
      ])
      ;(putNetworkSummaryToDb as jest.Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLoadNetworkSummaries())
      const loadNetworkSummaries = result.current

      const summaries = await loadNetworkSummaries(
        [mockNetworkId1, mockNetworkId2],
        mockAccessToken,
      )

      expect(summaries).toEqual({
        [mockNetworkId1]: mockSummary1,
      })
      expect(putNetworkSummaryToDb).toHaveBeenCalledTimes(1)
      expect(putNetworkSummaryToDb).toHaveBeenCalledWith(mockSummary1)
    })
  })

  describe('when access token is not provided', () => {
    it('should work without access token', async () => {
      const mockSummary = createMockNetworkSummary(mockNetworkId1)
      ;(getNetworkSummariesFromDb as jest.Mock).mockResolvedValue([undefined])
      ;(fetchNdexSummaries as jest.Mock).mockResolvedValue([mockSummary])
      ;(putNetworkSummaryToDb as jest.Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLoadNetworkSummaries())
      const loadNetworkSummaries = result.current

      const summaries = await loadNetworkSummaries(mockNetworkId1)

      expect(summaries).toEqual({
        [mockNetworkId1]: mockSummary,
      })
      expect(fetchNdexSummaries).toHaveBeenCalledWith(
        [mockNetworkId1],
        undefined,
      )
    })
  })

  describe('error handling', () => {
    it('should throw error when fetch fails', async () => {
      const fetchError = new Error('Failed to fetch summaries')
      ;(getNetworkSummariesFromDb as jest.Mock).mockResolvedValue([undefined])
      ;(fetchNdexSummaries as jest.Mock).mockRejectedValue(fetchError)

      const { result } = renderHook(() => useLoadNetworkSummaries())
      const loadNetworkSummaries = result.current

      await expect(
        loadNetworkSummaries(mockNetworkId1, mockAccessToken),
      ).rejects.toThrow('Failed to fetch summaries')
    })
  })
})

