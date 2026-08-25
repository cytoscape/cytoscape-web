import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  CyDialog,
  DialogCloseReason,
  DialogDismiss,
  shouldDismiss,
} from './CyDialog'

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

const pressEscape = (): void => {
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
}

describe('shouldDismiss (#628 dialog dismissal policy)', () => {
  const cases: Array<[DialogDismiss, DialogCloseReason, boolean]> = [
    ['lightweight', 'backdropClick', true],
    ['lightweight', 'escapeKeyDown', true],
    ['form', 'backdropClick', false],
    ['form', 'escapeKeyDown', true],
    ['blocking', 'backdropClick', false],
    ['blocking', 'escapeKeyDown', false],
  ]

  it.each(cases)('%s + %s -> %s', (dismiss, reason, expected) => {
    expect(shouldDismiss(dismiss, reason)).toBe(expected)
  })
})

describe('CyDialog', () => {
  const renderDialog = (dismiss: DialogDismiss) => {
    const onClose = vi.fn()
    render(
      <CyDialog
        data-testid="cy-dialog"
        open
        dismiss={dismiss}
        onClose={onClose}
      >
        <span>body</span>
      </CyDialog>,
    )
    return onClose
  }

  it('forwards the remaining Dialog props', () => {
    renderDialog('lightweight')
    expect(screen.getByTestId('cy-dialog')).toBeTruthy()
    expect(screen.getByText('body')).toBeTruthy()
  })

  it('lightweight dismisses on backdrop click', () => {
    const onClose = renderDialog('lightweight')
    clickBackdrop()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('lightweight dismisses on Escape', () => {
    const onClose = renderDialog('lightweight')
    pressEscape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('form ignores a backdrop click', () => {
    const onClose = renderDialog('form')
    clickBackdrop()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('form dismisses on Escape', () => {
    const onClose = renderDialog('form')
    pressEscape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('blocking ignores a backdrop click', () => {
    const onClose = renderDialog('blocking')
    clickBackdrop()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('blocking ignores Escape', () => {
    const onClose = renderDialog('blocking')
    pressEscape()
    expect(onClose).not.toHaveBeenCalled()
  })
})
