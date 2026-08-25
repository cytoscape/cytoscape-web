import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
        },
        indexedColumns: { net1: {} },
      },
      setQuery: setQueryMock,
      setSearchState: setSearchStateMock,
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
    ;(useUiStateStore as unknown as import('vitest').Mock).mockImplementation(
      (selector) => selector({ ui: { activeNetworkView: 'net1' } }),
    )
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
          },
        }),
    )
    ;(useViewModelStore as unknown as import('vitest').Mock).mockImplementation(
      (selector) => selector({ exclusiveSelect: exclusiveSelectMock }),
    )
  })

  it('shows "No matches found" when a search target is selected but no matches occur', async () => {
    ;(runSearch as import('vitest').Mock).mockReturnValue([]) // No matches

    render(<SearchBox />)

    const submitButton = screen.getByTestId('search-submit-button')
    fireEvent.click(submitButton)

    expect(addMessageMock).toHaveBeenCalledWith({
      message:
        'No matches for search term "test-query" found in the active network',
      severity: MessageSeverity.INFO,
    })
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
