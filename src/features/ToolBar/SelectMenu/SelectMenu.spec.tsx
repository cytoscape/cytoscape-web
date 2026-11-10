import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import type { IdType } from '@/models/IdType'
import type { Network } from '@/models/NetworkModel'
import ViewModelFn from '@/models/ViewModel'
import { createVisualStyle } from '@/models/VisualStyleModel/impl/visualStyleFnImpl'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '@/models/VisualStyleModel/VisualPropertyName'
import { VisibilityType } from '@/models/VisualStyleModel/VisualPropertyValue/VisibilityType'
import { SelectMenu } from './index'

const NET = 'net_1'
const SUB = 'net_1_sub'

// n1 -e1-> n2, n3 isolated
const network: Network = {
  id: NET,
  nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
  edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
}
const subnetwork: Network = { id: SUB, nodes: [{ id: 'm1' }], edges: [] }

const viewOf = (net: Network, nodes: IdType[], edges: IdType[]) =>
  ViewModelFn.exclusiveSelect(ViewModelFn.createViewModel(net), nodes, edges)

const seed = (
  selectedNodes: IdType[] = [],
  selectedEdges: IdType[] = [],
): void => {
  useNetworkStore.setState({
    networks: new Map([
      [NET, network],
      [SUB, subnetwork],
    ]),
  })
  useViewModelStore.setState({
    viewModels: {
      [NET]: [viewOf(network, selectedNodes, selectedEdges)],
      [SUB]: [viewOf(subnetwork, [], [])],
    },
  })
  useVisualStyleStore.setState({
    visualStyles: { [NET]: createVisualStyle(), [SUB]: createVisualStyle() },
  })
  useWorkspaceStore.setState((state) => ({
    workspace: {
      ...state.workspace,
      currentNetworkId: NET,
      networkIds: [NET],
      networkModified: {},
    },
  }))
  useUiStateStore.setState((state) => ({
    ui: { ...state.ui, activeNetworkView: '' },
  }))
}

const selection = (networkId: IdType = NET) => {
  const [view] = useViewModelStore.getState().viewModels[networkId]
  return {
    nodes: [...view.selectedNodes].sort(),
    edges: [...view.selectedEdges].sort(),
  }
}

const hiddenIds = (vp: string): IdType[] =>
  [
    ...(useVisualStyleStore.getState().visualStyles[NET] as any)[
      vp
    ].bypassMap.keys(),
  ].sort()

const openMenu = (): void => {
  fireEvent.click(screen.getByTestId('toolbar-select-menu-menu-button'))
}

const row = (testId: string): HTMLElement => screen.getByTestId(testId)

const isDisabled = (testId: string): boolean =>
  row(testId).getAttribute('aria-disabled') === 'true'

const clickRow = async (testId: string): Promise<void> => {
  fireEvent.click(row(testId))
  await waitFor(() => expect(screen.queryByTestId(testId)).toBeNull())
}

describe('SelectMenu', () => {
  beforeEach(() => {
    seed()
  })

  it('is disabled without a network', () => {
    useWorkspaceStore.setState((state) => ({
      workspace: { ...state.workspace, networkIds: [] },
    }))
    render(<SelectMenu />)
    expect(
      screen.getByTestId('toolbar-select-menu-menu-button'),
    ).toHaveProperty('disabled', true)
  })

  it('lists its rows in order, with the two dividers', () => {
    render(<SelectMenu />)
    openMenu()
    const menu = screen.getByRole('menu')
    const texts = [...menu.children].map((child) =>
      child.getAttribute('role') === 'separator' || child.tagName === 'HR'
        ? '---'
        : (child.textContent ?? ''),
    )
    expect(texts).toEqual([
      'Select All Nodes',
      'Select All Edges',
      'Deselect All Nodes',
      'Deselect All Edges',
      '---',
      'Select AllCtrl+A',
      'Deselect All',
      '---',
      'Hide Selected Nodes and Edges',
      'Show All',
    ])
  })

  it('selects and deselects nodes and edges', async () => {
    render(<SelectMenu />)
    openMenu()
    await clickRow('select-menu-select-all-nodes')
    expect(selection()).toEqual({ nodes: ['n1', 'n2', 'n3'], edges: [] })

    openMenu()
    await clickRow('select-menu-select-all-edges')
    expect(selection()).toEqual({ nodes: ['n1', 'n2', 'n3'], edges: ['e1'] })

    openMenu()
    await clickRow('select-menu-deselect-all-nodes')
    expect(selection()).toEqual({ nodes: [], edges: ['e1'] })

    openMenu()
    await clickRow('select-menu-deselect-all-edges')
    expect(selection()).toEqual({ nodes: [], edges: [] })

    openMenu()
    await clickRow('select-menu-select-all')
    expect(selection()).toEqual({ nodes: ['n1', 'n2', 'n3'], edges: ['e1'] })

    openMenu()
    await clickRow('select-menu-deselect-all')
    expect(selection()).toEqual({ nodes: [], edges: [] })
  })

  it('enables Hide Selected only while something is selected', async () => {
    render(<SelectMenu />)
    openMenu()
    expect(isDisabled('select-menu-hide-selected')).toBe(true)
    act(() => {
      useViewModelStore.getState().exclusiveSelect(NET, ['n1'], [])
    })
    expect(isDisabled('select-menu-hide-selected')).toBe(false)
  })

  it('hides the selection with its edges, deselects it, and shows it again', async () => {
    seed(['n1'], [])
    render(<SelectMenu />)
    openMenu()
    expect(isDisabled('select-menu-show-all')).toBe(true)
    await clickRow('select-menu-hide-selected')
    expect(hiddenIds(NodeVisualPropertyName.NodeVisibility)).toEqual(['n1'])
    expect(hiddenIds(EdgeVisualPropertyName.EdgeVisibility)).toEqual(['e1'])
    expect(selection()).toEqual({ nodes: [], edges: [] })

    openMenu()
    expect(isDisabled('select-menu-show-all')).toBe(false)
    await clickRow('select-menu-show-all')
    expect(hiddenIds(NodeVisualPropertyName.NodeVisibility)).toEqual([])
    expect(hiddenIds(EdgeVisualPropertyName.EdgeVisibility)).toEqual([])
  })

  it('does not count a bypass that keeps an element visible as hidden', () => {
    useVisualStyleStore
      .getState()
      .setBypass(
        NET,
        NodeVisualPropertyName.NodeVisibility,
        ['n1'],
        VisibilityType.Element,
      )
    render(<SelectMenu />)
    openMenu()
    expect(isDisabled('select-menu-show-all')).toBe(true)
  })

  it('acts on the active network view', async () => {
    useUiStateStore.setState((state) => ({
      ui: { ...state.ui, activeNetworkView: SUB },
    }))
    render(<SelectMenu />)
    openMenu()
    await clickRow('select-menu-select-all')
    expect(selection(SUB)).toEqual({ nodes: ['m1'], edges: [] })
    expect(selection(NET)).toEqual({ nodes: [], edges: [] })
  })

  it('disables its rows while the network is not loaded', () => {
    useViewModelStore.setState({ viewModels: {} })
    render(<SelectMenu />)
    openMenu()
    expect(isDisabled('select-menu-select-all')).toBe(true)
    expect(isDisabled('select-menu-hide-selected')).toBe(true)
  })

  describe('Ctrl/⌘+A', () => {
    const pressSelectAll = (
      target: EventTarget = document.body,
      init: KeyboardEventInit = {},
    ): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
        ...init,
      })
      act(() => {
        target.dispatchEvent(event)
      })
      return event
    }

    it('selects everything while nothing has focus', () => {
      render(<SelectMenu />)
      const event = pressSelectAll()
      expect(selection()).toEqual({ nodes: ['n1', 'n2', 'n3'], edges: ['e1'] })
      // The browser does not select the page's text
      expect(event.defaultPrevented).toBe(true)
    })

    it('leaves a text field its own Ctrl+A', () => {
      render(
        <>
          <SelectMenu />
          <input data-testid="field" />
        </>,
      )
      const field = screen.getByTestId('field')
      field.focus()
      const event = pressSelectAll(field)
      expect(selection()).toEqual({ nodes: [], edges: [] })
      expect(event.defaultPrevented).toBe(false)
    })

    it('ignores the shortcut with another modifier', () => {
      render(<SelectMenu />)
      pressSelectAll(document.body, { shiftKey: true })
      pressSelectAll(document.body, { altKey: true })
      pressSelectAll(document.body, { metaKey: true })
      expect(selection()).toEqual({ nodes: [], edges: [] })
    })

    it('accepts ⌘A as well', () => {
      render(<SelectMenu />)
      pressSelectAll(document.body, { ctrlKey: false, metaKey: true })
      expect(selection()).toEqual({ nodes: ['n1', 'n2', 'n3'], edges: ['e1'] })
    })

    it('stops listening once unmounted', () => {
      const { unmount } = render(<SelectMenu />)
      unmount()
      pressSelectAll()
      expect(selection()).toEqual({ nodes: [], edges: [] })
    })
  })
})
