import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CytoscapeDesktopPermissionDialog } from './CytoscapeDesktopPermissionDialog'

describe('CytoscapeDesktopPermissionDialog (CW-Localhost)', () => {
  it('explains the localhost permission prompt when open', () => {
    render(
      <CytoscapeDesktopPermissionDialog
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByTestId('cytoscape-desktop-permission-dialog'),
    ).toBeTruthy()
    expect(screen.getByText(/localhost/i)).toBeTruthy()
    expect(screen.getByText(/import and export/i)).toBeTruthy()
  })

  it('fires onConfirm when Continue is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <CytoscapeDesktopPermissionDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('cytoscape-desktop-permission-continue'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
