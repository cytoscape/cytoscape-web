import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Tooltip,
} from '@mui/material'
import { ChangeEvent, useRef, useState } from 'react'

import { useFilterStore } from '@/data/hooks/stores/FilterStore'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { logUi } from '@/debug'
import { ConfirmationDialog } from '@/features/ConfirmationDialog'
import type { WorkspaceFilter } from '@/models/FilterModel/FilterTree'
import {
  CyFilterParseResult,
  parseCyFilterText,
  serializeCyFilters,
  SkipReason,
} from '@/models/FilterModel/impl/cyFilterJson'
import { uniqueFilterName } from '@/models/FilterModel/impl/filterTreeImpl'
import {
  FilterNameError,
  filterNamesOf,
} from '@/models/FilterModel/impl/workspaceFiltersImpl'
import { MessageSeverity } from '@/models/MessageModel'

import { FilterNameDialog } from './FilterNameDialog'

/** File name of an export */
export const FILTER_EXPORT_FILE_NAME = 'cytoscape-filters.json'

const NAME_ERRORS: Record<string, string> = {
  [FilterNameError.EMPTY]: 'Please provide a name.',
  [FilterNameError.TAKEN]: 'The name is already being used by another filter.',
}

const downloadText = (text: string, fileName: string): void => {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * The message shown after an import
 */
export const describeImport = (result: CyFilterParseResult): string => {
  if (!result.success) {
    return `Could not import filters. ${result.error}`
  }
  const count = (n: number, noun: string): string =>
    `${n} ${noun}${n === 1 ? '' : 's'}`
  const chains = result.skipped.filter(
    (entry) => entry.reason === SkipReason.CHAIN,
  ).length
  const others = result.skipped.length - chains
  const parts = [`Imported ${count(result.filters.length, 'filter')}`]
  if (chains > 0) parts.push(`skipped ${count(chains, 'chain')}`)
  if (others > 0) parts.push(`skipped ${count(others, 'unsupported entry')}`)
  return `${parts.join(', ')}.`
}

type NameDialogMode = 'new' | 'rename'

interface FilterHeaderProps {
  filters: readonly WorkspaceFilter[]
  selected: WorkspaceFilter
}

/**
 * The filter picker and its options menu: new, rename, copy, remove, export
 * and import (Cytoscape Desktop's named-filter combo box)
 */
export const FilterHeader = ({
  filters,
  selected,
}: FilterHeaderProps): JSX.Element => {
  const createWorkspaceFilter = useFilterStore(
    (state) => state.createWorkspaceFilter,
  )
  const renameWorkspaceFilter = useFilterStore(
    (state) => state.renameWorkspaceFilter,
  )
  const copyWorkspaceFilter = useFilterStore(
    (state) => state.copyWorkspaceFilter,
  )
  const deleteWorkspaceFilter = useFilterStore(
    (state) => state.deleteWorkspaceFilter,
  )
  const addWorkspaceFilters = useFilterStore(
    (state) => state.addWorkspaceFilters,
  )
  const setSelected = useFilterStore(
    (state) => state.setSelectedWorkspaceFilterId,
  )
  const addMessage = useMessageStore((state) => state.addMessage)

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [nameDialog, setNameDialog] = useState<NameDialogMode | undefined>()
  const [nameError, setNameError] = useState<string | undefined>()
  const [confirmRemove, setConfirmRemove] = useState<boolean>(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const closeMenuAnd = (action: () => void) => (): void => {
    setMenuAnchor(null)
    action()
  }

  const openNameDialog = (mode: NameDialogMode): void => {
    setNameError(undefined)
    setNameDialog(mode)
  }

  const confirmName = (name: string): boolean => {
    if (nameDialog === 'new') {
      setSelected(createWorkspaceFilter(name).id)
    } else {
      const result = renameWorkspaceFilter(selected.id, name)
      if (!result.success) {
        setNameError(NAME_ERRORS[result.error] ?? 'The name was refused.')
        return false
      }
    }
    setNameDialog(undefined)
    return true
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Allow importing the same file again
    event.target.value = ''
    if (file === undefined) return
    let result: CyFilterParseResult
    try {
      result = parseCyFilterText(await file.text())
    } catch (e) {
      logUi.error('[FilterHeader]: Failed to read the filter file', e)
      result = { success: false, error: 'The file could not be read.' }
    }
    if (result.success && result.filters.length > 0) {
      const added = addWorkspaceFilters(result.filters)
      setSelected(added[0].id)
    }
    addMessage({
      message: describeImport(result),
      duration: 5000,
      severity:
        result.success && result.filters.length > 0
          ? MessageSeverity.SUCCESS
          : MessageSeverity.WARNING,
    })
  }

  const names = filterNamesOf(
    Object.fromEntries(filters.map((filter) => [filter.id, filter])),
  )

  return (
    <Box
      data-testid="filter-header"
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}
    >
      <Select
        size="small"
        value={selected.id}
        sx={{ flex: 1, minWidth: 0 }}
        inputProps={{
          'aria-label': 'Filter',
          'data-testid': 'filter-select',
        }}
        onChange={(event) => setSelected(event.target.value)}
      >
        {filters.map((filter) => (
          <MenuItem
            key={filter.id}
            value={filter.id}
            data-testid={`filter-select-option-${filter.name}`}
          >
            {filter.name}
          </MenuItem>
        ))}
      </Select>
      <Tooltip title="Options...">
        <IconButton
          size="small"
          aria-label="Filter options"
          data-testid="filter-options-button"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          data-testid="filter-new-menu-item"
          onClick={closeMenuAnd(() => openNameDialog('new'))}
        >
          New filter
        </MenuItem>
        <MenuItem
          data-testid="filter-rename-menu-item"
          onClick={closeMenuAnd(() => openNameDialog('rename'))}
        >
          Rename current filter
        </MenuItem>
        <MenuItem
          data-testid="filter-copy-menu-item"
          onClick={closeMenuAnd(() => {
            const copy = copyWorkspaceFilter(selected.id)
            if (copy !== undefined) setSelected(copy.id)
          })}
        >
          Copy current filter
        </MenuItem>
        <MenuItem
          data-testid="filter-remove-menu-item"
          // As in Cytoscape Desktop, the last filter cannot be removed
          disabled={filters.length < 2}
          onClick={closeMenuAnd(() => setConfirmRemove(true))}
        >
          Remove current filter
        </MenuItem>
        <Divider />
        <MenuItem
          data-testid="filter-export-menu-item"
          onClick={closeMenuAnd(() =>
            downloadText(serializeCyFilters(filters), FILTER_EXPORT_FILE_NAME),
          )}
        >
          Export filters...
        </MenuItem>
        <MenuItem
          data-testid="filter-import-menu-item"
          onClick={closeMenuAnd(() => fileInput.current?.click())}
        >
          Import filters...
        </MenuItem>
      </Menu>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        data-testid="filter-import-input"
        onChange={(event) => void importFile(event)}
      />
      <FilterNameDialog
        open={nameDialog !== undefined}
        title={nameDialog === 'new' ? 'Create New Filter' : 'Rename Filter'}
        confirmLabel={nameDialog === 'new' ? 'Create' : 'Rename'}
        initialName={
          nameDialog === 'new'
            ? uniqueFilterName(names, 'My filter')
            : selected.name
        }
        error={nameError}
        onConfirm={confirmName}
        onCancel={() => setNameDialog(undefined)}
      />
      <ConfirmationDialog
        open={confirmRemove}
        setOpen={setConfirmRemove}
        title="Remove Filter"
        message={`Remove the filter "${selected.name}"?`}
        buttonTitle="Remove"
        onConfirm={() => {
          const next = filters.find((filter) => filter.id !== selected.id)
          deleteWorkspaceFilter(selected.id)
          setSelected(next?.id)
        }}
      />
    </Box>
  )
}
