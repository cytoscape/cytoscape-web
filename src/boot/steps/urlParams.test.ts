// Tests for the pure URL-parameter helpers that encode the shareable-URL boot
// semantics (#600). The boot orchestration that calls them is exercised by
// runAppShellBoot.test.ts and the e2e suite.
//
// These originated in AppShell.test.tsx on the test/coverage branch, where the
// helpers lived in AppShell.tsx. The boot rework moved the logic into
// src/boot/steps/, so the tests moved with it.

import { describe, expect, it } from 'vitest'

import { GraphObjectType } from '@/models/NetworkModel'
import type { Ui } from '@/models/UiModel'
import { Panel } from '@/models/UiModel/Panel'
import { PanelState } from '@/models/UiModel/PanelState'

import { mergeUiStateWithSearchParams } from './loadWorkspaceState'
import { buildFilterConfigFromSearchParams } from './restoreUrlState'

describe('mergeUiStateWithSearchParams', () => {
  it('falls back to the default UI state when nothing is persisted', () => {
    const ui = mergeUiStateWithSearchParams(undefined, new URLSearchParams())

    expect(ui.panels[Panel.LEFT]).toBe(PanelState.OPEN)
    expect(ui.tableUi.activeTabIndex).toBe(0)
  })

  it('overlays panel states from the URL on the persisted state', () => {
    const search = new URLSearchParams({ left: 'closed', bottom: 'minimized' })

    const ui = mergeUiStateWithSearchParams(undefined, search)

    expect(ui.panels[Panel.LEFT]).toBe(PanelState.CLOSED)
    expect(ui.panels[Panel.BOTTOM]).toBe(PanelState.MINIMIZED)
    // Untouched panel keeps its persisted/default value
    expect(ui.panels[Panel.RIGHT]).toBe(PanelState.CLOSED)
  })

  it('overlays the active table browser tab from the URL', () => {
    const search = new URLSearchParams({ activeTableBrowserTab: '2' })

    expect(
      mergeUiStateWithSearchParams(undefined, search).tableUi.activeTabIndex,
    ).toBe(2)
  })

  it('does not mutate the persisted state object', () => {
    const dbUiState = {
      panels: {
        [Panel.LEFT]: PanelState.OPEN,
        [Panel.RIGHT]: PanelState.OPEN,
        [Panel.BOTTOM]: PanelState.OPEN,
      },
      tableUi: { columnUiState: {}, activeTabIndex: 1 },
    } as unknown as Ui
    const search = new URLSearchParams({
      left: 'closed',
      activeTableBrowserTab: '3',
    })

    const merged = mergeUiStateWithSearchParams(dbUiState, search)

    expect(merged.panels[Panel.LEFT]).toBe(PanelState.CLOSED)
    expect(merged.tableUi.activeTabIndex).toBe(3)
    expect(dbUiState.panels[Panel.LEFT]).toBe(PanelState.OPEN)
    expect(dbUiState.tableUi.activeTabIndex).toBe(1)
  })

  it('ignores a panel value that is not a PanelState', () => {
    // These come straight from the query string, so an unrecognized value used
    // to be cast into store state unchecked.
    const search = new URLSearchParams({ left: 'banana', right: '' })

    const ui = mergeUiStateWithSearchParams(undefined, search)

    expect(ui.panels[Panel.LEFT]).toBe(PanelState.OPEN)
    expect(ui.panels[Panel.RIGHT]).toBe(PanelState.CLOSED)
  })

  it('ignores a non-numeric or negative table browser tab', () => {
    for (const activeTableBrowserTab of ['abc', '-1']) {
      const ui = mergeUiStateWithSearchParams(
        undefined,
        new URLSearchParams({ activeTableBrowserTab }),
      )

      expect(ui.tableUi.activeTabIndex).toBe(0)
    }
  })
})

describe('buildFilterConfigFromSearchParams', () => {
  it('requires all three filter params to be present', () => {
    expect(
      buildFilterConfigFromSearchParams(new URLSearchParams()),
    ).toBeUndefined()
    expect(
      buildFilterConfigFromSearchParams(
        new URLSearchParams({ filterFor: 'node', filterBy: 'type' }),
      ),
    ).toBeUndefined()
  })

  it('builds a checkbox filter with the comma-split range', () => {
    const config = buildFilterConfigFromSearchParams(
      new URLSearchParams({
        filterFor: 'node',
        filterBy: 'category',
        filterRange: 'gene,drug',
      }),
    )

    expect(config).toMatchObject({
      attributeName: 'category',
      target: GraphObjectType.NODE,
      widgetType: 'checkbox',
      range: { values: ['gene', 'drug'] },
    })
  })

  it('targets edges for any non-node filterFor value', () => {
    const config = buildFilterConfigFromSearchParams(
      new URLSearchParams({
        filterFor: 'edge',
        filterBy: 'interaction',
        filterRange: 'binds',
      }),
    )

    expect(config?.target).toBe(GraphObjectType.EDGE)
  })
})
