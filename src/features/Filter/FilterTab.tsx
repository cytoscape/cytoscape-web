import { Box, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  applyWorkspaceFilter,
  setWorkspaceFilterDisplayModeAndApply,
} from '@/data/filter/applyWorkspaceFilter'
import { useFilterStore } from '@/data/hooks/stores/FilterStore'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useTableStore } from '@/data/hooks/stores/TableStore'
import type { CompositeFilterNode } from '@/models/FilterModel/FilterTree'
import { validateFilter } from '@/models/FilterModel/impl/validateFilter'
import { DEFAULT_FILTER_NAME } from '@/models/FilterModel/impl/workspaceFiltersImpl'
import type { IdType } from '@/models/IdType'

import { ApplyPanel } from './components/ApplyPanel'
import {
  ConditionEditorContext,
  ConditionList,
} from './components/ConditionList'
import { FilterHeader } from './components/FilterHeader'
import {
  defaultAutoApply,
  EMPTY_FILTER_STATUS,
  formatApplyStatus,
  sortFiltersByName,
  warningsByPath,
} from './utils/filterTabUtil'

/** Delay before "Apply when filter changes" runs, so typing applies once */
export const AUTO_APPLY_DELAY_MS = 300

interface FilterTabProps {
  // The network the filter applies to: the active network view, else the
  // current network
  networkId: IdType
}

/**
 * The FILTER tab of the left panel: Cytoscape Desktop's Filter panel (its
 * "Filter" tab; there are no chains). See
 * docs/specifications/FILTER_SPECIFICATION.md.
 */
export const FilterTab = ({ networkId }: FilterTabProps): JSX.Element => {
  const workspaceFilters = useFilterStore((state) => state.workspaceFilters)
  const selectedId = useFilterStore((state) => state.selectedWorkspaceFilterId)
  const setRoot = useFilterStore((state) => state.setWorkspaceFilterRoot)
  const storedAutoApply: boolean | undefined = useFilterStore(
    (state) => state.workspaceFilterAutoApply[networkId],
  )
  const setAutoApply = useFilterStore(
    (state) => state.setWorkspaceFilterAutoApply,
  )
  const network = useNetworkStore((state) => state.networks.get(networkId))
  const tables = useTableStore((state) => state.tables[networkId])

  const filters = useMemo(
    () => sortFiltersByName(Object.values(workspaceFilters)),
    [workspaceFilters],
  )
  const selected =
    filters.find((filter) => filter.id === selectedId) ?? filters[0]

  // As in Cytoscape Desktop, there is always a filter to edit. Read the
  // store, not the render's snapshot, so a double-run effect creates one.
  useEffect(() => {
    const state = useFilterStore.getState()
    if (Object.keys(state.workspaceFilters).length === 0) {
      state.setSelectedWorkspaceFilterId(
        state.createWorkspaceFilter(DEFAULT_FILTER_NAME).id,
      )
    }
  }, [filters.length])

  const autoApply = storedAutoApply ?? defaultAutoApply(network)
  const [status, setStatus] = useState<string | undefined>()

  const apply = (): void => {
    if (selected === undefined) return
    setStatus(formatApplyStatus(applyWorkspaceFilter(networkId, selected.id)))
  }

  // "Apply when filter changes": re-apply after the conditions change or
  // another filter is picked, but not on opening the tab or switching
  // networks, as in Cytoscape Desktop
  const lastSeen = useRef<{
    networkId: IdType
    filterId?: IdType
    root?: CompositeFilterNode
  }>({ networkId, filterId: selected?.id, root: selected?.root })
  useEffect(() => {
    const previous = lastSeen.current
    lastSeen.current = {
      networkId,
      filterId: selected?.id,
      root: selected?.root,
    }
    if (
      !autoApply ||
      selected === undefined ||
      // The tab just created its first filter: nothing to apply
      previous.filterId === undefined ||
      previous.networkId !== networkId ||
      (previous.filterId === selected.id && previous.root === selected.root)
    ) {
      return
    }
    const filterId = selected.id
    const timer = setTimeout(() => {
      setStatus(formatApplyStatus(applyWorkspaceFilter(networkId, filterId)))
    }, AUTO_APPLY_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on what the user changed; autoApply is read, not a trigger
  }, [networkId, selected?.id, selected?.root])

  const warnings = useMemo(
    () =>
      selected === undefined || tables === undefined
        ? new Map<string, string[]>()
        : warningsByPath(
            validateFilter(selected.root, tables.nodeTable, tables.edgeTable),
          ),
    [selected, tables],
  )

  if (selected === undefined) {
    return <Box data-testid="filter-tab" />
  }

  const context: ConditionEditorContext | undefined =
    network === undefined || tables === undefined
      ? undefined
      : {
          root: selected.root,
          network,
          nodeTable: tables.nodeTable,
          edgeTable: tables.edgeTable,
          warnings,
          onRootChange: (root) => setRoot(selected.id, root),
        }

  return (
    <Box
      data-testid="filter-tab"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ p: 1, backgroundColor: 'background.default' }}>
        <FilterHeader filters={filters} selected={selected} />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1 }}>
        {context === undefined ? (
          <Typography
            variant="body2"
            color="text.secondary"
            data-testid="filter-no-network"
            sx={{ p: 1 }}
          >
            Open a network to edit and apply filters.
          </Typography>
        ) : (
          <ConditionList parent={selected.root} path={[]} context={context} />
        )}
      </Box>
      <ApplyPanel
        displayMode={selected.displayMode}
        autoApply={autoApply}
        status={
          // A filter without conditions asks for one, whether or not it was
          // applied (a fresh start, the last condition removed); a filter
          // with conditions shows the result of the last run, if any
          selected.root.children.length === 0
            ? EMPTY_FILTER_STATUS
            : status === EMPTY_FILTER_STATUS
              ? undefined
              : status
        }
        disabled={context === undefined}
        onDisplayModeChange={(displayMode) =>
          setStatus(
            formatApplyStatus(
              setWorkspaceFilterDisplayModeAndApply(
                networkId,
                selected.id,
                displayMode,
              ),
            ),
          )
        }
        onAutoApplyChange={(next) => setAutoApply(networkId, next)}
        onApply={apply}
      />
    </Box>
  )
}
