import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { SearchBox } from './SearchBox'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useFilterStore } from '../../../data/hooks/stores/FilterStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { GraphObjectType } from '../../../models/NetworkModel'
import { runSearch } from './searchUtil'

// Mock the modules
jest.mock('./searchUtil', () => ({
  ...jest.requireActual('./searchUtil'),
  runSearch: jest.fn(),
  createFuseIndex: jest.fn(() => ({})),
  filterColumns: jest.fn(() => new Set()),
}))

jest.mock('../../../data/hooks/stores/FilterStore')
jest.mock('../../../data/hooks/stores/MessageStore')
jest.mock('../../../data/hooks/stores/TableStore')
jest.mock('../../../data/hooks/stores/UiStateStore')
jest.mock('../../../data/hooks/stores/WorkspaceStore')
jest.mock('../../../data/hooks/stores/ViewModelStore')

describe('SearchBox', () => {
    const addMessageMock = jest.fn()
    const exclusiveSelectMock = jest.fn()
    const setQueryMock = jest.fn()
    const setSearchStateMock = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()

        // Setup store mocks
        ;(useMessageStore as unknown as jest.Mock).mockImplementation((selector) => 
            selector({ addMessage: addMessageMock })
        )
        ;(useFilterStore as unknown as jest.Mock).mockImplementation((selector) =>
            selector({
                search: {
                    query: 'test-query',
                    options: { exact: false, operator: 'OR' },
                    index: { 'net1': { [GraphObjectType.NODE]: {}, [GraphObjectType.EDGE]: {} } },
                    indexedColumns: { 'net1': {} }
                },
                setQuery: setQueryMock,
                setSearchState: setSearchStateMock,
                setIndexedColumns: jest.fn(),
                setIndex: jest.fn(),
            })
        )
        ;(useUiStateStore as unknown as jest.Mock).mockImplementation((selector) => 
            selector({ ui: { activeNetworkView: 'net1' } })
        )
        ;(useWorkspaceStore as unknown as jest.Mock).mockImplementation((selector) =>
            selector({
                workspace: { currentNetworkId: 'net1' }
            })
        )
        ;(useTableStore as unknown as jest.Mock).mockImplementation((selector) =>
            selector({
                tables: {
                    'net1': { nodeTable: { columns: new Map(), rows: new Map() }, edgeTable: { columns: new Map(), rows: new Map() } }
                }
            })
        )
        ;(useViewModelStore as unknown as jest.Mock).mockImplementation((selector) =>
            selector({ exclusiveSelect: exclusiveSelectMock })
        )
    })

    it('shows "No matches found" when a search target is selected but no matches occur', async () => {
        (runSearch as jest.Mock).mockReturnValue([]) // No matches

        render(<SearchBox />)

        const submitButton = screen.getByTestId('search-submit-button')
        fireEvent.click(submitButton)

        expect(addMessageMock).toHaveBeenCalledWith({
            message: 'No matches for search term "test-query" found in the active network',
            severity: MessageSeverity.INFO,
        })
    })

    it('shows "No search target selected" when no target is selected and a search is performed', async () => {
        (runSearch as jest.Mock).mockReturnValue([]) // No matches

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
        expect(addMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({
            severity: MessageSeverity.INFO
        }))
    })
})
