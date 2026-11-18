import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { appRootHref } from './appRootHref'

const listenForDatabaseReset = vi.fn()
let scope: 'app' | 'manual' = 'app'

vi.mock('@/data/db/lifecycle', () => ({
  listenForDatabaseReset: (reload: () => void) =>
    listenForDatabaseReset(reload),
}))
vi.mock('@/data/db/dbScope', () => ({
  currentDbScope: () => scope,
}))

const { installDatabaseResetListener, resetDatabaseResetListenerForTesting } =
  await import('./databaseResetListener')

const assign = vi.fn()
const reload = vi.fn()
const originalLocation = window.location

beforeEach(() => {
  listenForDatabaseReset.mockReset()
  assign.mockReset()
  reload.mockReset()
  resetDatabaseResetListenerForTesting()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, assign, reload },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  })
})

const installedReload = (): (() => void) => {
  installDatabaseResetListener()
  expect(listenForDatabaseReset).toHaveBeenCalledTimes(1)
  return listenForDatabaseReset.mock.calls[0][0] as () => void
}

describe('installDatabaseResetListener', () => {
  it('sends an editor tab (Error page and startup screen included) to the app root', () => {
    scope = 'app'

    installedReload()()

    // Not a reload in place: the address may be /error, a share link or an
    // ?import= URL that would load data back into the cleared cache.
    expect(assign).toHaveBeenCalledWith(appRootHref())
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads a manual tab in place', () => {
    scope = 'manual'

    installedReload()()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(assign).not.toHaveBeenCalled()
  })

  it('installs once per document', () => {
    installDatabaseResetListener()
    installDatabaseResetListener()

    expect(listenForDatabaseReset).toHaveBeenCalledTimes(1)
  })
})

describe('appRootHref', () => {
  it('is the router basename, or / when there is none', () => {
    expect(appRootHref('')).toBe('/')
    expect(appRootHref('/')).toBe('/')
    expect(appRootHref('/cytoscape')).toBe('/cytoscape')
  })
})
