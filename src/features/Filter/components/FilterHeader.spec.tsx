import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilterStore } from '@/data/hooks/stores/FilterStore'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { WorkspaceFilter } from '@/models/FilterModel/FilterTree'
import { parseCyFilterText } from '@/models/FilterModel/impl/cyFilterJson'
import { createWorkspaceFilter } from '@/models/FilterModel/impl/filterTreeImpl'

import { sortFiltersByName } from '../utils/filterTabUtil'
import { describeImport, FilterHeader } from './FilterHeader'

const FIXTURES = path.resolve(__dirname, '../../../../test/fixtures/filters')

const filtersInStore = (): WorkspaceFilter[] =>
  sortFiltersByName(Object.values(useFilterStore.getState().workspaceFilters))

// Renders the header the way FilterTab does: from the store
const Harness = (): JSX.Element => {
  const workspaceFilters = useFilterStore((state) => state.workspaceFilters)
  const selectedId = useFilterStore((state) => state.selectedWorkspaceFilterId)
  const filters = sortFiltersByName(Object.values(workspaceFilters))
  const selected =
    filters.find((filter) => filter.id === selectedId) ?? filters[0]
  return <FilterHeader filters={filters} selected={selected} />
}

const openMenuItem = (testId: string): void => {
  fireEvent.click(screen.getByTestId('filter-options-button'))
  fireEvent.click(screen.getByTestId(testId))
}

describe('FilterHeader', () => {
  beforeEach(() => {
    useFilterStore.setState({
      workspaceFilters: {
        f1: createWorkspaceFilter('f1', 'Hubs'),
      },
      selectedWorkspaceFilterId: 'f1',
    })
    useMessageStore.setState({ messages: [] } as any)
  })

  // jsdom has no object URLs; the export test stubs them
  const { createObjectURL, revokeObjectURL } = URL

  afterEach(() => {
    vi.restoreAllMocks()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
  })

  it('creates a filter with a suggested name and selects it', () => {
    render(<Harness />)
    openMenuItem('filter-new-menu-item')

    expect(
      (screen.getByTestId('filter-name-input') as HTMLInputElement).value,
    ).toBe('My filter')
    fireEvent.click(screen.getByTestId('filter-name-confirm-button'))

    const created = filtersInStore().find((f) => f.name === 'My filter')
    expect(created).toBeDefined()
    expect(useFilterStore.getState().selectedWorkspaceFilterId).toBe(
      created?.id,
    )
  })

  it('refuses a taken name on rename and keeps the dialog open', () => {
    useFilterStore
      .getState()
      .putWorkspaceFilter(createWorkspaceFilter('f2', 'Kinases'))
    render(<Harness />)
    openMenuItem('filter-rename-menu-item')

    fireEvent.change(screen.getByTestId('filter-name-input'), {
      target: { value: 'kinases' },
    })
    fireEvent.click(screen.getByTestId('filter-name-confirm-button'))

    expect(screen.getByTestId('filter-name-dialog')).toBeTruthy()
    expect(
      screen.getByText('The name is already being used by another filter.'),
    ).toBeTruthy()

    fireEvent.change(screen.getByTestId('filter-name-input'), {
      target: { value: 'Big hubs' },
    })
    fireEvent.click(screen.getByTestId('filter-name-confirm-button'))
    expect(useFilterStore.getState().workspaceFilters.f1.name).toBe('Big hubs')
  })

  it('copies the current filter and selects the copy', () => {
    render(<Harness />)
    openMenuItem('filter-copy-menu-item')

    expect(filtersInStore().map((f) => f.name)).toEqual(['Hubs', 'Hubs 2'])
    expect(useFilterStore.getState().selectedWorkspaceFilterId).not.toBe('f1')
  })

  it('removes the current filter after confirmation, but never the last one', () => {
    const { rerender } = render(<Harness />)
    fireEvent.click(screen.getByTestId('filter-options-button'))
    expect(
      screen
        .getByTestId('filter-remove-menu-item')
        .getAttribute('aria-disabled'),
    ).toBe('true')

    useFilterStore
      .getState()
      .putWorkspaceFilter(createWorkspaceFilter('f2', 'Kinases'))
    rerender(<Harness />)
    fireEvent.click(screen.getByTestId('filter-remove-menu-item'))
    fireEvent.click(screen.getByTestId('confirmation-dialog-confirm'))

    expect(filtersInStore().map((f) => f.name)).toEqual(['Kinases'])
    expect(useFilterStore.getState().selectedWorkspaceFilterId).toBe('f2')
  })

  it('exports every filter as a Cytoscape Desktop filter file', async () => {
    const blobs: Blob[] = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob)
      return 'blob:filters'
    })
    URL.revokeObjectURL = vi.fn()
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    render(<Harness />)

    openMenuItem('filter-export-menu-item')

    expect(click).toHaveBeenCalledTimes(1)
    const parsed = parseCyFilterText(await blobs[0].text())
    expect(parsed.success && parsed.filters.map((f) => f.name)).toEqual([
      'Hubs',
    ])
  })

  it('imports a filter file, skipping chains, and reports what it did', async () => {
    render(<Harness />)
    const text = fs.readFileSync(
      path.join(FIXTURES, 'filters-and-chains.valid.json'),
      'utf-8',
    )
    const file = new File([text], 'filters.json', { type: 'application/json' })

    fireEvent.change(screen.getByTestId('filter-import-input'), {
      target: { files: [file] },
    })

    await waitFor(() =>
      expect(filtersInStore().map((f) => f.name)).toEqual([
        'Default filter',
        'Hubs',
        'Short ids',
      ]),
    )
    expect(useMessageStore.getState().messages.at(-1)?.message).toBe(
      'Imported 2 filters, skipped 2 chains.',
    )
  })
})

describe('describeImport', () => {
  it('reports failures and skipped entries', () => {
    expect(describeImport({ success: false, error: 'Not JSON.' })).toBe(
      'Could not import filters. Not JSON.',
    )
    expect(
      describeImport({
        success: true,
        filters: [],
        skipped: [{ index: 0, reason: 'unknown-id', detail: '' }],
      }),
    ).toBe('Imported 0 filters, skipped 1 unsupported entry.')
  })
})
