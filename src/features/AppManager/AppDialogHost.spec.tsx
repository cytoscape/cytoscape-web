// src/features/AppManager/AppDialogHost.spec.tsx
//
// Host renderer for apis.dialog.open(): nothing without open entries, one
// CyDialog per dialog with the host title bar and the app-supplied body,
// a working `close` prop, the structural host Close "X", inactive-app
// filtering, maxWidth/fullWidth forwarding, error isolation, lazy bodies,
// and the app context the body can read.
//
// Renders against the real AppDialogStore (reset between tests) so these
// exercise the actual open -> render -> close wiring. No jest-dom here —
// presence is asserted through getBy*/queryBy* directly.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { lazy } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppContext } from '@/app-api/AppIdContext'
import type { DialogRenderProps } from '@/app-api/types/AppDialogTypes'
import { useAppDialogStore } from '@/data/hooks/stores/AppDialogStore'
import { useAppStore } from '@/data/hooks/stores/AppStore'
import { AppStatus } from '@/models/AppModel/AppStatus'
import type { RegisteredAppDialog } from '@/models/AppModel/RegisteredAppDialog'
import { AppDialogHost } from './AppDialogHost'

vi.mock('@/data/hooks/stores/AppStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useAppStore: create(() => ({
      apps: {} as Record<string, { status: AppStatus }>,
    })),
  }
})

function openDialog(
  overrides: Partial<RegisteredAppDialog> & { id: string },
  { active = true }: { active?: boolean } = {},
): void {
  const dialog: RegisteredAppDialog = {
    appId: 'app1',
    title: 'A Dialog',
    render: ({ close }: DialogRenderProps) => (
      <div data-testid="dialog-body">
        <button data-testid="dialog-done" onClick={close}>
          Done
        </button>
      </div>
    ),
    ...overrides,
  }
  useAppDialogStore.getState().openDialog(dialog)
  useAppStore.setState({
    apps: {
      ...(useAppStore.getState() as any).apps,
      [dialog.appId]: {
        status: active ? AppStatus.Active : AppStatus.Inactive,
      },
    },
  } as any)
}

describe('AppDialogHost', () => {
  beforeEach(() => {
    useAppDialogStore.setState({ dialogs: [] })
    useAppStore.setState({ apps: {} } as any)
  })

  it('renders nothing when no dialog is open', () => {
    const { container } = render(<AppDialogHost />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the host title bar and the app-supplied body', () => {
    openDialog({ id: 'D1', title: 'Network Analyzer' })
    render(<AppDialogHost />)

    expect(screen.getByTestId('app-dialog-app1-D1')).toBeDefined()
    expect(screen.getByText('Network Analyzer')).toBeDefined()
    expect(screen.getByTestId('dialog-body')).toBeDefined()
  })

  it('closes through the close() handed to render', () => {
    openDialog({ id: 'D1' })
    render(<AppDialogHost />)

    fireEvent.click(screen.getByTestId('dialog-done'))

    expect(useAppDialogStore.getState().dialogs).toHaveLength(0)
    expect(screen.queryByTestId('app-dialog-app1-D1')).toBeNull()
  })

  it('closes through the host Close "X"', () => {
    openDialog({ id: 'D1' })
    render(<AppDialogHost />)

    fireEvent.click(screen.getByTestId('app-dialog-close-button'))

    expect(useAppDialogStore.getState().dialogs).toHaveLength(0)
    expect(screen.queryByTestId('app-dialog-app1-D1')).toBeNull()
  })

  it('closes on Escape — the documented exception for app dialogs', () => {
    openDialog({ id: 'D1' })
    render(<AppDialogHost />)

    fireEvent.keyDown(screen.getByTestId('dialog-body'), { key: 'Escape' })

    expect(useAppDialogStore.getState().dialogs).toHaveLength(0)
    expect(screen.queryByTestId('app-dialog-app1-D1')).toBeNull()
  })

  it('ignores other keys', () => {
    openDialog({ id: 'D1' })
    render(<AppDialogHost />)

    fireEvent.keyDown(screen.getByTestId('dialog-body'), { key: 'Enter' })

    expect(useAppDialogStore.getState().dialogs).toHaveLength(1)
  })

  it('does not render a dialog whose app is inactive', () => {
    openDialog({ id: 'D1' }, { active: false })
    render(<AppDialogHost />)

    expect(screen.queryByTestId('app-dialog-app1-D1')).toBeNull()
  })

  it('renders one dialog per open entry, scoped by (appId, id)', () => {
    openDialog({ id: 'D1', title: 'First' })
    openDialog({ id: 'D1', appId: 'app2', title: 'Second' })
    render(<AppDialogHost />)

    expect(screen.getByTestId('app-dialog-app1-D1')).toBeDefined()
    expect(screen.getByTestId('app-dialog-app2-D1')).toBeDefined()
  })

  it('applies maxWidth and fullWidth to the dialog paper', () => {
    openDialog({ id: 'D1', maxWidth: 'md', fullWidth: true })
    render(<AppDialogHost />)

    const paper = screen
      .getByTestId('app-dialog-app1-D1')
      .querySelector('.MuiDialog-paper')
    expect(paper?.className).toContain('MuiDialog-paperWidthMd')
    expect(paper?.className).toContain('MuiDialog-paperFullWidth')
  })

  it('defaults to maxWidth "sm" when unspecified', () => {
    openDialog({ id: 'D1' })
    render(<AppDialogHost />)

    const paper = screen
      .getByTestId('app-dialog-app1-D1')
      .querySelector('.MuiDialog-paper')
    expect(paper?.className).toContain('MuiDialog-paperWidthSm')
  })

  it('hands the body the per-app context of the app that opened it', () => {
    const Body = (): JSX.Element => {
      const ctx = useAppContext()
      return (
        <span data-testid="ctx-app-id">
          {ctx?.appId}:{typeof ctx?.apis.dialog.open}
        </span>
      )
    }
    openDialog({ id: 'D1', render: () => <Body /> })
    render(<AppDialogHost />)

    expect(screen.getByTestId('ctx-app-id').textContent).toBe('app1:function')
  })

  it('isolates a throwing body behind the plugin fallback; title and X still render', () => {
    // Silence the error-boundary noise: React logs through console.error,
    // and jsdom reports the throw as an uncaught window 'error' event
    // unless it is defaultPrevented.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const swallow = (e: Event): void => e.preventDefault()
    window.addEventListener('error', swallow)
    try {
      openDialog({
        id: 'D1',
        title: 'Broken Dialog',
        render: () => {
          throw new Error('boom')
        },
      })
      render(<AppDialogHost />)

      expect(screen.getByText('Broken Dialog')).toBeDefined()
      expect(screen.getByRole('alert')).toBeDefined()

      fireEvent.click(screen.getByTestId('app-dialog-close-button'))
      expect(useAppDialogStore.getState().dialogs).toHaveLength(0)
    } finally {
      window.removeEventListener('error', swallow)
      errorSpy.mockRestore()
    }
  })

  it('resolves a React.lazy body under the Suspense fallback', async () => {
    const LazyBody = lazy(() =>
      Promise.resolve({
        default: () => <div data-testid="lazy-dialog-body">Loaded</div>,
      }),
    )
    openDialog({ id: 'D1', render: () => <LazyBody /> })
    render(<AppDialogHost />)

    await waitFor(() => {
      expect(screen.getByTestId('lazy-dialog-body')).toBeDefined()
    })
  })
})
