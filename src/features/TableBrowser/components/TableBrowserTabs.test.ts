// @vitest-environment node
import { expect, it } from 'vitest'

import { listBottomPanelTabs } from '../../../models/UiModel/impl/panelTabs'
import { BottomPanelTabId } from '../../../models/UiModel/PanelTab'
import { TableBrowserTab } from './TableBrowserTabs'

// `panel.open('bottom', tabId)` selects by the model's index, so the two
// must agree or the App API opens the wrong table.
it('renders each tab at the position the panel-tab model publishes', () => {
  const indexOf = (tabId: string): number | undefined =>
    listBottomPanelTabs().find((t) => t.tabId === tabId)?.index

  expect(indexOf(BottomPanelTabId.NODES)).toBe(TableBrowserTab.NODES)
  expect(indexOf(BottomPanelTabId.EDGES)).toBe(TableBrowserTab.EDGES)
  expect(indexOf(BottomPanelTabId.NETWORK)).toBe(TableBrowserTab.NETWORK)
})
