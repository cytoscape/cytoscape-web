import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FloatingLayoutToolsPanel } from './FloatingLayoutToolsPanel'
import { useLayoutToolsPanelStore } from './store/layoutToolsPanelStore'

// Stub the panel body so the test doesn't pull in the Scaling tool's stores.
vi.mock('./LayoutToolsPanel', () => ({
  LayoutToolsPanel: () => <div data-testid="layout-tools-body" />,
}))

describe('FloatingLayoutToolsPanel (CW-540)', () => {
  afterEach(() => {
    useLayoutToolsPanelStore.getState().setOpen(false)
  })

  it('renders nothing when the panel is closed', () => {
    useLayoutToolsPanelStore.getState().setOpen(false)
    const { container } = render(<FloatingLayoutToolsPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the layout tools panel when open', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    render(<FloatingLayoutToolsPanel />)
    expect(screen.getByTestId('floating-layout-tools-panel')).toBeTruthy()
    expect(screen.getByTestId('layout-tools-body')).toBeTruthy()
  })

  it('closes when the close button is clicked', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    render(<FloatingLayoutToolsPanel />)

    fireEvent.click(screen.getByTestId('floating-layout-tools-close'))
    expect(useLayoutToolsPanelStore.getState().open).toBe(false)
  })
})
