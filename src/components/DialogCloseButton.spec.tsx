import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CyDialog } from './CyDialog'
import { DialogCloseButton } from './DialogCloseButton'

describe('DialogCloseButton', () => {
  const renderButton = () => {
    const onClose = vi.fn()
    render(
      <CyDialog open>
        <DialogCloseButton
          data-testid="my-dialog-close-button"
          onClose={onClose}
        />
      </CyDialog>,
    )
    return onClose
  }

  it('is a button named exactly "Close"', () => {
    renderButton()
    // Exact, case-sensitive: an e2e `getByRole('button', { name: 'Close',
    // exact: true })` missed a lowercase "close" label.
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Close')
  })

  it('forwards data-testid to the button', () => {
    renderButton()
    expect(screen.getByTestId('my-dialog-close-button').tagName).toBe('BUTTON')
  })

  it('calls onClose when clicked', () => {
    const onClose = renderButton()
    fireEvent.click(screen.getByTestId('my-dialog-close-button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
