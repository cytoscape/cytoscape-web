import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FileDropzoneDialog } from './FileDropzoneDialog'

/**
 * This dialog replaced the Mantine `<Modal>` the upload surfaces used. It holds
 * nothing the user typed — a file is either dropped or it is not — so it is
 * `lightweight` tier: backdrop click and Escape both dismiss (#628).
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

  it('closes on a backdrop click', () => {
    const handleClose = renderDialog()
    const container = document.querySelector('.MuiDialog-container')
    expect(container).not.toBeNull()
    fireEvent.mouseDown(container as Element)
    fireEvent.click(container as Element)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const handleClose = renderDialog()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the dropzone reachable', () => {
    renderDialog()
    expect(screen.getByTestId(testIds.dropzone)).toBeTruthy()
    expect(screen.getByTestId(testIds.browseButton)).toBeTruthy()
  })
})
