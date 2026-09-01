// src/features/AppManager/ModalLauncherHost.spec.tsx
//
// Host renderer behavior: nothing without open entries, one CyDialog per
// open modal with the registered component and injected requestClose, the
// structural host Close "X", stale-entry and inactive-app filtering,
// maxWidth/fullWidth forwarding, error isolation, and lazy components.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { lazy } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModalHostProps } from '@/app-api/types/AppResourceTypes'
import { useAppResourceStore } from '@/data/hooks/stores/AppResourceStore'
import { useAppStore } from '@/data/hooks/stores/AppStore'
import { useModalLauncherStore } from '@/data/hooks/stores/ModalLauncherStore'
import { AppStatus } from '@/models/AppModel/AppStatus'
import type { RegisteredAppResource } from '@/models/AppModel/RegisteredAppResource'
import { ModalLauncherHost } from './ModalLauncherHost'

vi.mock('@/data/hooks/stores/AppStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useAppStore: create(() => ({
      apps: {} as Record<string, { status: AppStatus }>,
    })),
  }
})

function seedModal(
  overrides: Partial<RegisteredAppResource> & { id: string },
  { active = true }: { active?: boolean } = {},
): void {
  const resource: RegisteredAppResource = {
    appId: 'app1',
    slot: 'modal-launcher',
    component: ({ requestClose }: ModalHostProps) => (
      <div data-testid="modal-content">
        <button data-testid="modal-cancel" onClick={requestClose}>
          Cancel
        </button>
      </div>
    ),
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

function openModal(appId: string, id: string): void {
  useModalLauncherStore.getState().openModal(appId, id)
}

describe('ModalLauncherHost', () => {
  beforeEach(() => {
    useAppResourceStore.setState({ resources: [] })
    useModalLauncherStore.setState({ openModals: [] })
    useAppStore.setState({ apps: {} } as any)
  })

  it('renders nothing when no modal is open', () => {
    seedModal({ id: 'D1' })
    render(<ModalLauncherHost />)
    expect(screen.queryByTestId('modal-launcher-dialog-app1-D1')).toBeNull()
  })

  it('renders an open modal with its registered component', () => {
    seedModal({ id: 'D1' })
    openModal('app1', 'D1')
    render(<ModalLauncherHost />)

    expect(screen.getByTestId('modal-launcher-dialog-app1-D1')).toBeDefined()
    expect(screen.getByTestId('modal-content')).toBeDefined()
  })

  it('closes the modal through the injected requestClose', () => {
    seedModal({ id: 'D1' })
    openModal('app1', 'D1')
    render(<ModalLauncherHost />)

    fireEvent.click(screen.getByTestId('modal-cancel'))

    expect(useModalLauncherStore.getState().openModals).toHaveLength(0)
    expect(screen.queryByTestId('modal-launcher-dialog-app1-D1')).toBeNull()
  })

  it('closes the modal through the host Close "X"', () => {
    seedModal({ id: 'D1' })
    openModal('app1', 'D1')
    render(<ModalLauncherHost />)

    fireEvent.click(screen.getByTestId('modal-launcher-close-button'))

    expect(useModalLauncherStore.getState().openModals).toHaveLength(0)
    expect(screen.queryByTestId('modal-launcher-dialog-app1-D1')).toBeNull()
  })

  it('does not render a modal whose app is inactive', () => {
    seedModal({ id: 'D1' }, { active: false })
    openModal('app1', 'D1')
    render(<ModalLauncherHost />)

    expect(screen.queryByTestId('modal-launcher-dialog-app1-D1')).toBeNull()
  })

  it('does not render a stale open entry with no matching resource', () => {
    // No registration at all — e.g. unregistered while open.
    openModal('app1', 'ghost')
    render(<ModalLauncherHost />)

    expect(screen.queryByTestId('modal-launcher-dialog-app1-ghost')).toBeNull()
  })

  it('renders multiple open modals at once', () => {
    seedModal({ id: 'D1' })
    seedModal({ id: 'D2', appId: 'app2' })
    openModal('app1', 'D1')
    openModal('app2', 'D2')
    render(<ModalLauncherHost />)

    expect(screen.getByTestId('modal-launcher-dialog-app1-D1')).toBeDefined()
    expect(screen.getByTestId('modal-launcher-dialog-app2-D2')).toBeDefined()
  })

  it('applies maxWidth and fullWidth to the dialog paper', () => {
    seedModal({ id: 'D1', maxWidth: 'md', fullWidth: true })
    openModal('app1', 'D1')
    render(<ModalLauncherHost />)

    const paper = screen
      .getByTestId('modal-launcher-dialog-app1-D1')
      .querySelector('.MuiDialog-paper')
    expect(paper?.className).toContain('MuiDialog-paperWidthMd')
    expect(paper?.className).toContain('MuiDialog-paperFullWidth')
  })

  it('defaults to maxWidth "sm" when unspecified', () => {
    seedModal({ id: 'D1' })
    openModal('app1', 'D1')
    render(<ModalLauncherHost />)

    const paper = screen
      .getByTestId('modal-launcher-dialog-app1-D1')
      .querySelector('.MuiDialog-paper')
    expect(paper?.className).toContain('MuiDialog-paperWidthSm')
  })

  it('isolates a crashing component behind the plugin fallback, X still exits', () => {
    const Bomb = (): JSX.Element => {
      throw new Error('boom')
    }
    // Silence the error-boundary noise for this case: React logs through
    // console.error, and jsdom additionally reports the throw as an
    // uncaught window 'error' event unless it is defaultPrevented.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const swallow = (e: Event): void => e.preventDefault()
    window.addEventListener('error', swallow)
    try {
      seedModal({ id: 'D1', component: Bomb })
      openModal('app1', 'D1')
      render(<ModalLauncherHost />)

      expect(screen.getByRole('alert')).toBeDefined()

      fireEvent.click(screen.getByTestId('modal-launcher-close-button'))
      expect(useModalLauncherStore.getState().openModals).toHaveLength(0)
    } finally {
      window.removeEventListener('error', swallow)
      errorSpy.mockRestore()
    }
  })

  it('resolves a React.lazy component under the Suspense fallback', async () => {
    const LazyContent = lazy(() =>
      Promise.resolve({
        default: () => <div data-testid="lazy-modal-content">Loaded</div>,
      }),
    )
    seedModal({ id: 'D1', component: LazyContent })
    openModal('app1', 'D1')
    render(<ModalLauncherHost />)

    await waitFor(() => {
      expect(screen.getByTestId('lazy-modal-content')).toBeDefined()
    })
  })
})
