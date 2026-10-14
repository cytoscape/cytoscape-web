// @vitest-environment node
// src/data/hooks/stores/SidePanelStore.spec.ts
import { beforeEach, describe, expect, it } from 'vitest'

import { useSidePanelStore } from './SidePanelStore'

describe('SidePanelStore', () => {
  beforeEach(() => {
    useSidePanelStore.setState({ selectedTabId: null })
  })

  it('starts with no selection', () => {
    expect(useSidePanelStore.getState().selectedTabId).toBeNull()
  })

  it('stores and clears the selected tab', () => {
    useSidePanelStore.getState().setSelectedTabId('app1::right-panel::P1')
    expect(useSidePanelStore.getState().selectedTabId).toBe(
      'app1::right-panel::P1',
    )

    useSidePanelStore.getState().setSelectedTabId(null)
    expect(useSidePanelStore.getState().selectedTabId).toBeNull()
  })
})
