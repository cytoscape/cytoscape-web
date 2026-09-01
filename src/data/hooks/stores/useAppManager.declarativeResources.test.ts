// src/data/hooks/stores/useAppManager.declarativeResources.test.ts
//
// Unit tests for processDeclarativeResources: each declarative entry must
// dispatch to the matching ResourceApi registration method, and unknown
// slots must be warned about rather than thrown.

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createResourceApi } from '../../../app-api/core/resourceApi'
import { logApp } from '../../../debug'
import type { CyApp } from '../../../models/AppModel/CyApp'
import { processDeclarativeResources } from './useAppManager'

vi.mock('../../../app-api/core/resourceApi', () => ({
  createResourceApi: vi.fn(),
}))

vi.mock('../../db', () => ({
  getAppSettingFromDb: vi.fn(),
}))

vi.mock('./appLifecycle', () => ({
  mountApp: vi.fn(),
  unmountApp: vi.fn(),
  unmountAllApps: vi.fn(),
}))

vi.mock('../../../debug', () => ({
  logApp: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  logStartup: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const DummyComponent = (): null => null

function makeMockResourceApi() {
  return {
    registerPanel: vi.fn(() => ({ success: true })),
    registerMenuItem: vi.fn(() => ({ success: true })),
    registerNetworkSearchProvider: vi.fn(() => ({ success: true })),
    registerModal: vi.fn(() => ({ success: true })),
  }
}

function makeApp(resources: unknown[]): CyApp {
  return {
    id: 'app1',
    name: 'app1',
    components: [],
    resources,
  } as unknown as CyApp
}

describe('processDeclarativeResources', () => {
  let mockApi: ReturnType<typeof makeMockResourceApi>

  beforeEach(() => {
    vi.clearAllMocks()
    mockApi = makeMockResourceApi()
    vi.mocked(createResourceApi).mockReturnValue(mockApi as any)
  })

  it('does nothing for apps without declarative resources', () => {
    processDeclarativeResources({ id: 'app1', name: 'app1' } as CyApp)
    expect(createResourceApi).not.toHaveBeenCalled()
  })

  it('dispatches each slot to its registration method', () => {
    processDeclarativeResources(
      makeApp([
        { slot: 'right-panel', id: 'P1', component: DummyComponent },
        { slot: 'apps-menu', id: 'M1', component: DummyComponent },
        { slot: 'search-bar', id: 'S1', name: 'Search', onSubmit: vi.fn() },
        { slot: 'modal-launcher', id: 'D1', component: DummyComponent },
      ]),
    )

    expect(createResourceApi).toHaveBeenCalledWith('app1')
    expect(mockApi.registerPanel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'P1' }),
    )
    expect(mockApi.registerMenuItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'M1' }),
    )
    expect(mockApi.registerNetworkSearchProvider).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'S1' }),
    )
    expect(mockApi.registerModal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'D1' }),
    )
  })

  it('registers modal-launcher entries with their dialog options', () => {
    processDeclarativeResources(
      makeApp([
        {
          slot: 'modal-launcher',
          id: 'D1',
          component: DummyComponent,
          maxWidth: 'md',
          fullWidth: true,
        },
      ]),
    )

    expect(mockApi.registerModal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'D1', maxWidth: 'md', fullWidth: true }),
    )
  })

  it('warns on unknown slots without throwing', () => {
    processDeclarativeResources(
      makeApp([{ slot: 'status-bar', id: 'X', component: DummyComponent }]),
    )

    expect(logApp.warn).toHaveBeenCalledWith(
      expect.stringContaining("Unsupported slot 'status-bar'"),
    )
    expect(mockApi.registerPanel).not.toHaveBeenCalled()
    expect(mockApi.registerModal).not.toHaveBeenCalled()
  })
})
