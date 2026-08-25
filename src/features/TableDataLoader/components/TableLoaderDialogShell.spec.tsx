import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TableLoaderDialogShell } from './TableLoaderDialogShell'

/**
 * This shell replaced the Mantine `<Modal>` the two table-loader wizards used,
 * whose `closeOnClickOutside` defaulted to true. Both wizards are multi-step
 * forms, and under the dismissal policy (#628) only the title bar's Close
 * button may end them.
 */
describe('TableLoaderDialogShell dismissal', () => {
  const renderShell = () => {
    const onClose = vi.fn()
    render(
      <TableLoaderDialogShell
        show
        title="Join Table to Network"
        onClose={onClose}
        testIdPrefix="join-table-to-network"
        minHeight={100}
        minWidth={100}
      >
        <span>wizard</span>
      </TableLoaderDialogShell>,
    )
    return onClose
  }

  it('ignores a backdrop click so a half-filled wizard survives', () => {
    const onClose = renderShell()
    const container = document.querySelector('.MuiDialog-container')
    expect(container).not.toBeNull()
    fireEvent.mouseDown(container as Element)
    fireEvent.click(container as Element)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('join-table-to-network-modal')).toBeTruthy()
  })

  it('ignores Escape', () => {
    const onClose = renderShell()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes through the title bar button', () => {
    const onClose = renderShell()
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
