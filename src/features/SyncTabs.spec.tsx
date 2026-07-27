import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppConfigContext, AppConfig } from '@/AppConfigContext'
import appConfig from '@/assets/config.json'
import { getTimestampFromDb } from '@/data/db'
import { SyncTabsAction } from './SyncTabs'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ workspaceId: 'workspace-1', networkId: 'network-1' }),
}))

vi.mock('../data/db', () => ({
  getDb: vi.fn().mockResolvedValue({ on: vi.fn() }),
  getTimestampFromDb: vi.fn().mockResolvedValue(0),
  getWorkspaceFromDb: vi.fn().mockResolvedValue({ networkIds: [] }),
  putTimestampToDb: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../data/hooks/stores/AppStore', () => ({
  useAppStore: { getState: () => ({ currentTask: undefined }) },
}))

const setDocumentHidden = (hidden: boolean): void => {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

const renderWithConfig = (config: AppConfig): ReturnType<typeof render> =>
  render(
    <AppConfigContext.Provider value={config}>
      <SyncTabsAction />
    </AppConfigContext.Provider>,
  )

describe('SyncTabsAction auto reload', () => {
  afterEach(() => {
    setDocumentHidden(false)
    vi.clearAllMocks()
  })

  it('checks the shared timestamp on tab focus when auto reload is enabled', async () => {
    renderWithConfig({
      ...(appConfig as AppConfig),
      debugOptions: { disableAutoReload: false },
    })

    act(() => {
      setDocumentHidden(true)
      setDocumentHidden(false)
    })

    expect(getTimestampFromDb).toHaveBeenCalled()
  })

  it('does nothing on tab focus when debugOptions.disableAutoReload is set', async () => {
    renderWithConfig({
      ...(appConfig as AppConfig),
      debugOptions: { disableAutoReload: true },
    })

    act(() => {
      setDocumentHidden(true)
      setDocumentHidden(false)
    })

    expect(getTimestampFromDb).not.toHaveBeenCalled()
  })
})
