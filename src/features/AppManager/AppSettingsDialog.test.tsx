import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppConfigContext, defaultAppConfig } from '../../AppConfigContext'

import { AppManagerCommandsProvider } from './AppManagerCommandsContext'

// The two gates are exercised directly in installGate.test.ts. What is untested
// without this file is the wiring: whether the dialog hands them this
// deployment's opt-in, or leaves it undefined so dev1 can never work.
vi.mock('./install/installGate', () => ({
  isAllowedOrigin: vi.fn(() => true),
  validateManifestUrl: vi.fn(() => undefined),
  isHostCompatible: vi.fn(() => true),
  parseSingleEntryManifest: vi.fn(() => ({
    id: 'devapp',
    name: 'Dev App',
    url: 'http://localhost:6000/remoteEntry.js',
    version: '1.0.0',
    author: 'A developer',
  })),
}))

// Heavy children with their own store subscriptions; irrelevant to the wiring.
vi.mock('./AppListPanel', () => ({ AppListPanel: () => null }))
vi.mock('./ServiceListPanel', () => ({ ServiceListPanel: () => null }))

const { AppSettingsDialog } = await import('./AppSettingsDialog')
const { isAllowedOrigin, validateManifestUrl } = await import(
  './install/installGate'
)

const DEV1 = 'https://dev1.ndexbio.org'

const installApp = vi.fn(async () => undefined)

const commands = {
  installApp,
  uninstallApp: vi.fn(async () => undefined),
  activateApp: vi.fn(async () => undefined),
  deactivateApp: vi.fn(async () => undefined),
  setManifestSource: vi.fn(),
  refreshCatalog: vi.fn(async () => undefined),
} as unknown as Parameters<typeof AppManagerCommandsProvider>[0]['value']

const renderDialog = (): void => {
  const config = { ...defaultAppConfig, allowsLocalhostAppsOn: DEV1 }
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      AppConfigContext.Provider,
      { value: config },
      createElement(AppManagerCommandsProvider, { value: commands }, children),
    )
  render(
    createElement(AppSettingsDialog, {
      openDialog: true,
      setOpenDialog: vi.fn(),
    }),
    { wrapper },
  )
}

describe('AppSettingsDialog — localhost opt-in wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [{}] })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passes the opt-in to the origin gate when installing from a URL', async () => {
    renderDialog()

    fireEvent.change(screen.getByTestId('install-from-url-input'), {
      target: { value: 'http://localhost:6000/cyweb-app.json' },
    })
    fireEvent.click(screen.getByTestId('install-from-url-button'))

    await waitFor(() =>
      expect(isAllowedOrigin).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        DEV1,
      ),
    )
  })

  // Pasting the remoteEntry.js URL where the manifest URL belongs is the
  // common mistake, and it used to surface a raw SyntaxError (#719).
  it('names the mistake when the URL returns something other than JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0')
        },
      })),
    )
    renderDialog()

    fireEvent.change(screen.getByTestId('install-from-url-input'), {
      target: { value: 'http://localhost:6000/remoteEntry.js' },
    })
    fireEvent.click(screen.getByTestId('install-from-url-button'))

    expect(
      await screen.findByText(
        'That URL did not return JSON. Enter the app manifest URL, not the remoteEntry.js URL.',
      ),
    ).toBeTruthy()
    expect(installApp).not.toHaveBeenCalled()
  })

  // The Manifest Source field is a protocol check with its own localhost test,
  // and without the opt-in a developer on dev1 cannot even type an http://
  // localhost manifest URL — so this wiring gates the whole flow.
  it('passes the opt-in to the manifest URL check', async () => {
    renderDialog()

    // The field lives in a collapsed accordion, so it is out of the
    // accessibility tree until this is expanded.
    fireEvent.click(screen.getByText('Manifest Source'))

    fireEvent.change(screen.getByLabelText('Custom manifest URL'), {
      target: { value: 'http://localhost:6000/cyweb-app.json' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }))

    await waitFor(() =>
      expect(validateManifestUrl).toHaveBeenCalledWith(
        expect.any(String),
        DEV1,
      ),
    )
  })
})
