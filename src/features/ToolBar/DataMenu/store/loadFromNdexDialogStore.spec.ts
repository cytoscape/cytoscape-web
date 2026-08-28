// @vitest-environment node
// src/features/ToolBar/DataMenu/store/loadFromNdexDialogStore.spec.ts

import { beforeEach, describe, expect, it } from 'vitest'

import { useLoadFromNdexDialogStore } from './loadFromNdexDialogStore'

describe('loadFromNdexDialogStore', () => {
  beforeEach(() => {
    useLoadFromNdexDialogStore.setState({ isOpen: false, initialQuery: null })
  })

  it('starts closed with no initial query', () => {
    const { isOpen, initialQuery } = useLoadFromNdexDialogStore.getState()
    expect(isOpen).toBe(false)
    expect(initialQuery).toBeNull()
  })

  it('openDialog() opens in browse mode (no query)', () => {
    useLoadFromNdexDialogStore.getState().openDialog()
    const { isOpen, initialQuery } = useLoadFromNdexDialogStore.getState()
    expect(isOpen).toBe(true)
    expect(initialQuery).toBeNull()
  })

  it('openDialog(query) opens with the query to run', () => {
    useLoadFromNdexDialogStore.getState().openDialog('BRCA1')
    const { isOpen, initialQuery } = useLoadFromNdexDialogStore.getState()
    expect(isOpen).toBe(true)
    expect(initialQuery).toBe('BRCA1')
  })

  it('closeDialog() clears the query so a menu reopen is browse mode', () => {
    useLoadFromNdexDialogStore.getState().openDialog('BRCA1')
    useLoadFromNdexDialogStore.getState().closeDialog()
    const { isOpen, initialQuery } = useLoadFromNdexDialogStore.getState()
    expect(isOpen).toBe(false)
    expect(initialQuery).toBeNull()
  })
})
