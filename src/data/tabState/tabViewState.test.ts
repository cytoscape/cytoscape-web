import { beforeEach, describe, expect, it } from 'vitest'

import { Panel } from '@/models/UiModel/Panel'
import { PanelState } from '@/models/UiModel/PanelState'
import {
  applyTabViewState,
  DEFAULT_TAB_VIEW_STATE,
  getTabViewState,
  saveTabViewState,
  toTabViewState,
  withoutTabViewState,
} from '@/data/tabState/tabViewState'

const uiFixture = (overrides: Record<string, any> = {}): any => ({
  panels: {
    [Panel.LEFT]: PanelState.CLOSED,
    [Panel.RIGHT]: PanelState.OPEN,
    [Panel.BOTTOM]: PanelState.CLOSED,
  },
  activeNetworkView: 'net-1',
  enablePopup: true,
  showErrorDialog: true,
  errorMessage: 'boom',
  tableUi: { activeTabIndex: 2, columnUiState: { col: { width: 100 } } },
  networkBrowserPanelUi: { activeTabIndex: 1 },
  networkViewUi: { activeTabIndex: 3 },
  visualStyleOptions: { 'net-1': {} },
  ...overrides,
})

describe('@/data/tabState/tabViewState', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('returns defaults when this tab has stored nothing', () => {
    expect(getTabViewState()).toEqual(DEFAULT_TAB_VIEW_STATE)
  })

  it('round-trips this tab view state through sessionStorage', () => {
    saveTabViewState(uiFixture())

    expect(getTabViewState()).toEqual({
      panels: {
        [Panel.LEFT]: PanelState.CLOSED,
        [Panel.RIGHT]: PanelState.OPEN,
        [Panel.BOTTOM]: PanelState.CLOSED,
      },
      tableActiveTabIndex: 2,
      networkBrowserPanelActiveTabIndex: 1,
      networkViewActiveTabIndex: 3,
    })
  })

  it('falls back to defaults on a malformed stored blob', () => {
    window.sessionStorage.setItem('cyweb.tab.viewState', '{not json')

    expect(getTabViewState()).toEqual(DEFAULT_TAB_VIEW_STATE)
  })

  it('preserves every valid panel state, not just open/closed', () => {
    // PanelState also has HIDDEN and MINIMIZED; treating those as invalid would
    // silently reset a hidden panel on reload.
    window.sessionStorage.setItem(
      'cyweb.tab.viewState',
      JSON.stringify({
        panels: {
          [Panel.LEFT]: PanelState.HIDDEN,
          [Panel.RIGHT]: PanelState.MINIMIZED,
          [Panel.BOTTOM]: PanelState.OPEN,
        },
      }),
    )

    expect(getTabViewState().panels).toEqual({
      [Panel.LEFT]: PanelState.HIDDEN,
      [Panel.RIGHT]: PanelState.MINIMIZED,
      [Panel.BOTTOM]: PanelState.OPEN,
    })
  })

  it('replaces unrecognized field values with defaults', () => {
    window.sessionStorage.setItem(
      'cyweb.tab.viewState',
      JSON.stringify({
        panels: { [Panel.LEFT]: 'sideways' },
        tableActiveTabIndex: -4,
        networkViewActiveTabIndex: 'two',
      }),
    )

    expect(getTabViewState()).toEqual(DEFAULT_TAB_VIEW_STATE)
  })

  it('tolerates a Ui value missing the newer tab-index fields', () => {
    const legacyUi = uiFixture({
      tableUi: undefined,
      networkBrowserPanelUi: undefined,
      networkViewUi: undefined,
    })

    expect(toTabViewState(legacyUi)).toMatchObject({
      tableActiveTabIndex: 0,
      networkBrowserPanelActiveTabIndex: 0,
      networkViewActiveTabIndex: 0,
    })
  })

  describe('withoutTabViewState', () => {
    it('strips every per-tab field so the shared row carries none of them', () => {
      const stripped = withoutTabViewState(uiFixture())

      expect(stripped.panels).toEqual(DEFAULT_TAB_VIEW_STATE.panels)
      expect(stripped.tableUi.activeTabIndex).toBe(0)
      expect(stripped.networkBrowserPanelUi.activeTabIndex).toBe(0)
      expect(stripped.networkViewUi.activeTabIndex).toBe(0)
      expect(stripped.activeNetworkView).toBe('')
      expect(stripped.enablePopup).toBe(false)
      expect(stripped.showErrorDialog).toBe(false)
      expect(stripped.errorMessage).toBe('')
    })

    it('keeps the genuinely shared fields', () => {
      const stripped = withoutTabViewState(uiFixture())

      expect(stripped.tableUi.columnUiState).toEqual({ col: { width: 100 } })
      expect(stripped.visualStyleOptions).toEqual({ 'net-1': {} })
    })

    it('is what makes a second tab start from a clean layout', () => {
      // A tab reading the shared row must not inherit another tab's layout.
      const shared = withoutTabViewState(uiFixture())

      expect(toTabViewState(shared)).toEqual(DEFAULT_TAB_VIEW_STATE)
    })
  })

  it('applyTabViewState overlays per-tab fields onto shared state', () => {
    const shared = withoutTabViewState(uiFixture())

    const restored = applyTabViewState(shared, {
      panels: {
        [Panel.LEFT]: PanelState.CLOSED,
        [Panel.RIGHT]: PanelState.OPEN,
        [Panel.BOTTOM]: PanelState.CLOSED,
      },
      tableActiveTabIndex: 5,
      networkBrowserPanelActiveTabIndex: 6,
      networkViewActiveTabIndex: 7,
    })

    expect(restored.panels[Panel.RIGHT]).toBe(PanelState.OPEN)
    expect(restored.tableUi.activeTabIndex).toBe(5)
    expect(restored.networkBrowserPanelUi.activeTabIndex).toBe(6)
    expect(restored.networkViewUi.activeTabIndex).toBe(7)
    // Shared fields survive the overlay
    expect(restored.tableUi.columnUiState).toEqual({ col: { width: 100 } })
  })
})
