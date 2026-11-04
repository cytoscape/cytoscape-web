import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilterStore } from '../../../data/hooks/stores/FilterStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { GraphObjectType } from '../../../models/NetworkModel'
import { SearchBox } from './SearchBox'
import { runSearch } from './searchUtil'

// Mock the modules
vi.mock('./searchUtil', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./searchUtil')>()
  return {
    ...actual,
    runSearch: vi.fn(),
    createFuseIndex: vi.fn(() => ({})),
    filterColumns: vi.fn(() => new Set()),
  }
})

vi.mock('../../../data/hooks/stores/FilterStore')
vi.mock('../../../data/hooks/stores/MessageStore')
vi.mock('../../../data/hooks/stores/TableStore')
vi.mock('../../../data/hooks/stores/UiStateStore')
vi.mock('../../../data/hooks/stores/WorkspaceStore')
vi.mock('../../../data/hooks/stores/ViewModelStore')

describe('SearchBox', () => {
  const addMessageMock = vi.fn()
  const exclusiveSelectMock = vi.fn()
  const setQueryMock = vi.fn()
  const setSearchStateMock = vi.fn()
  const setLastSearchMock = vi.fn()

  // The search runs on the active view; `enablePopup` is on while the current
  // network is a hierarchy.
  const setActiveView = (activeNetworkView: string, enablePopup: boolean) => {
    ;(useUiStateStore as unknown as import('vitest').Mock).mockImplementation(
      (selector) => selector({ ui: { activeNetworkView, enablePopup } }),
    )
  }

  const submit = (): void => {
    fireEvent.click(screen.getByTestId('search-submit-button'))
  }

  // Turns on the Edges target (Nodes is on by default).
  const searchEdgesToo = (): void => {
    fireEvent.click(screen.getByTestId('search-settings-button'))
    fireEvent.click(screen.getByLabelText('Edges'))
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup store mocks
    ;(useMessageStore as unknown as import('vitest').Mock).mockImplementation(
      (selector) => selector({ addMessage: addMessageMock }),
    )
    const filterStoreState = {
      search: {
        query: 'test-query',
        options: { exact: false, operator: 'OR' },
        index: {
          net1: { [GraphObjectType.NODE]: {}, [GraphObjectType.EDGE]: {} },
          net1_sub1: {
            [GraphObjectType.NODE]: {},
            [GraphObjectType.EDGE]: {},
          },
        },
        indexedColumns: { net1: {} },
      },
      setQuery: setQueryMock,
      setSearchState: setSearchStateMock,
      setLastSearch: setLastSearchMock,
      setIndexedColumns: vi.fn(),
      setIndex: vi.fn(),
    }
    ;(useFilterStore as unknown as import('vitest').Mock).mockImplementation(
      (selector) => selector(filterStoreState),
    )
    // reIndex reads the latest state imperatively via getState()
    ;(
      useFilterStore.getState as unknown as import('vitest').Mock
    ).mockReturnValue(filterStoreState)
    setActiveView('net1', false)
    ;(useWorkspaceStore as unknown as import('vitest').Mock).mockImplementation(
      (selector) =>
        selector({
          workspace: { currentNetworkId: 'net1' },
        }),
    )
    ;(useTableStore as unknown as import('vitest').Mock).mockImplementation(
      (selector) =>
        selector({
          tables: {
            net1: {
              nodeTable: { columns: new Map(), rows: new Map() },
              edgeTable: { columns: new Map(), rows: new Map() },
            },
            net1_sub1: {
              nodeTable: { columns: new Map(), rows: new Map() },
              edgeTable: { columns: new Map(), rows: new Map() },
            },
          },
        }),
    )
    ;(useViewModelStore as unknown as import('vitest').Mock).mockImplementation(
      (selector) => selector({ exclusiveSelect: exclusiveSelectMock }),
    )
  })

  it('shows "No matches" in the field, not a snackbar, when nothing matches', () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue([]) // No matches

    render(<SearchBox />)
    submit()

    expect(screen.getByTestId('search-result-count').textContent).toBe(
      'No matches',
    )
    expect(screen.getByRole('status').textContent).toBe(
      'No matches for "test-query".',
    )
    expect(addMessageMock).not.toHaveBeenCalled()
  })

  it('shows the node count in the field after a node search', () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1', 'n2'])

    render(<SearchBox />)
    expect(screen.queryByTestId('search-result-count')).toBeNull()
    submit()

    expect(exclusiveSelectMock).toHaveBeenLastCalledWith(
      'net1',
      ['n1', 'n2'],
      [],
    )
    expect(screen.getByTestId('search-result-count').textContent).toBe(
      '2 nodes',
    )
    expect(screen.getByRole('status').textContent).toBe('2 nodes selected.')
    expect(addMessageMock).not.toHaveBeenCalled()
  })

  // #930: the Cell View reads the search from the store to highlight the
  // protein rings it matched
  it('records the search that ran in the store', () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1', 'n2'])

    render(<SearchBox />)
    submit()

    expect(setLastSearchMock).toHaveBeenLastCalledWith({
      id: expect.any(Number),
      networkId: 'net1',
      query: 'test-query',
      options: { exact: false, operator: 'OR' },
      nodeIds: ['n1', 'n2'],
    })
  })

  it('forgets the recorded search when the search is cleared', () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1'])

    render(<SearchBox />)
    submit()
    fireEvent.click(screen.getByTestId('search-clear-button'))

    expect(setLastSearchMock).toHaveBeenLastCalledWith(undefined)
  })

  it('counts nodes and edges when both are searched', () => {
    ;(runSearch as import('vitest').Mock)
      .mockReturnValueOnce(['n1'])
      .mockReturnValueOnce(['e1', 'e2', 'e3'])

    render(<SearchBox />)
    searchEdgesToo()
    submit()

    expect(screen.getByTestId('search-result-count').textContent).toBe(
      '1 node · 3 edges',
    )
  })

  it('removes the count when the query is edited', () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1'])

    render(<SearchBox />)
    submit()
    expect(screen.queryByTestId('search-result-count')).not.toBeNull()

    fireEvent.change(screen.getByLabelText('search'), {
      target: { value: 'test-quer' },
    })

    expect(screen.queryByTestId('search-result-count')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('removes the count when the search is cleared', () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1'])

    render(<SearchBox />)
    submit()
    fireEvent.click(screen.getByTestId('search-clear-button'))

    expect(screen.queryByTestId('search-result-count')).toBeNull()
  })

  it('replaces the count with the next search result', () => {
    ;(runSearch as import('vitest').Mock)
      .mockReturnValueOnce(['n1', 'n2'])
      .mockReturnValueOnce(['n1'])

    render(<SearchBox />)
    submit()
    submit()

    expect(screen.getAllByTestId('search-result-count')).toHaveLength(1)
    expect(screen.getByTestId('search-result-count').textContent).toBe('1 node')
  })

  it('names the subnetwork view of a hierarchy', () => {
    setActiveView('net1_sub1', true)
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1', 'n2'])

    render(<SearchBox />)
    submit()

    expect(exclusiveSelectMock).toHaveBeenLastCalledWith(
      'net1_sub1',
      ['n1', 'n2'],
      [],
    )
    expect(screen.getByRole('status').textContent).toBe(
      '2 nodes selected in the subnetwork view.',
    )
  })

  it('searches the current network while no view is active', () => {
    // A network the App API creates is never loaded through the workspace,
    // which is what sets the active view; it stays ''.
    setActiveView('', false)
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1'])

    render(<SearchBox />)
    submit()

    expect(exclusiveSelectMock).toHaveBeenLastCalledWith('net1', ['n1'], [])
    expect(screen.getByTestId('search-result-count').textContent).toBe('1 node')
    expect(addMessageMock).not.toHaveBeenCalled()
  })

  it('searches the current network when the active view belongs to another network', () => {
    // The App API can switch the current network without touching the active
    // view, which then still names the network shown before.
    setActiveView('net0', false)
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1'])

    render(<SearchBox />)
    submit()

    expect(exclusiveSelectMock).toHaveBeenLastCalledWith('net1', ['n1'], [])
    expect(screen.getByTestId('search-result-count').textContent).toBe('1 node')
  })

  it('counts only edges for an edge-only search', () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue(['e1', 'e2', 'e3'])

    render(<SearchBox />)
    fireEvent.click(screen.getByTestId('search-settings-button'))
    fireEvent.click(screen.getByLabelText('Nodes'))
    fireEvent.click(screen.getByLabelText('Edges'))
    submit()

    expect(exclusiveSelectMock).toHaveBeenLastCalledWith(
      'net1',
      [],
      ['e1', 'e2', 'e3'],
    )
    expect(screen.getByTestId('search-result-count').textContent).toBe(
      '3 edges',
    )
    expect(addMessageMock).not.toHaveBeenCalled()
  })

  it('names the main network view of a hierarchy', () => {
    setActiveView('net1', true)
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1', 'n2'])

    render(<SearchBox />)
    submit()

    expect(screen.getByRole('status').textContent).toBe(
      '2 nodes selected in the main network view.',
    )
  })

  it('hides a count left by a search on another network view', () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1'])

    const { rerender } = render(<SearchBox />)
    submit()
    setActiveView('net1_sub1', true)
    rerender(<SearchBox />)

    expect(screen.queryByTestId('search-result-count')).toBeNull()
  })

  it('shows the full sentence below the count on hover, not the examples', () => {
    vi.useFakeTimers()
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1', 'n2'])

    render(<SearchBox />)
    submit()

    fireEvent.mouseOver(screen.getByTestId('search-result-count'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toBe('2 nodes selected.')
    expect(tooltip.getAttribute('data-popper-placement')).toMatch(/^bottom/)
    expect(screen.queryByText('Search Examples:')).toBeNull()
  })

  it('keeps the examples closed when the search is repeated over the count', () => {
    vi.useFakeTimers()
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1', 'n2'])

    render(<SearchBox />)
    submit()
    fireEvent.mouseOver(screen.getByTestId('search-result-count'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Enter again while the pointer stays on the count: the count is replaced
    // in the same render, so it never unmounts and gets no new mouse-enter.
    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'Enter' })
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.queryByText('Search Examples:')).toBeNull()
    expect(screen.getByRole('tooltip').textContent).toBe('2 nodes selected.')
  })

  it('shows the full sentence when the count gets keyboard focus, not the examples', () => {
    vi.useFakeTimers()
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1', 'n2'])

    render(<SearchBox />)
    submit()

    const count = screen.getByTestId('search-result-count')
    expect(count.tabIndex).toBe(0)
    // MUI opens a tooltip on focus only when the focus is keyboard-driven
    fireEvent.keyDown(document.body, { key: 'Tab' })
    act(() => {
      count.focus()
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByRole('tooltip').textContent).toBe('2 nodes selected.')
    expect(screen.queryByText('Search Examples:')).toBeNull()
  })

  it('announces a repeated search again', () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue(['n1', 'n2'])

    render(<SearchBox />)
    submit()
    const status = screen.getByRole('status')
    const first = status.firstElementChild
    expect(first?.textContent).toBe('2 nodes selected.')

    // Same query, same result: the live region must still change, or screen
    // readers say nothing the second time.
    submit()

    expect(screen.getByRole('status')).toBe(status)
    expect(status.firstElementChild?.textContent).toBe('2 nodes selected.')
    expect(status.firstElementChild).not.toBe(first)
  })

  it('still shows the examples when hovering the input', () => {
    vi.useFakeTimers()

    render(<SearchBox />)
    fireEvent.mouseOver(screen.getByLabelText('search'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.queryByText('Search Examples:')).not.toBeNull()
  })

  it('shows "No search target selected" when no target is selected and a search is performed', async () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue([]) // No matches

    render(<SearchBox />)

    // Open settings to de-select Node checkbox (Node is selected by default)
    const settingsButton = screen.getByTestId('search-settings-button')
    fireEvent.click(settingsButton)

    // Find the actual checkbox inputs by their label
    const nodeCheckbox = screen.getByLabelText('Nodes') as HTMLInputElement
    const edgeCheckbox = screen.getByLabelText('Edges') as HTMLInputElement

    // De-select Node checkbox
    fireEvent.click(nodeCheckbox)

    // Ensure both are unchecked (Edge is unchecked by default)
    expect(nodeCheckbox.checked).toBe(false)
    expect(edgeCheckbox.checked).toBe(false)

    const submitButton = screen.getByTestId('search-submit-button')
    fireEvent.click(submitButton)

    expect(addMessageMock).toHaveBeenCalledWith({
      message: 'No search target selected. Please select nodes and/or edges.',
      severity: MessageSeverity.WARNING,
    })

    // Ensure "No matches found" was NOT called for this case
    expect(addMessageMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        severity: MessageSeverity.INFO,
      }),
    )
  })
})
