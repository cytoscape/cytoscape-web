import { Tooltip } from '@mui/material'
import Fuse from 'fuse.js'
import { useEffect, useRef, useState } from 'react'

import { useFilterStore } from '../../../data/hooks/stores/FilterStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../../debug'
import {
  IndexedColumns,
  Indices,
  Operator,
} from '../../../models/FilterModel/Search'
import { SearchState } from '../../../models/FilterModel/SearchState'
import { IdType } from '../../../models/IdType'
import { MessageSeverity } from '../../../models/MessageModel'
import { GraphObjectType } from '../../../models/NetworkModel'
import { Table, ValueType, ValueTypeName } from '../../../models/TableModel'
import { Search } from './Search'
import { SearchControls } from './SearchControls'
import { SearchExamplesTooltip } from './SearchExamplesTooltip'
import { createFuseIndex, filterColumns, runSearch } from './searchUtil'
import { StyledInputBase } from './StyledInputBase'

export const SearchBox = (): JSX.Element => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const [searchTargets, setSearchTargets] = useState<
    Record<GraphObjectType, boolean>
  >({
    [GraphObjectType.NODE]: true,
    [GraphObjectType.EDGE]: false,
  })

  const baseRef = useRef<HTMLDivElement>(null)
  const handleOpenSettings = (): void => {
    setAnchorEl(baseRef.current)
  }
  // This is the ID of network in the selected viewport.
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const networkId: IdType = activeNetworkId ?? currentNetworkId
  // Search query stored in the global store
  const query: string = useFilterStore((state) => state.search.query)

  const setQuery: (query: string) => void = useFilterStore(
    (state) => state.setQuery,
  )

  const setSearchState: (searchState: string) => void = useFilterStore(
    (state) => state.setSearchState,
  )

  const searchOptions = useFilterStore((state) => state.search.options)
  const { exact } = searchOptions

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

  const tables = useTableStore((state) => state.tables[networkId])
  const nodeTable: Table = tables?.nodeTable
  const edgeTable: Table = tables?.edgeTable

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const addMessage = useMessageStore((state) => state.addMessage)

  const clearSearch = (): void => {
    setQuery('')
    exclusiveSelect(networkId, [], [])

    setSearchState(SearchState.READY)
  }

  const startSearch = (): void => {
    if (networkId === undefined || networkId === '') {
      logUi.warn(`[${startSearch.name}]: No network ID found`)
      addMessage({
        message: 'No network selected for search.',
        severity: MessageSeverity.WARNING,
      })
      return
    }

    setSearchState(SearchState.IN_PROGRESS)
    try {
      // Node and edge
      const indices: Indices<Fuse<Record<string, ValueType>>> =
        indexRecord[networkId]

      if (indices === undefined) {
        logUi.warn(`[${startSearch.name}]: No search indices found for network ${networkId}`)
        addMessage({
          message: 'Search index not ready. Please wait.',
          severity: MessageSeverity.WARNING,
        })
        return
      }

      const nodeIndex = indices[GraphObjectType.NODE]
      const edgeIndex = indices[GraphObjectType.EDGE]

      const isNodeTargetSelected = searchTargets[GraphObjectType.NODE]
      const isEdgeTargetSelected = searchTargets[GraphObjectType.EDGE]

      if (isNodeTargetSelected && nodeIndex === undefined) {
        logUi.warn(`[${startSearch.name}]: Node index undefined for network ${networkId}`)
        addMessage({
          message: 'Node search index not ready. Please wait.',
          severity: MessageSeverity.WARNING,
        })
        return
      }

      if (isEdgeTargetSelected && edgeIndex === undefined) {
        logUi.warn(`[${startSearch.name}]: Edge index undefined for network ${networkId}`)
        addMessage({
          message: 'Edge search index not ready. Please wait.',
          severity: MessageSeverity.WARNING,
        })
        return
      }

      // Clear selection
      exclusiveSelect(networkId, [], [])

      const operator: Operator = searchOptions.operator
      const exact: boolean = searchOptions.exact

      let nodesToBeSelected: IdType[] = []
      let edgesToBeSelected: IdType[] = []

      logUi.info(`[${startSearch.name}]: Executing search. Query: "${query}", Targets:`, searchTargets)

      if (isNodeTargetSelected) {
        nodesToBeSelected = runSearch(nodeIndex, query, operator, exact)
      }
      if (isEdgeTargetSelected) {
        edgesToBeSelected = runSearch(edgeIndex, query, operator, exact)
      }

      logUi.info(`[${startSearch.name}]: Search complete. Nodes: ${nodesToBeSelected.length}, Edges: ${edgesToBeSelected.length}`)

      exclusiveSelect(networkId, nodesToBeSelected, edgesToBeSelected)

      const isAnyTargetSelected = isNodeTargetSelected || isEdgeTargetSelected

      if (
        isAnyTargetSelected &&
        query !== '' &&
        nodesToBeSelected.length === 0 &&
        edgesToBeSelected.length === 0
      ) {
        logUi.info(`[${startSearch.name}]: No results found. Showing message.`)
        addMessage({
          message: `No matches for search term "${query}" found in the active network`,
          severity: MessageSeverity.INFO,
        })
      } else if (!isAnyTargetSelected && query !== '') {
        logUi.warn(`[${startSearch.name}]: No search target selected.`)
        addMessage({
          message: 'No search target selected. Please select nodes and/or edges.',
          severity: MessageSeverity.WARNING,
        })
      }
    } finally {
      setSearchState(SearchState.DONE)
    }
  }

  const reIndex = (forceUpdate: boolean): void => {
    if (networkId === undefined || networkId === '') {
      return
    }

    if (nodeTable === undefined || edgeTable === undefined) {
      return
    }

    const currentIndex = indexRecord[networkId]
    const currentIndexedColumns = indexedColumns[networkId]

    if (currentIndexedColumns === undefined || forceUpdate) {
      const nodeColumns = filterColumns(
        Array.from(nodeTable.columns.values()),
        [ValueTypeName.String, ValueTypeName.ListString],
      )
      const edgeColumns = filterColumns(
        Array.from(edgeTable.columns.values()),
        [ValueTypeName.String, ValueTypeName.ListString],
      )
      setIndexedColumns(
        networkId,
        GraphObjectType.NODE,
        Array.from(nodeColumns),
      )
      setIndexedColumns(
        networkId,
        GraphObjectType.EDGE,
        Array.from(edgeColumns),
      )
    }

    try {
      if (currentIndex === undefined) {
        const nodeIndex = createFuseIndex(nodeTable)
        setIndex(networkId, GraphObjectType.NODE, nodeIndex)

        const edgeIndex = createFuseIndex(edgeTable)
        setIndex(networkId, GraphObjectType.EDGE, edgeIndex)
      }
    } catch (error) {
      logUi.error(`[${reIndex.name}]: Error indexing`, error)
    }
  }
  useEffect(() => {
    reIndex(false)
  }, [nodeTable, edgeTable])

  useEffect(() => {
    reIndex(true)
  }, [exact])

  // Execute search when enter key is pressed
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === 'Enter') {
      startSearch()
    }
  }

  return (
    <Tooltip
      title={<SearchExamplesTooltip />}
      placement="left"
      arrow
      enterDelay={500}
      leaveDelay={200}
      componentsProps={{
        tooltip: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            maxWidth: 'none',
          },
        },
        arrow: {
          sx: {
            color: 'rgba(0, 0, 0, 0.9)',
          },
        },
      }}
    >
      <Search ref={baseRef}>
        <StyledInputBase
          data-testid="search-box-input"
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
          setSearchTargets={setSearchTargets}
          searchTargets={searchTargets}
        />
      </Search>
    </Tooltip>
  )
}
