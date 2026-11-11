import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/data/hooks/stores/AppStore'
import { AppType } from '@/models/AppModel/AppType'
import type { PendingAppInstall } from '@/models/AppModel/PendingAppInstall'
import { RootMenu } from '@/models/AppModel/RootMenu'
import { ServiceAppAction } from '@/models/AppModel/ServiceAppAction'
import { AppInstallConfirmationDialog } from './AppInstallConfirmationDialog'

const REACT_APP: PendingAppInstall = {
  type: AppType.Client,
  url: 'https://apps-stage.cytoscape.org/web/mcodeweb/manifest.json',
  entry: {
    id: 'mcodeweb',
    name: 'MCODE Web',
    version: '0.1.0',
    url: 'https://apps-stage.cytoscape.org/web/mcodeweb/0.1.0/remoteEntry.js',
    author: 'Bader Lab, University of Toronto',
  },
}

const SERVICE_APP: PendingAppInstall = {
  type: AppType.Service,
  url: 'https://svc.example.com/updatetables',
  metadata: {
    name: 'Update tables example',
    version: '0.9.0',
    description: "Adds a new column, named 'test_col' by default.",
    // Endpoints really do send null here — ServiceMetadata allows it.
    author: null,
    citation: null,
    cyWebActions: [ServiceAppAction.UpdateTables],
    cyWebMenuItem: { root: RootMenu.Tools, path: [] },
    parameters: [],
  },
}

const renderDialog = (
  pending: PendingAppInstall[],
): { onConfirm: () => void; onCancel: () => void } => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <AppInstallConfirmationDialog
      pending={pending}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  )
  return { onConfirm, onCancel }
}

describe('AppInstallConfirmationDialog', () => {
  it('names both app kinds and labels which is which', () => {
    // The point of the dialog: the user must be able to tell a React app from a
    // service app, since one parameter now installs either.
    renderDialog([REACT_APP, SERVICE_APP])

    expect(screen.getByText('MCODE Web')).toBeTruthy()
    expect(screen.getByText('App')).toBeTruthy()
    expect(screen.getByText(/v0\.1\.0.*Bader Lab/)).toBeTruthy()

    expect(screen.getByText('Update tables example')).toBeTruthy()
    expect(screen.getByText('Service')).toBeTruthy()
    expect(screen.getByText(/Adds a new column/)).toBeTruthy()
  })

  it('shows the source URL of every app', () => {
    // Origin is the only trust signal for a service app, so it must be visible.
    renderDialog([REACT_APP, SERVICE_APP])

    expect(screen.getByText(REACT_APP.url)).toBeTruthy()
    expect(screen.getByText(SERVICE_APP.url)).toBeTruthy()
  })

  it('tolerates an app that declares no version or author', () => {
    renderDialog([
      {
        type: AppType.Service,
        url: 'https://svc.example.com/bare',
        metadata: { name: 'Bare service' } as never,
      },
    ])

    expect(screen.getByText('Bare service')).toBeTruthy()
  })

  it('stays closed when nothing is pending', () => {
    renderDialog([])

    expect(screen.queryByTestId('app-install-confirmation-dialog')).toBeNull()
  })

  // The link may offer an app the catalog already has, often a core app from
  // apps.json. The user should see what confirming does to it (§7.5).
  describe('an app the catalog already has', () => {
    const installedAt = (version: string): void => {
      useAppStore.getState().setCatalog([
        {
          ...REACT_APP.entry,
          version,
          url: `https://apps-stage.cytoscape.org/web/mcodeweb/${version}/remoteEntry.js`,
        },
      ])
    }

    afterEach(() => {
      useAppStore.getState().setCatalog([])
    })

    it('says a newer version updates the installed one', () => {
      installedAt('0.0.9')
      renderDialog([REACT_APP])

      expect(
        screen.getByTestId('app-install-version-mcodeweb').textContent,
      ).toBe('Updates the installed version 0.0.9 to 0.1.0')
    })

    it('says a newer installed version is kept', () => {
      installedAt('0.2.0')
      renderDialog([REACT_APP])

      expect(
        screen.getByTestId('app-install-version-mcodeweb').textContent,
      ).toBe('Version 0.2.0 is installed, which is newer; it is kept')
    })

    it('says the same version is already installed', () => {
      installedAt('0.1.0')
      renderDialog([REACT_APP])

      expect(
        screen.getByTestId('app-install-version-mcodeweb').textContent,
      ).toBe('Version 0.1.0 is already installed')
    })

    // Review: the dialog decided without the host compatibility check that
    // installApp applies, so it could promise the opposite of the install.
    // Unit tests run as host 1.1.1 (REACT_APP_VERSION from vite.config.ts).
    describe('with versions this Cytoscape Web cannot run', () => {
      const FUTURE_HOST = '>=999.0.0'

      it('keeps a working installed version over an offer that cannot run here', () => {
        installedAt('0.0.9')
        renderDialog([
          {
            ...REACT_APP,
            entry: { ...REACT_APP.entry, compatibleHostVersions: FUTURE_HOST },
          },
        ])

        expect(
          screen.getByTestId('app-install-version-mcodeweb').textContent,
        ).toBe(
          'Version 0.1.0 needs Cytoscape Web >=999.0.0; the installed 0.0.9 is kept',
        )
      })

      it('replaces an installed version that cannot run here, even with an older one', () => {
        useAppStore.getState().setCatalog([
          {
            ...REACT_APP.entry,
            version: '0.2.0',
            url: 'https://apps-stage.cytoscape.org/web/mcodeweb/0.2.0/remoteEntry.js',
            compatibleHostVersions: FUTURE_HOST,
          },
        ])
        renderDialog([REACT_APP])

        expect(
          screen.getByTestId('app-install-version-mcodeweb').textContent,
        ).toBe(
          'Replaces the installed version 0.2.0, which cannot run on this Cytoscape Web, with 0.1.0',
        )
      })
    })

    it('adds nothing for an app that is not installed', () => {
      renderDialog([REACT_APP])

      expect(screen.queryByTestId('app-install-version-mcodeweb')).toBeNull()
    })
  })

  it('reports confirm and cancel separately', () => {
    const { onConfirm, onCancel } = renderDialog([REACT_APP])

    fireEvent.click(
      screen.getByTestId('app-install-confirmation-dialog-confirm'),
    )
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByTestId('app-install-confirmation-dialog-cancel'),
    )
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
