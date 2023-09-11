import { StyledInputBase } from './StyledInputBase'
import { Search } from './Search'
import { useEffect } from 'react'
import { SearchControls } from './SearchControls'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useTableStore } from '../../../store/TableStore'
import { ValueType } from '../../../models/TableModel'
import Fuse from 'fuse.js'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useFilterStore } from '../../../store/FilterStore'

export const SearchBox = (): JSX.Element => {
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  // Search query stored in the global store
  const query: string = useFilterStore((state) => state.search.query)
  const setQuery: (query: string) => void = useFilterStore(
    (state) => state.setQuery,
  )

  const index: Fuse<Record<string, ValueType>> = useFilterStore(
    (state) => state.search.index[currentNetworkId],
  )
  const setIndex: (
    networkId: IdType,
    index: Fuse<Record<string, ValueType>>,
  ) => void = useFilterStore((state) => state.setIndex)

  // const [fuse, setFuse] = useState<Fuse<Record<string, ValueType>> | undefined>(
  //   undefined,
  // )

  const tables = useTableStore((state) => state.tables[currentNetworkId])
  const nodeTable = tables?.nodeTable

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  const clearSearch = (): void => {
    setQuery('')
    exclusiveSelect(currentNetworkId, [], [])
  }

  const startSearch = (): void => {
    if (index === undefined) {
      return
    }

    // Clear
    exclusiveSelect(currentNetworkId, [], [])

    const result = index.search(query)
    const toBeSelected: string[] = []
    result.forEach((r) => {
      const objectId: string = r.item.id as string
      toBeSelected.push(objectId)
    })
    console.log('SEARCH res', result)
    exclusiveSelect(currentNetworkId, toBeSelected, [])
  }

  useEffect(() => {
    if (nodeTable === undefined || index !== undefined) {
      return
    }
    try {
      const list = Array<Record<string, ValueType>>()
      nodeTable.rows.forEach((row: Record<string, ValueType>, key: string) => {
        list.push({ id: key, ...row })
      })

      const keys: string[] = ['id']
      nodeTable.columns.forEach((column) => keys.push(column.name))

      const options = {
        includeScore: true,
        includeMatches: true,
        threshold: 0.0,
        useExtendedSearch: true,
        ignoreLocation: true,
        keys,
      }
      const fuse = new Fuse(list, options)
      setIndex(currentNetworkId, fuse)
      console.log(
        '-------------------------NODE TABLE INDEX Updated',
        nodeTable,
      )
    } catch (error) {
      console.log('Error indexing', error)
    }
  }, [nodeTable])
  // Execute search when enter key is pressed
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === 'Enter') {
      console.log('Start Search')
      startSearch()
    }
  }

  return (
    <Search>
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
      />
    </Search>
  )
}
