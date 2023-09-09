import { StyledInputBase } from './StyledInputBase'
import { Search } from './Search'
import { useEffect, useState } from 'react'
import { SearchControls } from './SearchControls'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { useTableStore } from '../../../store/TableStore'
import { ValueType } from '../../../models/TableModel'
import Fuse from 'fuse.js'
import { useViewModelStore } from '../../../store/ViewModelStore'

export const SearchBox = (): JSX.Element => {
  const [searchTerm, setSearchTerm] = useState<string>('')

  const [indexed, setIndexed] = useState<boolean>(false)
  const [fuse, setFuse] = useState<Fuse<Record<string, ValueType>> | undefined>(
    undefined,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const tables = useTableStore((state) => state.tables[currentNetworkId])
  const nodeTable = tables?.nodeTable

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  const clearSearch = (): void => {
    setSearchTerm('')
    exclusiveSelect(currentNetworkId, [], [])
  }

  const startSearch = (): void => {
    if (fuse === undefined) {
      return
    }
    const result = fuse.search(searchTerm)
    const toBeSelected: string[] = []
    result.forEach((r) => {
      const objectId: string = r.item.id as string
      toBeSelected.push(objectId)
    })
    console.log('SEARCH res', result)
    exclusiveSelect(currentNetworkId, toBeSelected, [])
  }

  useEffect(() => {
    setIndexed(false)
  }, [currentNetworkId])

  useEffect(() => {
    if (nodeTable === undefined || indexed) {
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
      setFuse(fuse)
      setIndexed(true)
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
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <SearchControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        startSearch={startSearch}
        clearSearch={clearSearch}
      />
    </Search>
  )
}
