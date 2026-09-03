// src/features/ToolBar/AppMenu/AppMenu.spec.tsx
//
// Runtime 'apps-menu' resources are plain data the HOST renders: one
// DropdownMenuItem per entry with the registered label/tooltip/icon, greyed
// out by `requires`/`isEnabled`, and a click that closes the dropdown and
// calls the app's onClick with its per-app API object (dialog included).
// No app component is ever mounted inside the menu.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppResourceStore } from '@/data/hooks/stores/AppResourceStore'
import { useAppStore } from '@/data/hooks/stores/AppStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { AppStatus } from '@/models/AppModel/AppStatus'
import type { RegisteredAppResource } from '@/models/AppModel/RegisteredAppResource'
import { AppMenu } from './index'

vi.mock('@/data/hooks/stores/AppStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useAppStore: create(() => ({
      apps: {} as Record<string, { status: AppStatus }>,
      serviceApps: {},
    })),
  }
})

// The manifest-driven legacy path and the app registry are out of scope
// here; the registry import would otherwise pull in the whole app manager.
vi.mock('../../../data/hooks/stores/useAppManager', () => ({
  appRegistry: new Map(),
}))
vi.mock('../../AppManager/AppSettingsDialog', () => ({
  AppSettingsDialog: () => null,
}))
vi.mock('./useServiceAppMenu', () => ({
  useServiceAppMenu: () => ({
    menuItems: [],
    dialogs: null,
    handleRun: vi.fn(),
  }),
}))

const logError = vi.fn()
vi.mock('../../../debug', () => ({
  logApp: {
    info: vi.fn(),
    warn: vi.fn(),
    error: (...args: unknown[]) => logError(...args),
  },
}))

function seedMenuItem(
  overrides: Partial<RegisteredAppResource> & { id: string },
  { active = true }: { active?: boolean } = {},
): void {
  const resource: RegisteredAppResource = {
    appId: 'app1',
    slot: 'apps-menu',
    title: 'Analyze Network',
    onClick: vi.fn(),
    ...overrides,
  }
  useAppResourceStore.setState({
    resources: [...useAppResourceStore.getState().resources, resource],
  })
  useAppStore.setState({
    apps: {
      ...(useAppStore.getState() as any).apps,
      [resource.appId]: {
        status: active ? AppStatus.Active : AppStatus.Inactive,
      },
    },
  } as any)
}

const openMenu = (): void => {
  fireEvent.click(screen.getByTestId('toolbar-apps-menu-menu-button'))
}

describe('AppMenu runtime resources', () => {
  beforeEach(() => {
    logError.mockClear()
    useAppResourceStore.setState({ resources: [] })
    useAppStore.setState({ apps: {} } as any)
    useWorkspaceStore.setState((state) => ({
      workspace: { ...state.workspace, currentNetworkId: 'net1' },
    }))
  })

  it('renders a registered item as a host row with its label and tooltip', () => {
    seedMenuItem({ id: 'action', tooltip: 'Runs the analysis' })
    render(<AppMenu />)
    openMenu()

    const row = screen.getByTestId('apps-menu-item-app1-action')
    expect(row.textContent).toBe('Analyze Network')
    // MUI Tooltip exposes a string title as aria-label on its child (the
    // wrapping span) until it is shown.
    expect(row.parentElement?.getAttribute('aria-label')).toBe(
      'Runs the analysis',
    )
    expect(row.getAttribute('aria-disabled')).toBeNull()
  })

  it('renders a raster icon URI unchanged as an <img>', () => {
    const icon = 'data:image/png;base64,iVBORw0KGgo='
    seedMenuItem({ id: 'action', icon })
    render(<AppMenu />)
    openMenu()

    const img = screen.getByTestId('apps-menu-item-icon')
    expect(img.tagName).toBe('IMG')
    expect(img.getAttribute('src')).toBe(icon)
  })

  it('renders an SVG icon URI as a host-tinted mask, not an <img>', () => {
    const icon = 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E'
    seedMenuItem({ id: 'action', icon })
    render(<AppMenu />)
    openMenu()

    const row = screen.getByTestId('apps-menu-item-app1-action')
    expect(row.querySelector('img')).toBeNull()
    const iconEl = screen.getByTestId('apps-menu-item-icon')
    expect(row.contains(iconEl)).toBe(true)
    // jsdom's cssstyle drops `mask-image`, so read the rule Emotion emitted
    // for the icon's class instead of the computed style.
    const css = Array.from(document.querySelectorAll('style'))
      .map((el) => el.textContent ?? '')
      .join('\n')
    expect(css).toContain(`mask-image:url("${icon}")`)
    expect(css).toContain('background-color:currentColor')
  })

  it('renders no icon element when the entry has no icon', () => {
    seedMenuItem({ id: 'action' })
    render(<AppMenu />)
    openMenu()

    expect(screen.queryByTestId('apps-menu-item-icon')).toBeNull()
  })

  it('closes the dropdown and calls onClick with the per-app API object', async () => {
    const onClick = vi.fn()
    seedMenuItem({ id: 'action', onClick })
    render(<AppMenu />)
    openMenu()

    fireEvent.click(screen.getByTestId('apps-menu-item-app1-action'))

    expect(onClick).toHaveBeenCalledTimes(1)
    const apis = onClick.mock.calls[0][0]
    expect(typeof apis.dialog.open).toBe('function')
    expect(typeof apis.resource.openModal).toBe('function')
    expect(typeof apis.workspace.getCurrentNetworkId).toBe('function')
    // The Popover unmounts its rows once its (zero-length) exit transition
    // settles, a tick after the close.
    await waitFor(() => {
      expect(screen.queryByTestId('apps-menu-item-app1-action')).toBeNull()
    })
    expect(
      screen
        .getByTestId('toolbar-apps-menu-menu-button')
        .getAttribute('aria-expanded'),
    ).toBeNull()
  })

  it('logs and survives an onClick that throws', () => {
    seedMenuItem({
      id: 'action',
      onClick: () => {
        throw new Error('boom')
      },
    })
    render(<AppMenu />)
    openMenu()

    fireEvent.click(screen.getByTestId('apps-menu-item-app1-action'))

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('onClick threw for app1::apps-menu::action'),
      expect.any(Error),
    )
  })

  it('logs a rejected onClick promise without blocking the UI', async () => {
    seedMenuItem({
      id: 'action',
      onClick: () => Promise.reject(new Error('later')),
    })
    render(<AppMenu />)
    openMenu()

    fireEvent.click(screen.getByTestId('apps-menu-item-app1-action'))
    await act(async () => {
      await Promise.resolve()
    })

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('onClick failed for app1::apps-menu::action'),
      expect.any(Error),
    )
  })

  it('greys the item out when isEnabled returns false and does not fire onClick', () => {
    const onClick = vi.fn()
    seedMenuItem({ id: 'action', onClick, isEnabled: () => false })
    render(<AppMenu />)
    openMenu()

    const row = screen.getByTestId('apps-menu-item-app1-action')
    expect(row.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(row)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('treats a throwing isEnabled as disabled and logs it', () => {
    seedMenuItem({
      id: 'action',
      isEnabled: () => {
        throw new Error('nope')
      },
    })
    render(<AppMenu />)
    openMenu()

    expect(
      screen
        .getByTestId('apps-menu-item-app1-action')
        .getAttribute('aria-disabled'),
    ).toBe('true')
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('isEnabled() threw'),
      expect.any(Error),
    )
  })

  it('greys the item out when requires.network is set and no network is loaded', () => {
    useWorkspaceStore.setState((state) => ({
      workspace: { ...state.workspace, currentNetworkId: '' },
    }))
    seedMenuItem({ id: 'action', requires: { network: true } })
    render(<AppMenu />)
    openMenu()

    expect(
      screen
        .getByTestId('apps-menu-item-app1-action')
        .getAttribute('aria-disabled'),
    ).toBe('true')
  })

  it('re-evaluates isEnabled each time the dropdown opens', () => {
    let enabled = false
    seedMenuItem({ id: 'action', isEnabled: () => enabled })
    render(<AppMenu />)

    openMenu()
    expect(
      screen
        .getByTestId('apps-menu-item-app1-action')
        .getAttribute('aria-disabled'),
    ).toBe('true')
    // Close, flip the app-side condition, reopen.
    fireEvent.click(screen.getByTestId('toolbar-apps-menu-menu-button'))
    enabled = true
    openMenu()

    expect(
      screen
        .getByTestId('apps-menu-item-app1-action')
        .getAttribute('aria-disabled'),
    ).toBeNull()
  })

  it('omits items from inactive apps', () => {
    seedMenuItem({ id: 'action' }, { active: false })
    render(<AppMenu />)
    openMenu()

    expect(screen.queryByTestId('apps-menu-item-app1-action')).toBeNull()
  })
})
