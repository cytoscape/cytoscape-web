import { renderHook } from '@testing-library/react'

import { useWorkspaceData } from './useWorkspaceData'

// Mock all the stores
jest.mock('./stores/AppStore', () => ({
  useAppStore: jest.fn((selector) =>
    selector({
      apps: { 'app-1': { id: 'app-1', name: 'App 1' } },
      serviceApps: { 'service-1': { url: 'service-1', name: 'Service 1' } },
    }),
  ),
}))

jest.mock('./stores/NetworkStore', () => ({
  useNetworkStore: jest.fn((selector) =>
    selector({
      networks: new Map([['network-1', { id: 'network-1', nodes: [], edges: [] }]]),
    }),
  ),
}))

jest.mock('./stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: jest.fn((selector) =>
    selector({
      summaries: new Map([
        [
          'network-1',
          {
            externalId: 'network-1',
            name: 'Network 1',
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
            nodeCount: 0,
            edgeCount: 0,
            description: 'Test network',
            creationTime: new Date(),
            isDeleted: false,
            modificationTime: new Date(),
          },
        ],
      ]),
    }),
  ),
}))

jest.mock('./stores/VisualStyleStore', () => ({
  useVisualStyleStore: jest.fn((selector) =>
    selector({
      visualStyles: {
        'network-1': { nodeStyles: {}, edgeStyles: {} },
      },
    }),
  ),
}))

jest.mock('./stores/TableStore', () => ({
  useTableStore: jest.fn((selector) =>
    selector({
      tables: {
        'network-1': {
          nodeTable: { id: 'node-table-1', columns: [], rows: new Map() },
          edgeTable: { id: 'edge-table-1', columns: [], rows: new Map() },
        },
      },
    }),
  ),
}))

jest.mock('./stores/ViewModelStore', () => ({
  useViewModelStore: jest.fn((selector) =>
    selector({
      viewModels: {
        'network-1': {
          networkId: 'network-1',
          selectedNodes: [],
          selectedEdges: [],
          nodeViews: {},
          edgeViews: {},
        },
      },
    }),
  ),
}))

jest.mock('./stores/UiStateStore', () => ({
  useUiStateStore: jest.fn((selector) =>
    selector({
      ui: {
        visualStyleOptions: {
          'network-1': {},
        },
      },
    }),
  ),
}))

jest.mock('./stores/OpaqueAspectStore', () => ({
  useOpaqueAspectStore: jest.fn((selector) =>
    selector({
      opaqueAspects: {
        'network-1': {},
      },
    }),
  ),
}))

jest.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: jest.fn((selector) =>
    selector({
      workspace: {
        id: 'workspace-1',
        name: 'Test Workspace',
        networkIds: ['network-1'],
        currentNetworkId: 'network-1',
        isRemote: false,
        networkModified: {
          'network-1': true,
        },
      },
    }),
  ),
}))

describe('useWorkspaceData', () => {
  it('should return all workspace data', () => {
    const { result } = renderHook(() => useWorkspaceData())

    expect(result.current).toEqual({
      apps: { 'app-1': { id: 'app-1', name: 'App 1' } },
      serviceApps: { 'service-1': { url: 'service-1', name: 'Service 1' } },
      networks: new Map([['network-1', { id: 'network-1', nodes: [], edges: [] }]]),
      visualStyles: {
        'network-1': { nodeStyles: {}, edgeStyles: {} },
      },
      summaries: expect.any(Map),
      tables: {
        'network-1': {
          nodeTable: { id: 'node-table-1', columns: [], rows: new Map() },
          edgeTable: { id: 'edge-table-1', columns: [], rows: new Map() },
        },
      },
      viewModels: {
        'network-1': {
          networkId: 'network-1',
          selectedNodes: [],
          selectedEdges: [],
          nodeViews: {},
          edgeViews: {},
        },
      },
      networkVisualStyleOpt: {
        'network-1': {},
      },
      opaqueAspects: {
        'network-1': {},
      },
      allNetworkId: ['network-1'],
      workspaceId: 'workspace-1',
      currentWorkspaceName: 'Test Workspace',
      networkModifiedStatus: {
        'network-1': true,
      },
      isRemoteWorkspace: false,
    })
  })
})

