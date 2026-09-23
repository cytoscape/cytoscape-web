// src/app-api/core/panelApi.test.ts
//
// Runs against the real stores: the point of `panel.open` is the state it
// leaves behind, which a mocked store cannot show.

import { beforeEach, describe, expect, it } from 'vitest'

import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useSidePanelStore } from '../../data/hooks/stores/SidePanelStore'
import {
  DEFAULT_UI_STATE,
  useUiStateStore,
} from '../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { AppStatus } from '../../models/AppModel/AppStatus'
import type { CyApp } from '../../models/AppModel/CyApp'
import type { RegisteredAppResource } from '../../models/AppModel/RegisteredAppResource'
import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import { AppCodes } from '../types/ApiResult'
import { createPanelApi, panelApi } from './panelApi'

const HCX_INTERACTION_NETWORK_UUID = 'HCX::interactionNetworkUUID'

const app = (id: string, status: AppStatus = AppStatus.Active): CyApp => ({
  id,
  name: id,
  status,
})

const panel = (
  appId: string,
  id: string,
  overrides: Partial<RegisteredAppResource> = {},
): RegisteredAppResource => ({ id, appId, slot: 'right-panel', ...overrides })

const panels = () => useUiStateStore.getState().ui.panels
const selectedRightTab = () => useSidePanelStore.getState().selectedTabId

const setCurrentNetwork = (networkId: string, properties: unknown[] = []) => {
  useWorkspaceStore.setState((state) => ({
    workspace: { ...state.workspace, currentNetworkId: networkId },
  }))
  useNetworkSummaryStore.setState({
    summaries: { [networkId]: { properties } },
  } as never)
}

describe('panelApi.open', () => {
  beforeEach(() => {
    useUiStateStore.setState({
      ui: {
        ...DEFAULT_UI_STATE,
        panels: {
          [Panel.LEFT]: PanelState.CLOSED,
          [Panel.RIGHT]: PanelState.CLOSED,
          [Panel.BOTTOM]: PanelState.CLOSED,
        },
      },
    })
    useSidePanelStore.setState({ selectedTabId: null })
    useAppStore.setState({ apps: { a: app('a'), b: app('b') } })
    useAppResourceStore.setState({ resources: [] })
    setCurrentNetwork('net1')
  })

  describe('right panel', () => {
    it('opens the closed pane and selects the app tab', () => {
      useAppResourceStore.setState({ resources: [panel('a', 'Results')] })

      const result = panelApi.open('right', 'Results')

      expect(result).toEqual({
        success: true,
        data: { panel: 'right', tabId: 'Results', appId: 'a' },
      })
      expect(panels().right).toBe(PanelState.OPEN)
      expect(selectedRightTab()).toBe('a::right-panel::Results')
      // Only the named pane is touched.
      expect(panels().left).toBe(PanelState.CLOSED)
      expect(panels().bottom).toBe(PanelState.CLOSED)
    })

    it('selects a manifest panel component', () => {
      useAppStore.setState({
        apps: {
          a: { ...app('a'), components: [{ id: 'Legacy', type: 'panel' }] },
        },
      })

      const result = panelApi.open('right', 'Legacy')

      expect(result.success).toBe(true)
      expect(selectedRightTab()).toBe('a::right-panel::Legacy')
    })

    it('selects the built-in viewer without an appId', () => {
      const result = panelApi.open('right', 'sub-network-viewer')

      expect(result).toEqual({
        success: true,
        data: { panel: 'right', tabId: 'sub-network-viewer' },
      })
      expect(selectedRightTab()).toBe(
        '__builtin__::right-panel::sub-network-viewer',
      )
    })

    it("prefers the calling app's own tab among duplicate ids", () => {
      useAppResourceStore.setState({
        resources: [panel('a', 'Results'), panel('b', 'Results')],
      })

      const result = createPanelApi('b').open('right', 'Results')

      expect(result.success && result.data.appId).toBe('b')
      expect(selectedRightTab()).toBe('b::right-panel::Results')
    })

    it('gives another app, or an anonymous caller, the first duplicate in tab order', () => {
      useAppResourceStore.setState({
        resources: [
          panel('a', 'Results', { order: 2 }),
          panel('b', 'Results', { order: 1 }),
        ],
      })

      expect(createPanelApi('c').open('right', 'Results')).toMatchObject({
        data: { appId: 'b' },
      })
      expect(panelApi.open('right', 'Results')).toMatchObject({
        data: { appId: 'b' },
      })
    })

    it('does not match a tab the pane is not showing', () => {
      useAppStore.setState({ apps: { a: app('a', AppStatus.Inactive) } })
      useAppResourceStore.setState({
        resources: [
          panel('a', 'Disabled'),
          panel('b', 'NeedsNetwork', { requires: { network: true } }),
        ],
      })
      setCurrentNetwork('')

      for (const tabId of ['Disabled', 'NeedsNetwork']) {
        const result = panelApi.open('right', tabId)
        expect(result.success).toBe(false)
      }
      expect(panels().right).toBe(PanelState.CLOSED)
      expect(selectedRightTab()).toBeNull()
    })
  })

  describe('left and bottom panels', () => {
    it('opens the bottom pane on the requested table', () => {
      const result = panelApi.open('bottom', 'edges')

      expect(result).toEqual({
        success: true,
        data: { panel: 'bottom', tabId: 'edges' },
      })
      expect(panels().bottom).toBe(PanelState.OPEN)
      expect(useUiStateStore.getState().ui.tableUi.activeTabIndex).toBe(1)
    })

    it('opens the left pane on the requested tab', () => {
      const result = panelApi.open('left', 'style')

      expect(result.success).toBe(true)
      expect(panels().left).toBe(PanelState.OPEN)
      expect(
        useUiStateStore.getState().ui.networkBrowserPanelUi.activeTabIndex,
      ).toBe(1)
    })

    it("matches 'llm-query' only while the current network is a hierarchy", () => {
      expect(panelApi.open('left', 'llm-query').success).toBe(false)
      expect(panels().left).toBe(PanelState.CLOSED)

      setCurrentNetwork('hcx1', [
        { predicateString: HCX_INTERACTION_NETWORK_UUID, value: 'uuid' },
      ])

      expect(panelApi.open('left', 'llm-query').success).toBe(true)
      expect(
        useUiStateStore.getState().ui.networkBrowserPanelUi.activeTabIndex,
      ).toBe(2)
    })

    it('searches only the named pane', () => {
      // 'network' is a bottom tab; an app tab with the same id lives on the right.
      useAppResourceStore.setState({ resources: [panel('a', 'network')] })

      expect(panelApi.open('left', 'network').success).toBe(false)

      const result = panelApi.open('bottom', 'network')
      expect(result).toMatchObject({ data: { panel: 'bottom' } })
      expect(panels().right).toBe(PanelState.CLOSED)
      expect(selectedRightTab()).toBeNull()
    })
  })

  it('opens the pane and leaves the selection alone when tabId is omitted', () => {
    useSidePanelStore.setState({ selectedTabId: 'a::right-panel::Kept' })

    const result = panelApi.open('right')

    expect(result).toEqual({ success: true, data: { panel: 'right' } })
    expect(panels().right).toBe(PanelState.OPEN)
    expect(selectedRightTab()).toBe('a::right-panel::Kept')
  })

  it('is a no-op success on a pane that is already open', () => {
    useUiStateStore.getState().setPanelState(Panel.BOTTOM, PanelState.OPEN)

    expect(panelApi.open('bottom').success).toBe(true)
    expect(panels().bottom).toBe(PanelState.OPEN)
  })

  it('fails with RESOURCE_NOT_FOUND, leaving the pane closed, for an unknown tab', () => {
    const result = panelApi.open('right', 'Nope')

    expect(result).toMatchObject({
      success: false,
      error: { code: AppCodes.RESOURCE_NOT_FOUND.code },
    })
    expect(panels().right).toBe(PanelState.CLOSED)
  })

  it.each([
    ['an unknown panel', ['center', 'x']],
    ['a missing panel', [undefined]],
    ['a non-string panel', [{}]],
    ['an empty tabId', ['right', '']],
    ['a blank tabId', ['right', '  ']],
    ['a non-string tabId', ['right', 42]],
  ])('fails with INVALID_INPUT for %s', (_label, args) => {
    const result = (panelApi.open as (...a: unknown[]) => unknown)(...args)

    expect(result).toMatchObject({
      success: false,
      error: { code: AppCodes.INVALID_INPUT.code },
    })
    expect(panels()).toEqual({
      left: PanelState.CLOSED,
      right: PanelState.CLOSED,
      bottom: PanelState.CLOSED,
    })
  })
})
