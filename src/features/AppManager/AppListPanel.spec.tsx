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

  // Review of the core-apps change: a core app that fails is retried at every
  // start and cannot be uninstalled, so its row must keep a way to turn it
  // off, whatever the cause.
  describe('turning off a failed app', () => {
    const renderFailedAs = (
      status: AppStatus | undefined,
      failure: AppLoadFailure,
    ): AppManagerCommands => {
      useAppStore
        .getState()
        .setCatalog([entry('broken')], { broken: 'manifest' }, ['broken'])
      useAppStore.setState({
        apps:
          status === undefined
            ? {}
            : {
                broken: { id: 'broken', name: 'broken app', status } as any,
              },
        loadStates: { broken: 'failed' },
        loadErrors: { broken: failure },
      })
      const cmds = commands()
      render(
        <AppManagerCommandsProvider value={cmds}>
          <AppListPanel />
        </AppManagerCommandsProvider>,
      )
      return cmds
    }
    const fetchFailed: AppLoadFailure = {
      code: 'fetch-failed',
      url: 'https://apps.cytoscape.org/web/broken/1.0.0/remoteEntry.js',
      message: 'HTTP 404',
    }

    it('shows the switch on for an app that failed while on, and turns it off', () => {
      const cmds = renderFailedAs(AppStatus.Error, fetchFailed)

      const toggle = screen.getByTestId('app-toggle-broken')
      expect(toggle.querySelector('input')?.checked).toBe(true)
      fireEvent.click(toggle.querySelector('input') as HTMLInputElement)
      expect(cmds.deactivateApp).toHaveBeenCalledWith('broken')
    })

    it('keeps the switch beside Retry for a failed mount', () => {
      renderFailedAs(AppStatus.Error, { code: 'mount-failed', message: 'x' })

      expect(screen.getByTestId('app-toggle-broken')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
    })

    it('shows the switch off for an app whose first activation failed', () => {
      const cmds = renderFailedAs(undefined, fetchFailed)

      const input = screen
        .getByTestId('app-toggle-broken')
        .querySelector('input') as HTMLInputElement
      expect(input.checked).toBe(false)
      fireEvent.click(input)
      expect(cmds.activateApp).toHaveBeenCalledWith('broken')
    })

    // Review: only startup and activation recorded `incompatible-host`, so an
    // incompatible app installed off (or with an inactive record) kept an
    // enable switch and no reason, also after a reload. The row now derives it
    // from the entry. Unit tests run as host 1.1.1 (vite.config.ts).
    it('explains and offers no switch for an incompatible app that never loaded', () => {
      useAppStore
        .getState()
        .setCatalog(
          [{ ...entry('future'), compatibleHostVersions: '>=999.0.0' }],
          { future: 'appstore' },
          [],
        )
      useAppStore.setState({
        apps: {
          future: {
            id: 'future',
            name: 'future app',
            status: AppStatus.Inactive,
          } as any,
        },
        loadStates: {},
        loadErrors: {},
      })
      render(
        <AppManagerCommandsProvider value={commands()}>
          <AppListPanel />
        </AppManagerCommandsProvider>,
      )

      expect(screen.queryByTestId('app-toggle-future')).toBeNull()
      expect(screen.getByTestId('app-failure-future').textContent).toBe(
        'Needs Cytoscape Web >=999.0.0; this is 1.1.1. It stays off until a version that supports this Cytoscape Web is available.',
      )
    })

    // Review: Refresh can bring a version this host cannot run while an older,
    // compatible one keeps running. The row went by the new entry and hid the
    // switch, and a core app cannot be uninstalled.
    it('keeps the switch for the version still running after a refresh', () => {
      useAppStore
        .getState()
        .setCatalog(
          [{ ...entry('future'), compatibleHostVersions: '>=999.0.0' }],
          { future: 'manifest' },
          ['future'],
        )
      useAppStore.setState({
        apps: {
          future: {
            id: 'future',
            name: 'future app',
            status: AppStatus.Active,
          } as any,
        },
        loadStates: { future: 'loaded' },
        loadErrors: {},
      })
      const cmds = commands()
      render(
        <AppManagerCommandsProvider value={cmds}>
          <AppListPanel />
        </AppManagerCommandsProvider>,
      )

      const input = screen
        .getByTestId('app-toggle-future')
        .querySelector('input') as HTMLInputElement
      expect(input.checked).toBe(true)
      expect(screen.queryByTestId('app-failure-future')).toBeNull()
      fireEvent.click(input)
      expect(cmds.deactivateApp).toHaveBeenCalledWith('future')
    })

    it('offers the switch again once a refresh brings a compatible version', () => {
      useAppStore
        .getState()
        .setCatalog(
          [{ ...entry('fixed'), compatibleHostVersions: '>=999.0.0' }],
          { fixed: 'manifest' },
          ['fixed'],
        )
      useAppStore.getState().setLoadFailed('fixed', {
        code: 'incompatible-host',
        range: '>=999.0.0',
        hostVersion: '1.1.1',
      })
      useAppStore.setState({ apps: {} })

      // The refreshed catalog's entry runs here.
      useAppStore
        .getState()
        .setCatalog([entry('fixed')], { fixed: 'manifest' }, ['fixed'])
      render(
        <AppManagerCommandsProvider value={commands()}>
          <AppListPanel />
        </AppManagerCommandsProvider>,
      )

      expect(screen.getByTestId('app-toggle-fixed')).toBeTruthy()
      expect(screen.queryByTestId('app-failure-fixed')).toBeNull()
    })

    it('offers no switch for an app this host cannot run', () => {
      renderFailedAs(AppStatus.Inactive, {
        code: 'incompatible-host',
        range: '>=999.0.0',
        hostVersion: '1.1.1',
      })

      expect(screen.queryByTestId('app-toggle-broken')).toBeNull()
      expect(screen.getByTestId('app-failure-broken').textContent).toContain(
        'Needs Cytoscape Web >=999.0.0',
      )
    })
  })

  it('shows no reason for a row that has not failed', () => {
    renderPanel('hello', 'manifest', true)

    expect(screen.queryByTestId('app-failure-hello')).toBeNull()
  })

  // Four of the five codes leave the row with no control, so a refreshed
  // manifest that corrects the bundle URL has to retire the failure — or the
  // row stays dead for the rest of the session.
  it('restores the control when a refreshed manifest changes the URL', () => {
    useAppStore
      .getState()
      .setCatalog([entry('chrisapp')], undefined, ['chrisapp'])
    useAppStore.setState({
      apps: {},
      loadStates: { chrisapp: 'failed' },
      loadErrors: {
        chrisapp: {
          code: 'id-mismatch',
          url: entry('chrisapp').url,
          expected: 'chrisapp',
          received: 'chrisApp',
        },
      },
    })

    useAppStore.getState().setCatalog(
      [
        {
          ...entry('chrisapp'),
          url: 'https://apps.cytoscape.org/web/chrisapp/0.3.0/remoteEntry.js',
        },
      ],
      undefined,
      ['chrisapp'],
    )

    render(
      <AppManagerCommandsProvider value={commands()}>
        <AppListPanel />
      </AppManagerCommandsProvider>,
    )

    expect(screen.queryByTestId('app-failure-chrisapp')).toBeNull()
    expect(screen.getByTestId('app-toggle-chrisapp')).toBeTruthy()
  })
})
