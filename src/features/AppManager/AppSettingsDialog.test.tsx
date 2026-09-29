import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement, type ReactNode, useState } from 'react'
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

const renderDialog = (): { reopen: () => void } => {
  const config = { ...defaultAppConfig, allowsLocalhostAppsOn: DEV1 }
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      AppConfigContext.Provider,
      { value: config },
      createElement(AppManagerCommandsProvider, { value: commands }, children),
    )
  // Stateful, like the App menu: the dialog's own Close button closes it.
  let setOpen: (open: boolean) => void = () => {}
  const Host = () => {
    const [open, setOpenState] = useState(true)
    setOpen = setOpenState
    return createElement(AppSettingsDialog, {
      openDialog: open,
      setOpenDialog: setOpenState,
    })
  }
  render(createElement(Host), { wrapper })
  return { reopen: () => act(() => setOpen(true)) }
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

    // The field lives in the collapsed advanced section, so it is not in the
    // DOM until this is expanded.
    fireEvent.click(screen.getByTestId('app-settings-advanced-button'))

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

// Issue #703: the manifest editor is a developer tool, so it hides behind the
// footer's Advanced button and carries a warning when revealed.
describe('AppSettingsDialog — advanced section', () => {
  it('keeps the Manifest Source controls hidden until Advanced is opened', async () => {
    renderDialog()

    expect(screen.queryByLabelText('Custom manifest URL')).toBeNull()
    expect(screen.queryByText('Manifest Source')).toBeNull()

    const advanced = screen.getByTestId('app-settings-advanced-button')
    expect(advanced.textContent).toMatch(/^advanced$/i)
    fireEvent.click(advanced)

    expect(screen.queryByLabelText('Custom manifest URL')).not.toBeNull()
    expect(screen.queryByText('Manifest Source')).not.toBeNull()
    expect(
      screen.queryByText(/for developers and advanced users only/i),
    ).not.toBeNull()
    expect(advanced.textContent).toMatch(/^hide advanced$/i)

    fireEvent.click(advanced)
    await waitFor(() =>
      expect(screen.queryByLabelText('Custom manifest URL')).toBeNull(),
    )
    expect(advanced.textContent).toMatch(/^advanced$/i)
  })
})

// The App menu keeps this dialog mounted and only toggles `openDialog`, so
// everything typed or chosen used to survive Close and reappear on reopen.
describe('AppSettingsDialog — reopening', () => {
  const selectedTab = (): string | null =>
    screen
      .getAllByRole('tab')
      .find((tab) => tab.getAttribute('aria-selected') === 'true')
      ?.textContent ?? null

  it('starts every open on the Apps tab with empty fields', async () => {
    const { reopen } = renderDialog()

    fireEvent.change(screen.getByTestId('install-from-url-input'), {
      target: { value: 'https://example.org/app.json' },
    })
    fireEvent.click(screen.getByTestId('app-settings-advanced-button'))
    fireEvent.change(screen.getByLabelText('Custom manifest URL'), {
      target: { value: 'https://example.org/manifest.json' },
    })
    // The service URL field lives in ServiceListPanel, which mounts only on
    // this tab: starting on Apps is what resets it.
    fireEvent.click(screen.getByRole('tab', { name: 'Service Apps' }))
    expect(selectedTab()).toBe('Service Apps')

    fireEvent.click(screen.getByTestId('app-settings-dialog-close-button'))
    await waitFor(() =>
      expect(screen.queryByTestId('app-settings-dialog')).toBeNull(),
    )
    reopen()

    expect(selectedTab()).toBe('Apps')
    expect(
      (screen.getByTestId('install-from-url-input') as HTMLInputElement).value,
    ).toBe('')
    expect(screen.queryByLabelText('Custom manifest URL')).toBeNull()
    fireEvent.click(screen.getByTestId('app-settings-advanced-button'))
    expect(
      (screen.getByLabelText('Custom manifest URL') as HTMLInputElement).value,
    ).toBe('')
  })
})
