import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CyDialog } from './CyDialog'

/**
 * `handleMouseDown` lives on `.MuiDialog-container` and only arms the backdrop
 * click when the press starts on the container itself; `handleBackdropClick`
 * then runs on the root. Reproducing both is the only way to exercise the real
 * `'backdropClick'` path (`@mui/material/Dialog/Dialog.js`).
 */
const clickBackdrop = (): void => {
  const container = document.querySelector('.MuiDialog-container')
  if (container === null) {
    throw new Error('dialog container not rendered')
  }
  fireEvent.mouseDown(container)
  fireEvent.click(container)
}

describe('CyDialog (#628 — buttons are the only exit)', () => {
  const renderDialog = () => {
    const onCloseButton = vi.fn()
    render(
      <CyDialog data-testid="cy-dialog" open>
        <span>body</span>
        <button onClick={onCloseButton}>Close</button>
      </CyDialog>,
    )
    return onCloseButton
  }

  it('forwards the remaining Dialog props', () => {
    renderDialog()
    expect(screen.getByTestId('cy-dialog')).toBeTruthy()
    expect(screen.getByText('body')).toBeTruthy()
  })

  it('stays open on a backdrop click', () => {
    renderDialog()
    clickBackdrop()
    expect(screen.getByTestId('cy-dialog')).toBeTruthy()
    expect(screen.getByText('body')).toBeTruthy()
  })

  it('stays open on Escape', () => {
    renderDialog()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByTestId('cy-dialog')).toBeTruthy()
    expect(screen.getByText('body')).toBeTruthy()
  })

  it('leaves the dialog’s own buttons working', () => {
    const onCloseButton = renderDialog()
    fireEvent.click(screen.getByText('Close'))
    expect(onCloseButton).toHaveBeenCalledTimes(1)
  })
})
