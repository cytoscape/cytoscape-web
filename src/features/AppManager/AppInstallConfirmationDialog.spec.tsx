import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppType } from '@/models/AppModel/AppType'
import type { PendingAppInstall } from '@/models/AppModel/PendingAppInstall'
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
    // Endpoints really do send null here.
    author: null as unknown as string,
    citation: null as unknown as string,
    cyWebActions: ['updateTables'],
    cyWebMenuItem: { root: 'Tools', path: [] } as never,
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
