import { renderHook } from '@testing-library/react'

import { useRunTask } from '../features/ServiceApps'
import { useServiceResultHandlerManager } from '../features/ServiceApps/resultHandler/serviceResultHandlerManager'
import { ServiceAppAction } from '../models/AppModel/ServiceAppAction'
import { ServiceStatus } from '../models/AppModel/ServiceStatus'
import { MessageSeverity } from '../models/MessageModel'
import NetworkFn, { Network } from '../models/NetworkModel'
import { NetworkSummary } from '../models/NetworkSummaryModel'
import { NetworkView } from '../models/ViewModel'
import { VisualStyle } from '../models/VisualStyleModel'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { useAppStore } from './stores/AppStore'
import { useMessageStore } from './stores/MessageStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useServiceTaskRunner } from './useServiceTaskRunner'

// Mock dependencies
jest.mock('../features/ServiceApps', () => ({
  useRunTask: jest.fn(),
}))

jest.mock(
  '../features/ServiceApps/resultHandler/serviceResultHandlerManager',
  () => ({
    useServiceResultHandlerManager: jest.fn(),
  }),
)

jest.mock('./stores/AppStore', () => ({
  useAppStore: jest.fn(),
}))

jest.mock('./stores/MessageStore', () => ({
  useMessageStore: jest.fn(),
}))

jest.mock('./stores/NetworkStore', () => ({
  useNetworkStore: jest.fn(),
}))

jest.mock('./stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: jest.fn(),
}))

jest.mock('./stores/OpaqueAspectStore', () => ({
  useOpaqueAspectStore: jest.fn(),
}))

jest.mock('./stores/TableStore', () => ({
  useTableStore: jest.fn(),
}))

jest.mock('./stores/UiStateStore', () => ({
  useUiStateStore: jest.fn(),
}))

jest.mock('./stores/ViewModelStore', () => ({
  useViewModelStore: jest.fn(),
}))

jest.mock('./stores/VisualStyleStore', () => ({
  useVisualStyleStore: jest.fn(),
}))

jest.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: jest.fn(),
}))

describe('useServiceTaskRunner', () => {
  const mockServiceUrl = 'https://service.example.com'
  const mockNetworkId = 'network-1'
  const mockAddMessage = jest.fn()
  const mockRunTask = jest.fn()
  const mockGetHandler = jest.fn()

  const createMockNetwork = (): Network => {
    return NetworkFn.createNetworkFromLists(
      mockNetworkId,
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
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

  const createMockVisualStyle = (): VisualStyle => {
    return {} as VisualStyle
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

  const createMockServiceApp = () => {
    return {
      url: mockServiceUrl,
      name: 'Test Service',
      parameters: [
        {
          displayName: 'param1',
          value: 'value1',
          defaultValue: 'default1',
        },
      ],
      serviceInputDefinition: {
        inputNetwork: true,
        inputColumns: true,
      },
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRunTask as jest.Mock).mockReturnValue(mockRunTask)
    ;(useServiceResultHandlerManager as jest.Mock).mockReturnValue({
      getHandler: mockGetHandler,
    })
    ;(useMessageStore as jest.Mock as jest.MockedFunction<typeof useMessageStore>).mockReturnValue(mockAddMessage as any)
    ;(useWorkspaceStore as jest.Mock as jest.MockedFunction<typeof useWorkspaceStore>).mockReturnValue({
      workspace: {
        currentNetworkId: mockNetworkId,
      },
    })
    ;(useNetworkStore as jest.Mock as jest.MockedFunction<typeof useNetworkStore>).mockReturnValue({
      networks: new Map([['network-1', createMockNetwork()]]),
    })
    ;(useNetworkSummaryStore as jest.Mock as jest.MockedFunction<typeof useNetworkSummaryStore>).mockReturnValue({
      summaries: new Map([['network-1', createMockNetworkSummary()]]),
    })
    ;(useViewModelStore as jest.Mock as jest.MockedFunction<typeof useViewModelStore>).mockReturnValue({
      getViewModel: jest.fn(() => createMockNetworkView()),
    })
    ;(useVisualStyleStore as jest.Mock as jest.MockedFunction<typeof useVisualStyleStore>).mockReturnValue({
      visualStyles: {
        [mockNetworkId]: createMockVisualStyle(),
      },
    })
    ;(useTableStore as jest.Mock as jest.MockedFunction<typeof useTableStore>).mockReturnValue({
      tables: {
        [mockNetworkId]: createMockTableRecord(),
      },
    })
    ;(useUiStateStore as jest.Mock as jest.MockedFunction<typeof useUiStateStore>).mockReturnValue({
      ui: {
        visualStyleOptions: {
          [mockNetworkId]: {},
        },
      },
    })
    ;(useOpaqueAspectStore as jest.Mock as jest.MockedFunction<typeof useOpaqueAspectStore>).mockReturnValue({
      opaqueAspects: {
        [mockNetworkId]: {},
      },
    })
    ;(useAppStore as jest.Mock as jest.MockedFunction<typeof useAppStore>).mockReturnValue({
      serviceApps: {
        [mockServiceUrl]: createMockServiceApp(),
      },
    })
  })

  it('should successfully run service task', async () => {
    const mockResult = {
      status: ServiceStatus.Complete,
      result: [
        {
          action: ServiceAppAction.UpdateNetwork,
          data: { nodes: [], edges: [] },
        },
      ],
      message: 'Task completed',
    }
    const mockHandler = jest.fn()
    mockRunTask.mockResolvedValue(mockResult)
    mockGetHandler.mockReturnValue(mockHandler)

    const { result } = renderHook(() => useServiceTaskRunner())
    const run = result.current

    const taskResult = await run(mockServiceUrl)

    expect(taskResult.status).toBe(ServiceStatus.Complete)
    expect(taskResult.algorithmName).toBe('Test Service')
    expect(taskResult.message).toBe('Task completed')
    expect(mockRunTask).toHaveBeenCalledWith({
      serviceUrl: mockServiceUrl,
      algorithmName: 'Test Service',
      customParameters: { param1: 'value1' },
      network: createMockNetwork(),
      table: createMockTableRecord(),
      visualStyle: createMockVisualStyle(),
      summary: createMockNetworkSummary(),
      visualStyleOptions: {},
      viewModel: createMockNetworkView(),
      serviceInputDefinition: {
        inputNetwork: true,
        inputColumns: true,
      },
      opaqueAspect: {},
    })
    expect(mockHandler).toHaveBeenCalled()
  })

  it('should throw error when service not found', async () => {
    ;(useAppStore as jest.Mock as jest.MockedFunction<typeof useAppStore>).mockReturnValue({
      serviceApps: {},
    })

    const { result } = renderHook(() => useServiceTaskRunner())
    const run = result.current

    await expect(run(mockServiceUrl)).rejects.toThrow(
      'Service not found for URL:',
    )
  })

  it('should throw error when network is required but not found', async () => {
    ;(useNetworkStore as jest.Mock as jest.MockedFunction<typeof useNetworkStore>).mockReturnValue({
      networks: new Map(),
    })

    const { result } = renderHook(() => useServiceTaskRunner())
    const run = result.current

    await expect(run(mockServiceUrl)).rejects.toThrow('Network not found')
  })

  it('should throw error when table is required but not found', async () => {
    const serviceApp = createMockServiceApp()
    serviceApp.serviceInputDefinition!.inputNetwork = false
    serviceApp.serviceInputDefinition!.inputColumns = true

    ;(useAppStore as jest.Mock as jest.MockedFunction<typeof useAppStore>).mockReturnValue({
      serviceApps: {
        [mockServiceUrl]: serviceApp,
      },
    })
    ;(useTableStore as jest.Mock as jest.MockedFunction<typeof useTableStore>).mockReturnValue({
      tables: {},
    })

    const { result } = renderHook(() => useServiceTaskRunner())
    const run = result.current

    await expect(run(mockServiceUrl)).rejects.toThrow('Table not found')
  })

  it('should handle incomplete task status', async () => {
    const mockResult = {
      status: ServiceStatus.Processing,
      result: [],
      message: 'Task is running',
    }
    mockRunTask.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useServiceTaskRunner())
    const run = result.current

    const taskResult = await run(mockServiceUrl)

    expect(taskResult.status).toBe(ServiceStatus.Processing)
    expect(mockGetHandler).not.toHaveBeenCalled()
  })

  it('should handle unsupported action', async () => {
    const mockResult = {
      status: ServiceStatus.Complete,
      result: [
        {
          action: 'UNSUPPORTED_ACTION' as any,
          data: {},
        },
      ],
      message: 'Task completed',
    }
    mockRunTask.mockResolvedValue(mockResult)
    mockGetHandler.mockReturnValue(undefined)

    const { result } = renderHook(() => useServiceTaskRunner())
    const run = result.current

    await expect(run(mockServiceUrl)).rejects.toThrow('Unsupported action:')
  })

  it('should use default parameter values when value is not provided', async () => {
    const serviceApp = createMockServiceApp()
      serviceApp.parameters![0].value = ''

    ;(useAppStore as jest.Mock as jest.MockedFunction<typeof useAppStore>).mockReturnValue({
      serviceApps: {
        [mockServiceUrl]: serviceApp,
      },
    })

    const mockResult = {
      status: ServiceStatus.Complete,
      result: [],
      message: 'Task completed',
    }
    mockRunTask.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useServiceTaskRunner())
    const run = result.current

    await run(mockServiceUrl)

    expect(mockRunTask).toHaveBeenCalledWith(
      expect.objectContaining({
        customParameters: { param1: 'default1' },
      }),
    )
  })

  it('should handle service app without parameters', async () => {
    const serviceApp = createMockServiceApp()
      serviceApp.parameters = []

    ;(useAppStore as jest.Mock as jest.MockedFunction<typeof useAppStore>).mockReturnValue({
      serviceApps: {
        [mockServiceUrl]: serviceApp,
      },
    })

    const mockResult = {
      status: ServiceStatus.Complete,
      result: [],
      message: 'Task completed',
    }
    mockRunTask.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useServiceTaskRunner())
    const run = result.current

    await run(mockServiceUrl)

    expect(mockRunTask).toHaveBeenCalledWith(
      expect.objectContaining({
        customParameters: {},
      }),
    )
  })
})

