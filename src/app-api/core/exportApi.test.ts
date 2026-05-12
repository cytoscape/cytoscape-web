// src/app-api/core/exportApi.test.ts
// Plain Jest tests for exportApi core — no renderHook, no React context.

import { ApiErrorCode } from '../types/ApiResult'
import { exportApi } from './exportApi'

// ── Mock: exportCyNetworkToCx2 ────────────────────────────────────────────────

jest.mock('../../models/CxModel/impl/exporter', () => ({
  exportCyNetworkToCx2: jest.fn(),
}))

// Access the auto-mocked function after registration (avoids const-TDZ in hoisted factory)
let mockExportCyNetworkToCx2: jest.Mock
beforeAll(() => {
  mockExportCyNetworkToCx2 =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../models/CxModel/impl/exporter').exportCyNetworkToCx2
})

// ── Mock: NetworkStore ────────────────────────────────────────────────────────

const mockNetworks = new Map<string, any>()
jest.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: { getState: jest.fn(() => ({ networks: mockNetworks })) },
}))

// ── Mock: TableStore ──────────────────────────────────────────────────────────

const mockTables: Record<string, any> = {}
jest.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: { getState: jest.fn(() => ({ tables: mockTables })) },
}))

// ── Mock: VisualStyleStore ────────────────────────────────────────────────────

const mockVisualStyles: Record<string, any> = {}
jest.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: jest.fn(() => ({ visualStyles: mockVisualStyles })),
  },
}))

// ── Mock: ViewModelStore ──────────────────────────────────────────────────────

const mockGetViewModel = jest.fn()
jest.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: jest.fn(() => ({ getViewModel: mockGetViewModel })),
  },
}))

// ── Mock: OpaqueAspectStore ───────────────────────────────────────────────────

const mockOpaqueAspects: Record<string, any> = {}
jest.mock('../../data/hooks/stores/OpaqueAspectStore', () => ({
  useOpaqueAspectStore: {
    getState: jest.fn(() => ({ opaqueAspects: mockOpaqueAspects })),
  },
}))

// ── Mock: NetworkSummaryStore ─────────────────────────────────────────────────

const mockSummaries: Record<string, any> = {}
jest.mock('../../data/hooks/stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: {
    getState: jest.fn(() => ({ summaries: mockSummaries })),
  },
}))

// ── Test setup ────────────────────────────────────────────────────────────────

const mockNetwork = { id: 'net1', nodes: [], edges: [] }
const mockNodeTable = { id: 'nodeTable' }
const mockEdgeTable = { id: 'edgeTable' }
const mockVisualStyle = { id: 'visualStyle' }
const mockViewModel = { id: 'viewModel', nodeViews: {} }
const mockCx2Result = [{ CXVersion: '2.0' }]

beforeEach(() => {
  jest.clearAllMocks()
  mockNetworks.clear()
  Object.keys(mockTables).forEach((k) => delete mockTables[k])
  Object.keys(mockVisualStyles).forEach((k) => delete mockVisualStyles[k])
  Object.keys(mockOpaqueAspects).forEach((k) => delete mockOpaqueAspects[k])
  Object.keys(mockSummaries).forEach((k) => delete mockSummaries[k])
  mockGetViewModel.mockReturnValue(undefined)
  mockExportCyNetworkToCx2.mockReturnValue(mockCx2Result)
})

// ── Validation: missing stores ────────────────────────────────────────────────

describe('exportToCx2 — validation', () => {
  it('returns NetworkNotFound when network is missing', () => {
    const result = exportApi.exportToCx2('net1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      expect(result.error.message).toContain('net1')
    }
  })

  it('returns NetworkNotFound when tables are missing', () => {
    mockNetworks.set('net1', mockNetwork)
    const result = exportApi.exportToCx2('net1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      expect(result.error.message).toContain('Tables')
    }
  })

  it('returns NetworkNotFound when visual style is missing', () => {
    mockNetworks.set('net1', mockNetwork)
    mockTables['net1'] = { nodeTable: mockNodeTable, edgeTable: mockEdgeTable }
    const result = exportApi.exportToCx2('net1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      expect(result.error.message).toContain('Visual style')
    }
  })

  it('returns NetworkNotFound when view model is missing', () => {
    mockNetworks.set('net1', mockNetwork)
    mockTables['net1'] = { nodeTable: mockNodeTable, edgeTable: mockEdgeTable }
    mockVisualStyles['net1'] = mockVisualStyle
    mockGetViewModel.mockReturnValue(undefined)
    const result = exportApi.exportToCx2('net1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      expect(result.error.message).toContain('View model')
    }
  })
})

// ── Happy path ────────────────────────────────────────────────────────────────

describe('exportToCx2 — happy path', () => {
  beforeEach(() => {
    mockNetworks.set('net1', mockNetwork)
    mockTables['net1'] = { nodeTable: mockNodeTable, edgeTable: mockEdgeTable }
    mockVisualStyles['net1'] = mockVisualStyle
    mockGetViewModel.mockReturnValue(mockViewModel)
  })

  it('returns ok() with cx2 data', () => {
    const result = exportApi.exportToCx2('net1')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(mockCx2Result)
    }
  })

  it('calls exportCyNetworkToCx2 with assembled CyNetwork', () => {
    exportApi.exportToCx2('net1')
    expect(mockExportCyNetworkToCx2).toHaveBeenCalledWith(
      expect.objectContaining({
        network: mockNetwork,
        nodeTable: mockNodeTable,
        edgeTable: mockEdgeTable,
        visualStyle: mockVisualStyle,
        networkViews: [mockViewModel],
      }),
      undefined, // no summary
      undefined, // no networkName override
    )
  })

  it('passes summary when available in NetworkSummaryStore', () => {
    const mockSummary = { name: 'TestNetwork' }
    mockSummaries['net1'] = mockSummary
    exportApi.exportToCx2('net1')
    expect(mockExportCyNetworkToCx2).toHaveBeenCalledWith(
      expect.any(Object),
      mockSummary,
      undefined,
    )
  })

  it('passes networkName option to exporter', () => {
    exportApi.exportToCx2('net1', { networkName: 'MyNetwork' })
    expect(mockExportCyNetworkToCx2).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      'MyNetwork',
    )
  })

  it('includes opaqueAspects when present in store', () => {
    const mockAspect = { customAspect: [{ data: 'value' }] }
    mockOpaqueAspects['net1'] = mockAspect
    exportApi.exportToCx2('net1')
    const [cyNetworkArg] = mockExportCyNetworkToCx2.mock.calls[0]
    expect(cyNetworkArg.otherAspects).toEqual([mockAspect])
  })

  it('sets otherAspects to undefined when no opaque aspects', () => {
    exportApi.exportToCx2('net1')
    const [cyNetworkArg] = mockExportCyNetworkToCx2.mock.calls[0]
    expect(cyNetworkArg.otherAspects).toBeUndefined()
  })

  it('returns OperationFailed when exporter throws', () => {
    mockExportCyNetworkToCx2.mockImplementation(() => {
      throw new Error('Export error')
    })
    const result = exportApi.exportToCx2('net1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
    }
  })
})
