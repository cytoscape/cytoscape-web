import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FileDropzoneDialog } from './FileDropzoneDialog'

/**
 * This dialog replaced the Mantine `<Modal>` the upload surfaces used, whose
 * `closeOnClickOutside` defaulted to true. Under the dismissal policy (#628)
 * only its own Close button ends it.
 */
describe('FileDropzoneDialog dismissal', () => {
  const testIds = {
    modal: 'file-upload-modal',
    dropzone: 'file-upload-dropzone',
    browseButton: 'file-upload-browse-button',
  }

  const renderDialog = () => {
    const handleClose = vi.fn()
    render(
      <FileDropzoneDialog
        show
        handleClose={handleClose}
        title="Upload a network file"
        testIds={testIds}
        validator={() => null}
        onDrop={vi.fn()}
        onReject={vi.fn()}
      >
        <span>drop a file</span>
      </FileDropzoneDialog>,
    )
    return handleClose
  }

  it('ignores a backdrop click', () => {
    const handleClose = renderDialog()
    const container = document.querySelector('.MuiDialog-container')
    expect(container).not.toBeNull()
    fireEvent.mouseDown(container as Element)
    fireEvent.click(container as Element)
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('ignores Escape', () => {
    const handleClose = renderDialog()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('closes through its own Close button', () => {
    const handleClose = renderDialog()
    fireEvent.click(screen.getByLabelText('Close'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the dropzone reachable', () => {
    renderDialog()
    expect(screen.getByTestId(testIds.dropzone)).toBeTruthy()
    expect(screen.getByTestId(testIds.browseButton)).toBeTruthy()
  })
})
