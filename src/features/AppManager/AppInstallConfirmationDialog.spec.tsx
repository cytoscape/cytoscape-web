import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AppManagerCommands } from '@/data/hooks/stores/useAppManager'
import type { AppCatalogEntry } from '@/models/AppModel/AppCatalogEntry'
import { AppType } from '@/models/AppModel/AppType'
import type { AppInstallOutcome } from '@/models/AppModel/AppVersionChange'
import type { PendingAppInstall } from '@/models/AppModel/PendingAppInstall'
import { RootMenu } from '@/models/AppModel/RootMenu'
import { ServiceAppAction } from '@/models/AppModel/ServiceAppAction'
import { AppInstallConfirmationDialog } from './AppInstallConfirmationDialog'
import { AppManagerCommandsProvider } from './AppManagerCommandsContext'

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

/**
 * Render the dialog inside the App Manager's commands, as AppShell does.
 *
 * @param installPreview what the App Manager says installing an entry does
 */
const renderDialog = (
  pending: PendingAppInstall[],
  installPreview: (entry: AppCatalogEntry) => AppInstallOutcome = () => ({
    kind: 'new',
  }),
): { onConfirm: () => void; onCancel: () => void } => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const commands = { installPreview } as unknown as AppManagerCommands
  render(
    <AppManagerCommandsProvider value={commands}>
      <AppInstallConfirmationDialog
        pending={pending}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </AppManagerCommandsProvider>,
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
  // apps.json. The user should see what confirming does to it (§7.5), as
  // installApp will do it: the dialog asks the App Manager's installPreview,
  // which decides with the install's own checks.
  describe('an app the catalog already has', () => {
    const noteFor = (outcome: AppInstallOutcome): string | null => {
      renderDialog([REACT_APP], () => outcome)
      return (
        screen.queryByTestId('app-install-version-mcodeweb')?.textContent ??
        null
      )
    }

    it('asks installPreview about the offered entry', () => {
      const installPreview = vi.fn(
        (): AppInstallOutcome => ({ kind: 'same', version: '0.1.0' }),
      )
      renderDialog([REACT_APP], installPreview)

      expect(installPreview).toHaveBeenCalledWith(REACT_APP.entry)
    })

    it('says a newer version updates the installed one', () => {
      expect(noteFor({ kind: 'update', from: '0.0.9', to: '0.1.0' })).toBe(
        'Updates the installed version 0.0.9 to 0.1.0',
      )
    })

    it('says a newer installed version is kept', () => {
      expect(
        noteFor({ kind: 'older', installed: '0.2.0', offered: '0.1.0' }),
      ).toBe('Version 0.2.0 is installed, which is newer; it is kept')
    })

    it('says the same version is already installed', () => {
      expect(noteFor({ kind: 'same', version: '0.1.0' })).toBe(
        'Version 0.1.0 is already installed',
      )
    })

    it('says a working installed version is kept over an offer that cannot run here', () => {
      expect(
        noteFor({
          kind: 'incompatible',
          offered: '0.1.0',
          range: '>=999.0.0',
          kept: '0.0.9',
        }),
      ).toBe(
        'Version 0.1.0 needs Cytoscape Web >=999.0.0; the installed 0.0.9 is kept',
      )
    })

    it('says an installed version that cannot run here is replaced, even with an older one', () => {
      expect(noteFor({ kind: 'update', from: '0.2.0', to: '0.1.0' })).toBe(
        'Replaces the installed version 0.2.0, which cannot run on this Cytoscape Web, with 0.1.0',
      )
    })

    it('adds nothing for an app that is not installed', () => {
      expect(noteFor({ kind: 'new' })).toBeNull()
    })

    it('adds nothing for an app the install will refuse', () => {
      // installApp states the refusal itself when the user confirms.
      expect(noteFor({ kind: 'rejected' })).toBeNull()
    })

    it('asks nothing about a service app', () => {
      const installPreview = vi.fn((): AppInstallOutcome => ({ kind: 'new' }))
      renderDialog([SERVICE_APP], installPreview)

      expect(installPreview).not.toHaveBeenCalled()
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
