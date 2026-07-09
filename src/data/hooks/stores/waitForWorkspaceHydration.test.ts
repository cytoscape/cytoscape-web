import { waitForWorkspaceHydration } from './waitForWorkspaceHydration'
import { useWorkspaceStore } from './WorkspaceStore'

// Avoid IndexedDB writes from the WorkspaceStore persist wrapper
jest.mock('../../db', () => ({
  ...jest.requireActual('../../db'),
  deleteDb: jest.fn().mockResolvedValue(undefined),
  putWorkspaceToDb: jest.fn().mockResolvedValue(undefined),
}))

const emptyWorkspace = {
  id: '',
  name: '',
  isRemote: false,
  networkIds: [],
  networkModified: {},
  creationTime: new Date(),
  localModificationTime: new Date(),
  currentNetworkId: '',
}

describe('waitForWorkspaceHydration', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().set({ ...emptyWorkspace })
  })

  it('resolves immediately when the workspace is already hydrated', async () => {
    useWorkspaceStore.getState().setId('ws-1')
    await expect(waitForWorkspaceHydration()).resolves.toBeUndefined()
  })

  it('waits until the workspace becomes hydrated', async () => {
    let resolved = false
    const p = waitForWorkspaceHydration().then(() => {
      resolved = true
    })

    // Still pending while the id is empty
    await Promise.resolve()
    expect(resolved).toBe(false)

    useWorkspaceStore.getState().setId('ws-2')

    await p
    expect(resolved).toBe(true)
  })

  it('gates a setCatalog-style action until hydration (init order)', async () => {
    let catalogComposed = false
    const initLike = async (): Promise<void> => {
      await waitForWorkspaceHydration()
      catalogComposed = true
    }

    const p = initLike()
    await Promise.resolve()
    // Catalog composition must not run before hydration completes
    expect(catalogComposed).toBe(false)

    useWorkspaceStore.getState().setId('ws-3')

    await p
    expect(catalogComposed).toBe(true)
  })
})
