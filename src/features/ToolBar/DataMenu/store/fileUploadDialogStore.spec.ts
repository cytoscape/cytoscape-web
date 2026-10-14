// @vitest-environment node
// src/features/ToolBar/DataMenu/store/fileUploadDialogStore.spec.ts

import { beforeEach, describe, expect, it } from 'vitest'

import { useFileUploadDialogStore } from './fileUploadDialogStore'

describe('fileUploadDialogStore', () => {
  beforeEach(() => {
    useFileUploadDialogStore.setState({ isOpen: false, hasOpened: false })
  })

  it('starts closed and never opened', () => {
    const { isOpen, hasOpened } = useFileUploadDialogStore.getState()
    expect(isOpen).toBe(false)
    expect(hasOpened).toBe(false)
  })

  it('openDialog() opens and latches hasOpened', () => {
    useFileUploadDialogStore.getState().openDialog()
    const { isOpen, hasOpened } = useFileUploadDialogStore.getState()
    expect(isOpen).toBe(true)
    expect(hasOpened).toBe(true)
  })

  it('closeDialog() closes but keeps the mount latch', () => {
    // The Data menu keeps the lazy FileUpload mounted after the first open so
    // the close animation plays; the latch must survive a close.
    useFileUploadDialogStore.getState().openDialog()
    useFileUploadDialogStore.getState().closeDialog()
    const { isOpen, hasOpened } = useFileUploadDialogStore.getState()
    expect(isOpen).toBe(false)
    expect(hasOpened).toBe(true)
  })
})
