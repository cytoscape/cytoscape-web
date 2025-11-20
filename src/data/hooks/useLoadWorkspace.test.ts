import {
  deleteDb,
  getAllAppsFromDb,
  getAllServiceAppsFromDb,
  getWorkspaceFromDb,
  initializeDb,
  putAppToDb,
  putServiceAppToDb,
} from '../db'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { CyApp } from '../../models/AppModel/CyApp'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { useLoadWorkspace, RemoteWorkspace } from './useLoadWorkspace'
import { serviceFetcher } from './stores/AppStore'

// Mock window.location.reload
const mockReload = jest.fn()
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
  },
  writable: true,
})

// Mock serviceFetcher
const mockServiceFetcher = jest.fn()
jest.mock('./stores/AppStore', () => ({
  serviceFetcher: (...args: any[]) => mockServiceFetcher(...args),
}))

const setupFreshDb = async () => {
  await deleteDb()
  await initializeDb()
}

const createCyApp = (
  id: string,
  status: AppStatus = AppStatus.Active,
): CyApp => {
  return {
    id,
    name: `App ${id}`,
    description: 'Test application',
    components: [],
    status,
  }
}

const createServiceApp = (url: string): ServiceApp => {
  return {
    url,
    name: `Service ${url}`,
    version: '1.0.0',
    author: 'Test Author',
    citation: 'Test Citation',
    cyWebAction: [],
    cyWebMenuItem: {
      root: 'Tools' as any,
      path: [
        {
          name: 'Test Service',
          gravity: 0,
        },
      ],
    },
    parameters: [],
  }
}

const createRemoteWorkspace = (
  workspaceId: string,
  activeApps: string[] = [],
  serviceApps: string[] = [],
): RemoteWorkspace => {
  return {
    workspaceId,
    name: `Workspace ${workspaceId}`,
    networkIDs: ['network-1', 'network-2'],
    modificationTime: new Date(),
    creationTime: new Date(),
    options: {
      currentNetwork: 'network-1',
      activeApps,
      serviceApps,
    },
  }
}

describe('useLoadWorkspace', () => {
  beforeEach(async () => {
    await setupFreshDb()
    mockReload.mockClear()
    mockServiceFetcher.mockClear()
  })

  it('should clear database and write workspace', async () => {
    const loadWorkspace = useLoadWorkspace()
    const workspace = createRemoteWorkspace('workspace-1')

    await loadWorkspace(workspace, {}, {})

    const savedWorkspace = await getWorkspaceFromDb('workspace-1')
    expect(savedWorkspace).toBeDefined()
    expect(savedWorkspace.id).toBe('workspace-1')
    expect(savedWorkspace.name).toBe('Workspace workspace-1')
    expect(savedWorkspace.isRemote).toBe(true)
    expect(savedWorkspace.networkIds).toEqual(['network-1', 'network-2'])
    expect(savedWorkspace.currentNetworkId).toBe('network-1')
  })

  it('should update app statuses in database', async () => {
    // Setup: Add apps to DB
    const app1 = createCyApp('app-1', AppStatus.Active)
    const app2 = createCyApp('app-2', AppStatus.Inactive)
    await putAppToDb(app1)
    await putAppToDb(app2)

    const loadWorkspace = useLoadWorkspace()
    const workspace = createRemoteWorkspace('workspace-1', ['app-1', 'app-2'])

    // Current apps: app-1 is active, app-2 is inactive
    const currentApps = {
      'app-1': app1,
      'app-2': app2,
    }

    await loadWorkspace(workspace, currentApps, {})

    // Check app statuses in DB
    const dbApp1 = await getAllAppsFromDb()
    const app1InDb = dbApp1.find((app) => app.id === 'app-1')
    const app2InDb = dbApp1.find((app) => app.id === 'app-2')

    expect(app1InDb?.status).toBe(AppStatus.Active)
    expect(app2InDb?.status).toBe(AppStatus.Active) // Should be activated
  })

  it('should deactivate apps not in workspace activeApps list', async () => {
    const app1 = createCyApp('app-1', AppStatus.Active)
    const app2 = createCyApp('app-2', AppStatus.Active)
    await putAppToDb(app1)
    await putAppToDb(app2)

    const loadWorkspace = useLoadWorkspace()
    const workspace = createRemoteWorkspace('workspace-1', ['app-1']) // Only app-1 should be active

    const currentApps = {
      'app-1': app1,
      'app-2': app2,
    }

    await loadWorkspace(workspace, currentApps, {})

    const dbApps = await getAllAppsFromDb()
    const app1InDb = dbApps.find((app) => app.id === 'app-1')
    const app2InDb = dbApps.find((app) => app.id === 'app-2')

    expect(app1InDb?.status).toBe(AppStatus.Active)
    expect(app2InDb?.status).toBe(AppStatus.Inactive) // Should be deactivated
  })

  it('should add new apps to database if they exist in currentApps', async () => {
    const loadWorkspace = useLoadWorkspace()
    const workspace = createRemoteWorkspace('workspace-1', ['app-1'])

    const currentApps = {
      'app-1': createCyApp('app-1', AppStatus.Active),
    }

    await loadWorkspace(workspace, currentApps, {})

    const dbApps = await getAllAppsFromDb()
    expect(dbApps).toHaveLength(1)
    expect(dbApps[0].id).toBe('app-1')
    expect(dbApps[0].status).toBe(AppStatus.Active)
  })

  it('should only add service apps that are in workspace list', async () => {
    const serviceApp1 = createServiceApp('https://service1.com')
    const serviceApp2 = createServiceApp('https://service2.com')

    const loadWorkspace = useLoadWorkspace()
    const workspace = createRemoteWorkspace(
      'workspace-1',
      [],
      ['https://service1.com'],
    )

    // Provide both in currentServiceApps - only serviceApp1 should be added since it's in workspace
    // The logic prefers store data over fetching, so serviceApp1 will be added from currentServiceApps
    const currentServiceApps = {
      'https://service1.com': serviceApp1,
      'https://service2.com': serviceApp2,
    }

    await loadWorkspace(workspace, {}, currentServiceApps)

    // After deleteDb() and import, only serviceApp1 should be in DB (from workspace list)
    // serviceApp2 should not be added because it's not in the workspace list
    const dbServiceApps = await getAllServiceAppsFromDb()
    expect(dbServiceApps).toHaveLength(1)
    expect(dbServiceApps[0].url).toBe('https://service1.com')
  })

  it('should fetch and add new service apps from workspace list', async () => {
    const newServiceApp = createServiceApp('https://newservice.com')
    mockServiceFetcher.mockResolvedValue(newServiceApp)

    const loadWorkspace = useLoadWorkspace()
    const workspace = createRemoteWorkspace(
      'workspace-1',
      [],
      ['https://newservice.com'],
    )

    await loadWorkspace(workspace, {}, {})

    expect(mockServiceFetcher).toHaveBeenCalledWith('https://newservice.com')
    const dbServiceApps = await getAllServiceAppsFromDb()
    expect(dbServiceApps).toHaveLength(1)
    expect(dbServiceApps[0].url).toBe('https://newservice.com')
  })

  it('should handle service app fetch errors gracefully', async () => {
    mockServiceFetcher.mockRejectedValue(new Error('Failed to fetch'))

    const loadWorkspace = useLoadWorkspace()
    const workspace = createRemoteWorkspace(
      'workspace-1',
      [],
      ['https://failingservice.com'],
    )

    // Should not throw
    await expect(loadWorkspace(workspace, {}, {})).resolves.not.toThrow()

    // Workspace should still be saved
    const savedWorkspace = await getWorkspaceFromDb('workspace-1')
    expect(savedWorkspace).toBeDefined()
  })

  it('should continue with workspace write even if app updates fail', async () => {
    // Mock putAppToDb to fail
    const originalPutAppToDb = require('../db').putAppToDb
    jest
      .spyOn(require('../db'), 'putAppToDb')
      .mockRejectedValueOnce(new Error('DB error'))

    const loadWorkspace = useLoadWorkspace()
    const workspace = createRemoteWorkspace('workspace-1', ['app-1'])

    const currentApps = {
      'app-1': createCyApp('app-1'),
    }

    // Should not throw
    await expect(
      loadWorkspace(workspace, currentApps, {}),
    ).resolves.not.toThrow()

    // Workspace should still be saved
    const savedWorkspace = await getWorkspaceFromDb('workspace-1')
    expect(savedWorkspace).toBeDefined()

    jest.restoreAllMocks()
  })

  it('should complete successfully without errors', async () => {
    const loadWorkspace = useLoadWorkspace()
    const workspace = createRemoteWorkspace('workspace-1')

    // Should not throw
    await expect(loadWorkspace(workspace, {}, {})).resolves.not.toThrow()

    // Workspace should be saved
    const savedWorkspace = await getWorkspaceFromDb('workspace-1')
    expect(savedWorkspace).toBeDefined()
  })

  it('should handle workspace with no options', async () => {
    const loadWorkspace = useLoadWorkspace()
    const workspace: RemoteWorkspace = {
      workspaceId: 'workspace-1',
      name: 'Workspace 1',
      networkIDs: [],
      modificationTime: new Date(),
      creationTime: new Date(),
    }

    await loadWorkspace(workspace, {}, {})

    const savedWorkspace = await getWorkspaceFromDb('workspace-1')
    expect(savedWorkspace).toBeDefined()
    expect(savedWorkspace.currentNetworkId).toBe('')
  })

  it('should use custom service fetcher when provided', async () => {
    const customFetcher = jest
      .fn()
      .mockResolvedValue(createServiceApp('https://custom.com'))
    const loadWorkspace = useLoadWorkspace(customFetcher)
    const workspace = createRemoteWorkspace(
      'workspace-1',
      [],
      ['https://custom.com'],
    )

    await loadWorkspace(workspace, {}, {})

    expect(customFetcher).toHaveBeenCalledWith('https://custom.com')
    expect(mockServiceFetcher).not.toHaveBeenCalled()
  })
})
