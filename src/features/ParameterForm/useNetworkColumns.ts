import { useMemo } from 'react'

import { useTableStore } from '../../data/hooks/stores/TableStore'
import { IdType } from '../../models/IdType'
import { Column } from '../../models/TableModel'

export interface NetworkColumns {
  nodeColumns: readonly Column[]
  edgeColumns: readonly Column[]
}

const NO_COLUMNS: readonly Column[] = []

/**
 * The node and edge columns of one network, for `nodeColumn` /
 * `edgeColumn` parameters. Empty lists when there is no network or no
 * table yet. Edge columns come from the edge table — the service-app dialog
 * used to read the node table for both.
 */
export const useNetworkColumns = (networkId?: IdType): NetworkColumns => {
  const record = useTableStore((state) =>
    networkId === undefined || networkId === ''
      ? undefined
      : state.tables?.[networkId],
  )
  return useMemo(
    () => ({
      nodeColumns: record?.nodeTable?.columns ?? NO_COLUMNS,
      edgeColumns: record?.edgeTable?.columns ?? NO_COLUMNS,
    }),
    [record],
  )
}
