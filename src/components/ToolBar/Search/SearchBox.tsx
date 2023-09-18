import { StyledInputBase } from './StyledInputBase'
import { Search } from './Search'
import { useEffect, useRef, useState } from 'react'
import { SearchControls } from './SearchControls'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useTableStore } from '../../../store/TableStore'
import { Table, ValueType, ValueTypeName } from '../../../models/TableModel'
import Fuse from 'fuse.js'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useFilterStore } from '../../../store/FilterStore'
import { GraphObjectType } from '../../../models/NetworkModel'
import {
  IndexedColumns,
  Indices,
  Operator,
} from '../../../models/FilterModel/Search'
import { createFuseIndex, filterColumns } from './SearchUtils'

export const SearchBox = (): JSX.Element => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const baseRef = useRef<HTMLDivElement>(null)
  const handleOpenSettings = (): void => {
    setAnchorEl(baseRef.current)
  }
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  // Search query stored in the global store
  const query: string = useFilterStore((state) => state.search.query)

  const setQuery: (query: string) => void = useFilterStore(
    (state) => state.setQuery,
  )

  const searchOptions = useFilterStore((state) => state.search.options)

  const indexRecord: Record<
    IdType,
    Indices<Fuse<Record<string, ValueType>>>
  > = useFilterStore((state) => state.search.index)

  const setIndexedColumns: (
    networkId: IdType,
    type: GraphObjectType,
    columns: string[],
  ) => void = useFilterStore((state) => state.setIndexedColumns)

  const setIndex: (
    networkId: IdType,
    type: GraphObjectType,
    index: Fuse<Record<string, ValueType>>,
  ) => void = useFilterStore((state) => state.setIndex)

  const indexedColumns: Record<IdType, IndexedColumns> = useFilterStore(
    (state) => state.search.indexedColumns,
  )

  const tables = useTableStore((state) => state.tables[currentNetworkId])
  const nodeTable: Table = tables?.nodeTable
  const edgeTable: Table = tables?.edgeTable

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  const clearSearch = (): void => {
    setQuery('')
    exclusiveSelect(currentNetworkId, [], [])
  }

  const startSearch = (): void => {
    // Node and edge
    const indices: Indices<Fuse<Record<string, ValueType>>> =
      indexRecord[currentNetworkId]

    const nodeColumnsToBeSearched: string[] =
      indexedColumns[currentNetworkId].node
    const edgeColumnsToBeSearched: string[] =
      indexedColumns[currentNetworkId].edge

    const index = indices[GraphObjectType.NODE]
    if (index === undefined) {
      return
    }

    // Clear selection
    exclusiveSelect(currentNetworkId, [], [])

    const operator: Operator = searchOptions.operator

    let modifiedQuery: string = query
    if (operator === 'AND') {
      // AND search
      modifiedQuery = query.replace(/ /g, ',')
    } else {
      // OR search
      modifiedQuery = query.replace(/ /g, '|')
    }

    // Switch between AND or OR search operators
    const result = index.search(modifiedQuery)
    const toBeSelected: string[] = []
    result.forEach((r: any) => {
      const objectId: string = r.item.id as string
      toBeSelected.push(objectId)
    })

    console.log(
      'SEARCH res',
      result,
      nodeColumnsToBeSearched,
      edgeColumnsToBeSearched,
    )
    exclusiveSelect(currentNetworkId, toBeSelected, [])
  }

  useEffect(() => {
    if (currentNetworkId === undefined || currentNetworkId === '') {
      return
    }

    if (nodeTable === undefined || edgeTable === undefined) {
      return
    }

    const currentIndex = indexRecord[currentNetworkId]
    const currentIndexedColumns = indexedColumns[currentNetworkId]

    if (currentIndexedColumns === undefined) {
      const nodeColumns = filterColumns(
        Array.from(nodeTable.columns.values()),
        ValueTypeName.String,
      )
      const edgeColumns = filterColumns(
        Array.from(edgeTable.columns.values()),
        ValueTypeName.String,
      )
      setIndexedColumns(
        currentNetworkId,
        GraphObjectType.NODE,
        Array.from(nodeColumns),
      )
      setIndexedColumns(
        currentNetworkId,
        GraphObjectType.EDGE,
        Array.from(edgeColumns),
      )
    }

    try {
      if (currentIndex === undefined) {
        const nodeIndex = createFuseIndex(nodeTable)
        setIndex(currentNetworkId, GraphObjectType.NODE, nodeIndex)

        const edgeIndex = createFuseIndex(edgeTable)
        setIndex(currentNetworkId, GraphObjectType.EDGE, edgeIndex)
      }
    } catch (error) {
      console.log('Error indexing', error)
    }
  }, [nodeTable, edgeTable])

  // Execute search when enter key is pressed
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === 'Enter') {
      startSearch()
    }
  }

  return (
    <Search ref={baseRef}>
      <StyledInputBase
        placeholder="Search current network"
        inputProps={{ 'aria-label': 'search' }}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <SearchControls
        searchTerm={query}
        startSearch={startSearch}
        clearSearch={clearSearch}
        anchorEl={anchorEl}
        setAnchorEl={setAnchorEl}
        handleOpenSettings={handleOpenSettings}
      />
    </Search>
  )
}
