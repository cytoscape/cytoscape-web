// src/features/AppManager/AppDialogHost.test.tsx
//
// Renders AppDialogHost against the real AppDialogStore (reset between
// tests, same pattern as AppDialogStore.spec.ts) so these tests exercise the
// actual open -> render -> close wiring, not a mocked stand-in.
//
// No @testing-library/jest-dom in this project (not a dependency) — asserts
// presence/absence via getByText/queryByText/queryByLabelText directly
// rather than the `.toBeInTheDocument()` matcher.
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DialogRenderProps } from '../../app-api/types/AppDialogTypes'
import { useAppDialogStore } from '../../data/hooks/stores/AppDialogStore'
import { AppDialogHost } from './AppDialogHost'

describe('AppDialogHost', () => {
  beforeEach(() => {
    useAppDialogStore.setState({ dialogs: [] })
  })

  it('renders nothing when no dialogs are open', () => {
    const { container } = render(<AppDialogHost />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the title and app-supplied body for an open dialog', () => {
    useAppDialogStore.getState().openDialog({
      id: 'D1',
      appId: 'app1',
      title: 'Network Analyzer',
      render: () => <div>Analyze form body</div>,
    })

    render(<AppDialogHost />)

    expect(screen.getByText('Network Analyzer')).toBeDefined()
    expect(screen.getByText('Analyze form body')).toBeDefined()
  })

  it('passes a working close() to the render callback', () => {
    useAppDialogStore.getState().openDialog({
      id: 'D1',
      appId: 'app1',
      title: 'My Dialog',
      render: ({ close }: DialogRenderProps) => (
        <button onClick={close}>Done</button>
      ),
    })

    render(<AppDialogHost />)

    fireEvent.click(screen.getByText('Done'))

    expect(useAppDialogStore.getState().dialogs).toHaveLength(0)
  })

  it("the host's own close button removes the dialog from the store", () => {
    useAppDialogStore.getState().openDialog({
      id: 'D1',
      appId: 'app1',
      title: 'My Dialog',
      render: () => <div>Body</div>,
    })

    render(<AppDialogHost />)

    fireEvent.click(screen.getByLabelText('Close dialog'))

    expect(useAppDialogStore.getState().dialogs).toHaveLength(0)
  })

  it('hides the close button when disableClose is set', () => {
    useAppDialogStore.getState().openDialog({
      id: 'D1',
      appId: 'app1',
      title: 'Saving…',
      render: () => <div>Please wait</div>,
      disableClose: true,
    })

    render(<AppDialogHost />)

    expect(screen.queryByLabelText('Close dialog')).toBeNull()
  })

  it('renders one Dialog per open entry, scoped by (appId, id)', () => {
    useAppDialogStore.getState().openDialog({
      id: 'D1',
      appId: 'app1',
      title: 'First',
      render: () => <div>First body</div>,
    })
    useAppDialogStore.getState().openDialog({
      id: 'D1',
      appId: 'app2',
      title: 'Second',
      render: () => <div>Second body</div>,
    })

    render(<AppDialogHost />)

    expect(screen.getByText('First')).toBeDefined()
    expect(screen.getByText('Second')).toBeDefined()
  })

  it('isolates a render error to the failing dialog via PluginErrorBoundary', () => {
    // Expected: React logs the thrown error to the console during this test.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    useAppDialogStore.getState().openDialog({
      id: 'D1',
      appId: 'app1',
      title: 'Broken Dialog',
      render: () => {
        throw new Error('boom')
      },
    })

    render(<AppDialogHost />)

    // The host's dialog chrome (title bar) still renders — only the body
    // falls back.
    expect(screen.getByText('Broken Dialog')).toBeDefined()
    expect(screen.getByText(/Plugin unavailable/)).toBeDefined()

    consoleSpy.mockRestore()
  })
})
