// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'

import { useLayoutToolsPanelStore } from './layoutToolsPanelStore'

describe('layoutToolsPanelStore (CW-540)', () => {
  beforeEach(() => {
    useLayoutToolsPanelStore.getState().setOpen(false)
  })

  it('is hidden by default', () => {
    expect(useLayoutToolsPanelStore.getState().open).toBe(false)
  })

  it('toggle flips visibility', () => {
    useLayoutToolsPanelStore.getState().toggle()
    expect(useLayoutToolsPanelStore.getState().open).toBe(true)
    useLayoutToolsPanelStore.getState().toggle()
    expect(useLayoutToolsPanelStore.getState().open).toBe(false)
  })

  it('setOpen sets an explicit value', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    expect(useLayoutToolsPanelStore.getState().open).toBe(true)
  })
})
