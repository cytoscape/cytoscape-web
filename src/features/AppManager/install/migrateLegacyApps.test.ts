import { deleteAppFromDb, getAllAppsFromDb } from '../../../data/db'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { migrateLegacyApps } from './migrateLegacyApps'

jest.mock('../../../data/db', () => ({
  getAllAppsFromDb: jest.fn(),
  deleteAppFromDb: jest.fn().mockResolvedValue(undefined),
}))

const mockGetAll = getAllAppsFromDb as jest.Mock
const mockDelete = deleteAppFromDb as jest.Mock

const catalogEntry = (id: string) => ({
  id,
  url: `https://apps.cytoscape.org/web/${id}/1.0.0/remoteEntry.js`,
  author: 'Test',
})

const legacyApp = (id: string, status?: AppStatus) => ({
  id,
  name: `App ${id}`,
  ...(status !== undefined && { status }),
})

describe('migrateLegacyApps', () => {
  let addInstalledApp: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    addInstalledApp = jest.fn()
  })

  it('migrates an active legacy record present in the catalog, preserving status', async () => {
    mockGetAll.mockResolvedValue([legacyApp('hello', AppStatus.Active)])

    await migrateLegacyApps({
      catalog: { hello: catalogEntry('hello') },
      installedAppIds: new Set(),
      addInstalledApp,
    })

    expect(addInstalledApp).toHaveBeenCalledTimes(1)
    expect(addInstalledApp).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: catalogEntry('hello'),
        status: AppStatus.Active,
        source: 'manifest',
      }),
    )
    expect(mockDelete).toHaveBeenCalledWith('hello')
  })

  it('defaults a missing status to Inactive', async () => {
    mockGetAll.mockResolvedValue([legacyApp('hello')])

    await migrateLegacyApps({
      catalog: { hello: catalogEntry('hello') },
      installedAppIds: new Set(),
      addInstalledApp,
    })

    expect(addInstalledApp).toHaveBeenCalledWith(
      expect.objectContaining({ status: AppStatus.Inactive }),
    )
  })

  it('drops a legacy record with no catalog entry (no resolvable URL)', async () => {
    mockGetAll.mockResolvedValue([legacyApp('ghost', AppStatus.Active)])

    await migrateLegacyApps({
      catalog: {},
      installedAppIds: new Set(),
      addInstalledApp,
    })

    expect(addInstalledApp).not.toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalledWith('ghost')
  })

  it('skips a record already present in installedApps but still cleans it up', async () => {
    mockGetAll.mockResolvedValue([legacyApp('hello', AppStatus.Active)])

    await migrateLegacyApps({
      catalog: { hello: catalogEntry('hello') },
      installedAppIds: new Set(['hello']),
      addInstalledApp,
    })

    expect(addInstalledApp).not.toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalledWith('hello')
  })

  it('is a no-op when the legacy store is empty (idempotent second run)', async () => {
    mockGetAll.mockResolvedValue([])

    await migrateLegacyApps({
      catalog: {},
      installedAppIds: new Set(),
      addInstalledApp,
    })

    expect(addInstalledApp).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('migrates multiple records and processes mixed cases together', async () => {
    mockGetAll.mockResolvedValue([
      legacyApp('keep', AppStatus.Active), // migrate
      legacyApp('ghost', AppStatus.Inactive), // drop (no catalog)
      legacyApp('dup', AppStatus.Active), // skip (already installed)
    ])

    await migrateLegacyApps({
      catalog: { keep: catalogEntry('keep'), dup: catalogEntry('dup') },
      installedAppIds: new Set(['dup']),
      addInstalledApp,
    })

    expect(addInstalledApp).toHaveBeenCalledTimes(1)
    expect(addInstalledApp).toHaveBeenCalledWith(
      expect.objectContaining({ entry: catalogEntry('keep') }),
    )
    expect(mockDelete).toHaveBeenCalledWith('keep')
    expect(mockDelete).toHaveBeenCalledWith('ghost')
    expect(mockDelete).toHaveBeenCalledWith('dup')
    expect(mockDelete).toHaveBeenCalledTimes(3)
  })
})
