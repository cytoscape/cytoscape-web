// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { AppStatus } from '../../AppModel/AppStatus'
import { ComponentType } from '../../AppModel/ComponentType'
import { CyApp } from '../../AppModel/CyApp'
import { RegisteredAppResource } from '../../AppModel/RegisteredAppResource'
import { Panel } from '../Panel'
import { PanelTab } from '../PanelTab'
import {
  BUILTIN_SUB_NETWORK_RESOURCE_ID,
  listBottomPanelTabs,
  listLeftPanelTabs,
  listRightPanelAppTabs,
  listRightPanelTabs,
  pickPanelTab,
} from './panelTabs'

const app = (id: string, overrides: Partial<CyApp> = {}): CyApp => ({
  id,
  name: id,
  status: AppStatus.Active,
  ...overrides,
})

const panel = (
  appId: string,
  id: string,
  overrides: Partial<RegisteredAppResource> = {},
): RegisteredAppResource => ({ id, appId, slot: 'right-panel', ...overrides })

describe('listLeftPanelTabs', () => {
  it('lists workspace and style, in strip order', () => {
    expect(listLeftPanelTabs(false).map((t) => [t.tabId, t.index])).toEqual([
      ['workspace', 0],
      ['style', 1],
    ])
  })

  it('adds llm-query only for a hierarchy network', () => {
    expect(listLeftPanelTabs(true).map((t) => [t.tabId, t.index])).toEqual([
      ['workspace', 0],
      ['style', 1],
      ['llm-query', 2],
    ])
  })
})

describe('listBottomPanelTabs', () => {
  it('lists nodes, edges and network, in strip order', () => {
    expect(listBottomPanelTabs().map((t) => [t.tabId, t.index])).toEqual([
      ['nodes', 0],
      ['edges', 1],
      ['network', 2],
    ])
  })
})

describe('listRightPanelAppTabs', () => {
  it('keeps only right-panel resources of active apps', () => {
    const tabs = listRightPanelAppTabs(
      { a: app('a'), off: app('off', { status: AppStatus.Inactive }) },
      [
        panel('a', 'P1'),
        panel('off', 'P2'),
        panel('missing', 'P3'),
        { id: 'M1', appId: 'a', slot: 'apps-menu' },
      ],
      'net1',
    )

    expect(tabs.map((t) => t.resourceId)).toEqual(['a::right-panel::P1'])
  })

  it('hides a requires.network tab while no network is loaded', () => {
    const resources = [panel('a', 'P1', { requires: { network: true } })]

    expect(listRightPanelAppTabs({ a: app('a') }, resources, '')).toEqual([])
    expect(
      listRightPanelAppTabs({ a: app('a') }, resources, 'net1'),
    ).toHaveLength(1)
  })

  it('merges manifest panels, shadowed by a runtime tab of the same identity', () => {
    const apps = {
      a: app('a', {
        components: [
          { id: 'P1', type: ComponentType.Panel },
          { id: 'P2', type: ComponentType.Panel },
          { id: 'Menu', type: ComponentType.Menu },
        ],
      }),
    }

    const tabs = listRightPanelAppTabs(apps, [panel('a', 'P1')], 'net1')

    expect(tabs.map((t) => [t.id, t.resource !== undefined])).toEqual([
      ['P1', true],
      ['P2', false],
    ])
  })

  it('sorts by order, undefined last, keeping registration order on ties', () => {
    const tabs = listRightPanelAppTabs(
      { a: app('a') },
      [
        panel('a', 'none1'),
        panel('a', 'two', { order: 2 }),
        panel('a', 'none2'),
        panel('a', 'one', { order: 1 }),
      ],
      'net1',
    )

    expect(tabs.map((t) => t.id)).toEqual(['one', 'two', 'none1', 'none2'])
  })
})

describe('listRightPanelTabs', () => {
  it('puts the built-in viewer first', () => {
    const tabs = listRightPanelTabs({ a: app('a') }, [panel('a', 'P1')], 'net1')

    expect(tabs).toEqual([
      {
        panel: Panel.RIGHT,
        tabId: 'sub-network-viewer',
        resourceId: BUILTIN_SUB_NETWORK_RESOURCE_ID,
      },
      {
        panel: Panel.RIGHT,
        tabId: 'P1',
        appId: 'a',
        resourceId: 'a::right-panel::P1',
      },
    ])
  })
})

describe('pickPanelTab', () => {
  const tabs: PanelTab[] = [
    { panel: Panel.RIGHT, tabId: 'results', appId: 'a', resourceId: 'a' },
    { panel: Panel.RIGHT, tabId: 'results', appId: 'b', resourceId: 'b' },
    { panel: Panel.RIGHT, tabId: 'other', appId: 'b', resourceId: 'b2' },
  ]

  it('returns undefined when nothing matches', () => {
    expect(pickPanelTab(tabs, 'nope')).toBeUndefined()
  })

  it("prefers the caller's own tab among duplicates", () => {
    expect(pickPanelTab(tabs, 'results', 'b')?.appId).toBe('b')
  })

  it('falls back to the first match for another app or an anonymous caller', () => {
    expect(pickPanelTab(tabs, 'results', 'c')?.appId).toBe('a')
    expect(pickPanelTab(tabs, 'results')?.appId).toBe('a')
  })
})
