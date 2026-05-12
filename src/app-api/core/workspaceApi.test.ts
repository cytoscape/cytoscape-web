// src/app-api/core/workspaceApi.test.ts
// Plain Jest tests for workspaceApi core — no renderHook, no React context.

import { ApiErrorCode } from '../types/ApiResult'
import { workspaceApi } from './workspaceApi'

// ── Mock: WorkspaceStore ───────────────────────────────────────────────────────

let mockWorkspace = {
  id: 'ws-1',
  name: 'Test Workspace',
  currentNetworkId: '',
  networkIds: [] as string[],
  networkModified: {} as Record<string, boolean | undefined>,
}

const mockSetCurrentNetworkId = jest.fn((id: string) => {
  mockWorkspace.currentNetworkId = id
})

const mockSetName = jest.fn((name: string) => {
  mockWorkspace.name = name
})

jest.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: mockWorkspace,
      setCurrentNetworkId: mockSetCurrentNetworkId,
      setName: mockSetName,
    })),
  },
}))

// ── Mock: NetworkSummaryStore ─────────────────────────────────────────────────

let mockSummaries: Record<string, any> = {}

jest.mock('../../data/hooks/stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: {
    getState: jest.fn(() => ({ summaries: mockSummaries })),
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNetworkSummary(overrides: Partial<any> = {}) {
  return {
    name: 'Network A',
    description: 'A test network',
    nodeCount: 3,
    edgeCount: 2,
    ...overrides,
  }
}

// ── Tests: getWorkspaceInfo ───────────────────────────────────────────────────

describe('getWorkspaceInfo', () => {
  beforeEach(() => {
    mockWorkspace = {
      id: 'ws-1',
      name: 'My Workspace',
      currentNetworkId: 'net-1',
      networkIds: ['net-1', 'net-2'],
      networkModified: {},
    }
  })

  it('returns workspace metadata', () => {
    const result = workspaceApi.getWorkspaceInfo()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.workspaceId).toBe('ws-1')
      expect(result.data.name).toBe('My Workspace')
      expect(result.data.currentNetworkId).toBe('net-1')
      expect(result.data.networkCount).toBe(2)
    }
  })

  it('returns empty currentNetworkId when no network is selected', () => {
    mockWorkspace.currentNetworkId = ''
    mockWorkspace.networkIds = []
    const result = workspaceApi.getWorkspaceInfo()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currentNetworkId).toBe('')
      expect(result.data.networkCount).toBe(0)
    }
  })
})

// ── Tests: getNetworkIds ──────────────────────────────────────────────────────

describe('getNetworkIds', () => {
  beforeEach(() => {
    mockWorkspace.networkIds = ['net-1', 'net-2', 'net-3']
  })

  it('returns a shallow copy of networkIds', () => {
    const result = workspaceApi.getNetworkIds()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.networkIds).toEqual(['net-1', 'net-2', 'net-3'])
      // Shallow copy — should not be the same reference
      expect(result.data.networkIds).not.toBe(mockWorkspace.networkIds)
    }
  })

  it('returns empty array when workspace has no networks', () => {
    mockWorkspace.networkIds = []
    const result = workspaceApi.getNetworkIds()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.networkIds).toEqual([])
    }
  })
})

// ── Tests: getNetworkList ─────────────────────────────────────────────────────

describe('getNetworkList', () => {
  beforeEach(() => {
    mockWorkspace.networkIds = ['net-1', 'net-2', 'net-3']
    mockWorkspace.networkModified = { 'net-1': true }
    mockSummaries = {
      'net-1': makeNetworkSummary({ name: 'Alpha', description: 'First' }),
      'net-2': makeNetworkSummary({ name: 'Beta', description: 'Second', nodeCount: 10, edgeCount: 5 }),
      // net-3 intentionally missing
    }
  })

  it('joins networkIds with summaries and returns ordered list', () => {
    const result = workspaceApi.getNetworkList()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
      expect(result.data[0].networkId).toBe('net-1')
      expect(result.data[0].name).toBe('Alpha')
      expect(result.data[0].description).toBe('First')
      expect(result.data[1].networkId).toBe('net-2')
      expect(result.data[1].name).toBe('Beta')
      expect(result.data[1].nodeCount).toBe(10)
    }
  })

  it('silently omits networks with missing summary', () => {
    const result = workspaceApi.getNetworkList()
    expect(result.success).toBe(true)
    if (result.success) {
      const ids = result.data.map((n) => n.networkId)
      expect(ids).not.toContain('net-3')
    }
  })

  it('reflects isModified from workspace.networkModified', () => {
    const result = workspaceApi.getNetworkList()
    expect(result.success).toBe(true)
    if (result.success) {
      const net1 = result.data.find((n) => n.networkId === 'net-1')
      const net2 = result.data.find((n) => n.networkId === 'net-2')
      expect(net1?.isModified).toBe(true)
      expect(net2?.isModified).toBe(false)
    }
  })

  it('returns empty array when workspace has no networks', () => {
    mockWorkspace.networkIds = []
    const result = workspaceApi.getNetworkList()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual([])
    }
  })
})

// ── Tests: getNetworkSummary ──────────────────────────────────────────────────

describe('getNetworkSummary', () => {
  beforeEach(() => {
    mockWorkspace.networkIds = ['net-1', 'net-2']
    mockWorkspace.networkModified = {}
    mockSummaries = {
      'net-1': makeNetworkSummary({ name: 'Alpha', description: 'Desc', nodeCount: 5, edgeCount: 4 }),
    }
  })

  it('returns summary for a known network', () => {
    const result = workspaceApi.getNetworkSummary('net-1')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.networkId).toBe('net-1')
      expect(result.data.name).toBe('Alpha')
      expect(result.data.description).toBe('Desc')
      expect(result.data.nodeCount).toBe(5)
      expect(result.data.edgeCount).toBe(4)
      expect(result.data.isModified).toBe(false)
    }
  })

  it('fails with NetworkNotFound when networkId is not in workspace', () => {
    const result = workspaceApi.getNetworkSummary('net-999')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })

  it('fails with NetworkNotFound when summary is missing for a workspace network', () => {
    // net-2 is in workspace but has no summary
    const result = workspaceApi.getNetworkSummary('net-2')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// ── Tests: getCurrentNetworkId ────────────────────────────────────────────────

describe('getCurrentNetworkId', () => {
  it('returns the current network id when set', () => {
    mockWorkspace.networkIds = ['net-1']
    mockWorkspace.currentNetworkId = 'net-1'
    const result = workspaceApi.getCurrentNetworkId()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.networkId).toBe('net-1')
    }
  })

  it('fails with NoCurrentNetwork when no networks are in the workspace', () => {
    mockWorkspace.networkIds = []
    mockWorkspace.currentNetworkId = ''
    const result = workspaceApi.getCurrentNetworkId()
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NoCurrentNetwork)
    }
  })

  it('fails with NoCurrentNetwork when currentNetworkId is empty string', () => {
    mockWorkspace.networkIds = ['net-1']
    mockWorkspace.currentNetworkId = ''
    const result = workspaceApi.getCurrentNetworkId()
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NoCurrentNetwork)
    }
  })
})

// ── Tests: switchCurrentNetwork ───────────────────────────────────────────────

describe('switchCurrentNetwork', () => {
  beforeEach(() => {
    mockWorkspace.networkIds = ['net-1', 'net-2']
    mockWorkspace.currentNetworkId = 'net-1'
    mockSetCurrentNetworkId.mockClear()
  })

  it('switches to a valid network and calls setCurrentNetworkId', () => {
    const result = workspaceApi.switchCurrentNetwork('net-2')
    expect(result.success).toBe(true)
    expect(mockSetCurrentNetworkId).toHaveBeenCalledWith('net-2')
  })

  it('fails with InvalidInput for an empty string', () => {
    const result = workspaceApi.switchCurrentNetwork('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
    expect(mockSetCurrentNetworkId).not.toHaveBeenCalled()
  })

  it('fails with NetworkNotFound when networkId is not in the workspace', () => {
    const result = workspaceApi.switchCurrentNetwork('net-999')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
    expect(mockSetCurrentNetworkId).not.toHaveBeenCalled()
  })
})

// ── Tests: setWorkspaceName ───────────────────────────────────────────────────

describe('setWorkspaceName', () => {
  beforeEach(() => {
    mockSetName.mockClear()
  })

  it('sets the workspace name with trimmed value', () => {
    const result = workspaceApi.setWorkspaceName('  My New Name  ')
    expect(result.success).toBe(true)
    expect(mockSetName).toHaveBeenCalledWith('My New Name')
  })

  it('fails with InvalidInput for an empty string', () => {
    const result = workspaceApi.setWorkspaceName('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
    expect(mockSetName).not.toHaveBeenCalled()
  })

  it('fails with InvalidInput for a whitespace-only string', () => {
    const result = workspaceApi.setWorkspaceName('   ')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
    expect(mockSetName).not.toHaveBeenCalled()
  })
})
