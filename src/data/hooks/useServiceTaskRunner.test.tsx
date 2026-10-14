import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceApp } from '../../models/AppModel/ServiceApp'
import { ServiceAppAction } from '../../models/AppModel/ServiceAppAction'
import { ServiceStatus } from '../../models/AppModel/ServiceStatus'
import NetworkFn from '../../models/NetworkModel'
import type { NetworkSummary } from '../../models/NetworkSummaryModel'
import { createTable } from '../../models/TableModel/impl/inMemoryTable'
import { useAppStore } from './stores/AppStore'
import { useCredentialStore } from './stores/CredentialStore'
import { useMessageStore } from './stores/MessageStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useTableStore } from './stores/TableStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useServiceTaskRunner } from './useServiceTaskRunner'

// Store persistence must not hit IndexedDB
vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  const mocked: Record<string, any> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

const mockRunTask = vi.fn()
vi.mock('../../features/ServiceApps', () => ({
  useRunTask: () => mockRunTask,
}))

const mockGetHandler = vi.fn()
vi.mock(
  '../../features/ServiceApps/resultHandler/serviceResultHandlerManager',
  () => ({
    useServiceResultHandlerManager: () => ({ getHandler: mockGetHandler }),
  }),
)

const NET_ID = 'net-1'
const SERVICE_URL = 'https://service.example.com/task'

const makeServiceApp = (overrides: Partial<ServiceApp> = {}): ServiceApp =>
  ({
    url: SERVICE_URL,
    name: 'Test Service',
    parameters: [{ displayName: 'threshold', type: 'text', value: '5' }],
    serviceInputDefinition: {
      type: 'network',
      scope: 'all',
      inputColumns: [],
      inputNetwork: { model: 'network', format: 'cx2' },
    },
    ...overrides,
  }) as unknown as ServiceApp

const seedCurrentNetwork = (
  summaryOverrides: Partial<NetworkSummary> = {},
): void => {
  const network = NetworkFn.createNetworkFromLists(NET_ID, [{ id: 'n1' }], [])
  useNetworkStore.getState().add(network)
  useTableStore
    .getState()
    .add(NET_ID, createTable(`${NET_ID}-nodes`), createTable(`${NET_ID}-edges`))
  useNetworkSummaryStore.getState().add(NET_ID, {
    externalId: NET_ID,
    name: 'Current Network',
    properties: [],
    ...summaryOverrides,
  } as unknown as NetworkSummary)
  useWorkspaceStore.getState().setCurrentNetworkId(NET_ID)
}

const renderRunner = () =>
  renderHook(() => useServiceTaskRunner()).result.current

describe('useServiceTaskRunner', () => {
  beforeEach(() => {
    mockRunTask.mockReset().mockResolvedValue({
      status: ServiceStatus.Complete,
      message: 'done',
      result: [],
    })
    mockGetHandler.mockReset()
    act(() => {
      useNetworkStore.getState().deleteAll()
      useTableStore.getState().deleteAll()
      useNetworkSummaryStore.getState().deleteAll()
      useWorkspaceStore.getState().setCurrentNetworkId('')
      useAppStore.setState({ serviceApps: { [SERVICE_URL]: makeServiceApp() } })
      useCredentialStore.setState({ getToken: async () => 'ndex-token' })
      useMessageStore.setState({ messages: [] })
    })
  })

  it('rejects for a URL with no registered service app', async () => {
    const run = renderRunner()

    await expect(run('https://unknown.example.com')).rejects.toThrow(
      'Service not found for URL: https://unknown.example.com',
    )
    expect(mockRunTask).not.toHaveBeenCalled()
  })

  it('rejects when the service wants a network but none is loaded', async () => {
    const run = renderRunner()

    await expect(run(SERVICE_URL)).rejects.toThrow('Network not found')
    expect(mockRunTask).not.toHaveBeenCalled()
  })

  it("skips the data guards for services that request no data (type 'none')", async () => {
    act(() => {
      useAppStore.setState({
        serviceApps: {
          [SERVICE_URL]: makeServiceApp({
            serviceInputDefinition: {
              type: 'none',
              scope: 'all',
              inputColumns: [],
              inputNetwork: { model: 'network', format: 'cx2' },
            } as unknown as ServiceApp['serviceInputDefinition'],
          }),
        },
      })
    })
    const run = renderRunner()

    const result = await run(SERVICE_URL)

    expect(result.status).toBe(ServiceStatus.Complete)
    expect(mockRunTask).toHaveBeenCalledTimes(1)
  })

  it('runs the task with resolved parameters and dispatches result actions', async () => {
    act(() => {
      seedCurrentNetwork()
    })
    const layoutData = { positions: [] }
    mockRunTask.mockResolvedValue({
      status: ServiceStatus.Complete,
      message: 'ok',
      result: [{ action: ServiceAppAction.UpdateLayouts, data: layoutData }],
    })
    const handler = vi.fn()
    mockGetHandler.mockReturnValue(handler)
    const run = renderRunner()

    const result = await run(SERVICE_URL)

    expect(mockRunTask).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceUrl: SERVICE_URL,
        algorithmName: 'Test Service',
        customParameters: { threshold: '5' },
      }),
    )
    expect(mockGetHandler).toHaveBeenCalledWith(ServiceAppAction.UpdateLayouts)
    expect(handler).toHaveBeenCalledWith({
      responseObj: layoutData,
      networkId: NET_ID,
    })
    expect(result).toEqual({
      status: ServiceStatus.Complete,
      algorithmName: 'Test Service',
      message: 'ok',
    })
  })

  it('does not dispatch handlers when the task did not complete', async () => {
    act(() => {
      seedCurrentNetwork()
    })
    mockRunTask.mockResolvedValue({
      status: ServiceStatus.Failed,
      message: 'boom',
      result: [{ action: ServiceAppAction.UpdateLayouts, data: {} }],
    })
    const run = renderRunner()

    const result = await run(SERVICE_URL)

    expect(result.status).toBe(ServiceStatus.Failed)
    expect(mockGetHandler).not.toHaveBeenCalled()
  })

  it('blocks updateNetwork actions for HCX networks with a warning instead', async () => {
    act(() => {
      seedCurrentNetwork({
        properties: [
          {
            predicateString: 'HCX::interactionNetworkUUID',
            value: 'abc-123',
            predicateType: 'string',
          },
        ] as unknown as NetworkSummary['properties'],
      })
    })
    mockRunTask.mockResolvedValue({
      status: ServiceStatus.Complete,
      message: 'ok',
      result: [{ action: ServiceAppAction.UpdateNetwork, data: {} }],
    })
    const run = renderRunner()

    await act(() => run(SERVICE_URL))

    expect(mockGetHandler).not.toHaveBeenCalled()
    expect(
      useMessageStore
        .getState()
        .messages.some((m) =>
          m.message.includes('not supported for HCX networks'),
        ),
    ).toBe(true)
  })

  it('rejects on a result action with no registered handler', async () => {
    act(() => {
      seedCurrentNetwork()
    })
    mockRunTask.mockResolvedValue({
      status: ServiceStatus.Complete,
      message: 'ok',
      result: [{ action: 'teleport', data: {} }],
    })
    mockGetHandler.mockReturnValue(undefined)
    const run = renderRunner()

    await expect(run(SERVICE_URL)).rejects.toThrow(
      'Unsupported action: teleport',
    )
  })
})
