import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '../../data/hooks/stores/AppStore'
import type { AppManagerCommands } from '../../data/hooks/stores/useAppManager'
import { AppCatalogEntry } from '../../models/AppModel/AppCatalogEntry'
import { AppLoadFailure } from '../../models/AppModel/AppLoadFailure'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { AppSource } from '../../models/AppModel/InstalledApp'
import { AppListPanel } from './AppListPanel'
import { AppManagerCommandsProvider } from './AppManagerCommandsContext'

const entry = (id: string): AppCatalogEntry => ({
  id,
  url: `https://apps.cytoscape.org/web/${id}/1.0.0/remoteEntry.js`,
  author: 'Test',
  name: `${id} app`,
  version: '1.0.0',
})

const commands = (): AppManagerCommands =>
  ({
    activateApp: vi.fn().mockResolvedValue(undefined),
    deactivateApp: vi.fn().mockResolvedValue(undefined),
    retryApp: vi.fn().mockResolvedValue(undefined),
    refreshCatalog: vi.fn().mockResolvedValue(undefined),
    setManifestSource: vi.fn(),
    removeOrphan: vi.fn(),
    installApp: vi.fn().mockResolvedValue(undefined),
    uninstallApp: vi.fn().mockResolvedValue(undefined),
  }) as unknown as AppManagerCommands

/**
 * Seed the catalog with a single app and render the panel.
 *
 * @param source provenance recorded for the merged catalog entry
 * @param inManifest whether the resolved manifest still ships the id
 */
const renderPanel = (
  id: string,
  source: AppSource,
  inManifest: boolean,
): AppManagerCommands => {
  useAppStore
    .getState()
    .setCatalog([entry(id)], { [id]: source }, inManifest ? [id] : [])
  useAppStore.setState({
    apps: {
      [id]: { id, name: `${id} app`, status: AppStatus.Inactive } as any,
    },
    loadStates: {},
    loadErrors: {},
  })
  const cmds = commands()
  render(
    <AppManagerCommandsProvider value={cmds}>
      <AppListPanel />
    </AppManagerCommandsProvider>,
  )
  return cmds
}

describe('AppListPanel — uninstall affordance', () => {
  beforeEach(() => {
    useAppStore.setState({
      apps: {},
      catalog: {},
      catalogSources: {},
      manifestIds: [],
      loadStates: {},
      loadErrors: {},
    })
  })

  it('hides the kebab for a plain manifest app and keeps the toggle', () => {
    renderPanel('hello', 'manifest', true)

    expect(screen.queryByTestId('app-kebab-hello')).toBeNull()
    expect(screen.getByTestId('app-toggle-hello')).toBeTruthy()
  })

  // The #699 regression: a snapshot restore stamps source 'snapshot' on every
  // entry, manifest ids included, and the pinned record wins the merge. Keying
  // removability on `source` alone put Uninstall back on an apps.json app.
  it('hides the kebab for a manifest app restored from a snapshot', () => {
    renderPanel('hello', 'snapshot', true)

    expect(screen.queryByTestId('app-kebab-hello')).toBeNull()
    expect(screen.getByTestId('app-toggle-hello')).toBeTruthy()
  })

  it('hides the kebab for a manifest app pinned by an App Store install', () => {
    renderPanel('hello', 'appstore', true)

    expect(screen.queryByTestId('app-kebab-hello')).toBeNull()
    expect(screen.getByTestId('app-toggle-hello')).toBeTruthy()
  })

  it('shows the kebab for an App Store app the manifest does not ship', () => {
    renderPanel('remote', 'appstore', false)

    expect(screen.getByTestId('app-kebab-remote')).toBeTruthy()
  })

  it('shows the kebab for a snapshot app the manifest does not ship', () => {
    renderPanel('remote', 'snapshot', false)

    expect(screen.getByTestId('app-kebab-remote')).toBeTruthy()
  })

  it('uninstalls a non-manifest app through the confirmation dialog', () => {
    const cmds = renderPanel('remote', 'appstore', false)

    fireEvent.click(screen.getByTestId('app-kebab-remote'))
    fireEvent.click(screen.getByTestId('app-uninstall-menuitem'))
    fireEvent.click(screen.getByTestId('app-uninstall-confirm-button'))

    expect(cmds.uninstallApp).toHaveBeenCalledWith('remote')
  })
})

describe('AppListPanel — source chip', () => {
  beforeEach(() => {
    useAppStore.setState({
      apps: {},
      catalog: {},
      catalogSources: {},
      manifestIds: [],
      loadStates: {},
      loadErrors: {},
    })
  })

  // The chip is the only signal that a row runs a pinned URL rather than the
  // manifest version, so it survives the loss of the kebab.
  it('marks a shadowed manifest row as Snapshot', () => {
    renderPanel('hello', 'snapshot', true)

    expect(screen.getByText('Snapshot')).toBeTruthy()
    expect(screen.queryByTestId('app-kebab-hello')).toBeNull()
  })

  it('marks a shadowed manifest row as App Store', () => {
    renderPanel('hello', 'appstore', true)

    expect(screen.getByText('App Store')).toBeTruthy()
  })

  it('leaves a plain manifest row unchipped', () => {
    renderPanel('hello', 'manifest', true)

    expect(screen.queryByText('Snapshot')).toBeNull()
    expect(screen.queryByText('App Store')).toBeNull()
  })
})

// #719: a failed row showed a bare "failed" chip and a Retry button that could
// not work for four of the five causes.
describe('AppListPanel — load failure reasons', () => {
  const renderFailed = (
    id: string,
    failure: AppLoadFailure,
  ): AppManagerCommands => {
    useAppStore.getState().setCatalog([entry(id)], { [id]: 'manifest' }, [id])
    useAppStore.setState({
      apps: {},
      loadStates: { [id]: 'failed' },
      loadErrors: { [id]: failure },
    })
    const cmds = commands()
    render(
      <AppManagerCommandsProvider value={cmds}>
        <AppListPanel />
      </AppManagerCommandsProvider>,
    )
    return cmds
  }

  beforeEach(() => {
    useAppStore.setState({
      apps: {},
      catalog: {},
      catalogSources: {},
      manifestIds: [],
      loadStates: {},
      loadErrors: {},
    })
  })

  it('states both ids and hides Retry for a mis-packaged bundle', () => {
    renderFailed('chrisapp', {
      code: 'id-mismatch',
      url: 'https://apps-stage.cytoscape.org/web/chrisapp/0.2.0/remoteEntry.js',
      expected: 'chrisapp',
      received: 'chrisApp',
    })

    const reason = screen.getByTestId('app-failure-chrisapp').textContent ?? ''
    expect(reason).toContain('"chrisApp"')
    expect(reason).toContain('"chrisapp"')
    expect(reason).toContain('mis-packaged')
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('names the URL and says to reload for a fetch failure', () => {
    renderFailed('missing', {
      code: 'fetch-failed',
      url: 'https://apps-stage.cytoscape.org/web/does-not-exist/remoteEntry.js',
      message: 'HTTP 404',
    })

    const reason = screen.getByTestId('app-failure-missing').textContent ?? ''
    expect(reason).toContain('does-not-exist/remoteEntry.js')
    expect(reason).toContain('HTTP 404')
    expect(reason).toContain('Reload the page')
    // Retry cannot succeed in-tab: the federation runtime memoizes the
    // rejected entry promise for the life of the page.
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('names the rejected origin and hides Retry when the origin is blocked', () => {
    renderFailed('evil', {
      code: 'origin-blocked',
      url: 'https://evil.example.com/remoteEntry.js',
    })

    expect(screen.getByTestId('app-failure-evil').textContent).toContain(
      'https://evil.example.com/remoteEntry.js',
    )
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('hides Retry when the bundle exports no AppConfig', () => {
    renderFailed('noconfig', {
      code: 'no-app-config',
      url: 'https://apps.cytoscape.org/web/noconfig/1.0.0/remoteEntry.js',
    })

    expect(screen.getByTestId('app-failure-noconfig').textContent).toContain(
      'exports no AppConfig',
    )
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('keeps Retry for a failed mount — the one cause it can fix', () => {
    const cmds = renderFailed('breaks', {
      code: 'mount-failed',
      message: 'Cannot read properties of undefined',
    })

    expect(screen.getByTestId('app-failure-breaks').textContent).toContain(
      'Cannot read properties of undefined',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(cmds.retryApp).toHaveBeenCalledWith('breaks')
  })

  it('shows no reason for a row that has not failed', () => {
    renderPanel('hello', 'manifest', true)

    expect(screen.queryByTestId('app-failure-hello')).toBeNull()
  })
})
