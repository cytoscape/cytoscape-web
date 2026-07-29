import React from 'react'
import { GridColumnIcon } from '@glideapps/glide-data-grid'
import orderBy from 'lodash/orderBy'
import { Table, ValueType, ValueTypeName } from '../../../models/TableModel'
import { Network } from '../../../models/NetworkModel'
import { TableDisplayConfiguration, ColumnConfiguration } from '../../../models/VisualStyleModel/VisualStyleOptions'
import { getElementId, ID_COLUMN_ID, ID_COLUMN_TITLE } from '../idColumn'
import { SortType } from '../../../models/TableModel/impl/valueTypeImpl'
import { TableBrowserTab } from '../components/TableBrowserTabs'

export interface UseTableDataProps {
  currentTabIndex: number
  nodeTable: Table | undefined
  edgeTable: Table | undefined
  network: Network | undefined
  tableDisplayConfiguration: TableDisplayConfiguration | undefined
  selectedNodes: string[]
  selectedEdges: string[]
}

export const useTableData = ({
  currentTabIndex,
  nodeTable,
  edgeTable,
  network,
  tableDisplayConfiguration,
  selectedNodes,
  selectedEdges,
}: UseTableDataProps) => {
  const currentTable = currentTabIndex === TableBrowserTab.NODES ? nodeTable : edgeTable
  const selectedElements = currentTabIndex === TableBrowserTab.NODES ? selectedNodes : selectedEdges

  const isNodeTable = currentTable === nodeTable
  const currentTableConfig = isNodeTable
    ? tableDisplayConfiguration?.nodeTable
    : tableDisplayConfiguration?.edgeTable

  const [sort, setSort] = React.useState<SortType>({
    column: undefined,
    direction: undefined,
    valueType: undefined,
  })

  // Initialize sort state from tableDisplayConfiguration
  React.useEffect(() => {
    if (currentTableConfig?.sortColumn && currentTableConfig?.sortDirection) {
      const sortColumn = currentTable?.columns?.find(
        (c) => c.name === currentTableConfig.sortColumn,
      )

      setSort({
        column: currentTableConfig.sortColumn,
        direction: currentTableConfig.sortDirection === 'ascending' ? 'asc' : 'desc',
        valueType: sortColumn?.type ?? ValueTypeName.String,
      })
    }
  }, [tableDisplayConfiguration, currentTabIndex, currentTable, currentTableConfig])

  // Get configuration columns or fallback to table columns
  const modelColumns = React.useMemo(() => {
    if (currentTableConfig && currentTableConfig.columnConfiguration) {
      return currentTableConfig.columnConfiguration.filter((col) => col.visible)
    }
    return (
      currentTable?.columns?.map((col) => ({
        attributeName: col.name,
        visible: true,
        columnWidth: undefined,
      })) ?? []
    )
  }, [currentTableConfig, currentTable])

  const columns = React.useMemo(
    () =>
      modelColumns.map((col, index) => {
        const columnType = currentTable?.columns?.find(
          (c) => c?.name === col?.attributeName,
        )?.type

        const attributeName = col?.attributeName ?? ''
        const resolvedType = columnType ?? ValueTypeName.String

        // No data type badge in the header: the name gets the whole width, and
        // the type is one hover away (see TableHeaderTooltip). `type` is still
        // carried on the column for the tooltip, sorting and editing.
        const baseColumn = {
          id: attributeName,
          title: attributeName,
          type: resolvedType,
          index,
        }

        // Omitting `width` makes this a glide AutoGridColumn: the grid measures
        // the header and a sample of the cell content on the canvas and sizes
        // the column to fit, bounded by the min/max in TableGrid. A width the
        // user dragged is stored as `columnWidth` and always wins.
        return col?.columnWidth !== undefined
          ? { ...baseColumn, width: col.columnWidth }
          : baseColumn
      }),
    [modelColumns, currentTable],
  )

  const nodeNameMap = React.useMemo(() => {
    const map = new Map<string, string>()
    if (nodeTable) {
      nodeTable.rows.forEach((nodeData, nodeId) => {
        const nodeName =
          (nodeData.name as string) ||
          (nodeData.label as string) ||
          (nodeData.nodeLabel as string) ||
          (nodeData.displayName as string) ||
          (nodeData.title as string) ||
          nodeId.toString()
        map.set(nodeId.toString(), nodeName)
      })
    }
    return map
  }, [nodeTable])

  const virtualColumns = React.useMemo(() => {
    if (currentTabIndex !== TableBrowserTab.EDGES) {
      return []
    }

    return [
      {
        id: '__sourceNodeName',
        title: 'Source Node',
        icon: GridColumnIcon.ProtectedColumnOverlay,
        style: 'highlight' as const,
        type: ValueTypeName.String,
        index: 0,
        // No width: node names vary wildly in length, so let the grid measure.
        isVirtual: true,
        getValue: (edgeData: any) => {
          const edgeId = edgeData?.id?.toString()
          const edge = network?.edges?.find((e: any) => e.id?.toString() === edgeId)
          const sourceId = edge?.s?.toString()
          return sourceId ? nodeNameMap.get(sourceId) || `Node ${sourceId}` : ''
        },
      },
      {
        id: '__targetNodeName',
        title: 'Target Node',
        icon: GridColumnIcon.ProtectedColumnOverlay,
        style: 'highlight' as const,
        type: ValueTypeName.String,
        index: 1,
        isVirtual: true,
        getValue: (edgeData: any) => {
          const edgeId = edgeData?.id?.toString()
          const edge = network?.edges?.find((e: any) => e.id?.toString() === edgeId)
          const targetId = edge?.t?.toString()
          return targetId ? nodeNameMap.get(targetId) || `Node ${targetId}` : ''
        },
      },
    ]
  }, [currentTabIndex, nodeNameMap, network])

  const idColumn = React.useMemo(
    () => ({
      id: ID_COLUMN_ID,
      title: ID_COLUMN_TITLE,
      icon: GridColumnIcon.ProtectedColumnOverlay,
      style: 'highlight' as const,
      type: ValueTypeName.String,
      index: 0,
      width: 120,
      isVirtual: true,
      getValue: (dataRow: any) => getElementId(dataRow),
    }),
    [],
  )

  const allColumns = React.useMemo(
    () =>
      currentTabIndex === TableBrowserTab.EDGES
        ? [idColumn, ...virtualColumns, ...columns]
        : [idColumn, ...columns],
    [currentTabIndex, idColumn, virtualColumns, columns],
  )

  const rowsWithIds = React.useMemo(() => {
    return Array.from((currentTable?.rows ?? new Map()).entries()).map(
      ([key, value]) => ({ ...value, id: key }),
    )
  }, [currentTable])

  const rows = React.useMemo(() => {
    const selectedElementsSet = new Set(selectedElements)
    let result =
      selectedElements?.length > 0
        ? rowsWithIds.filter((r) => selectedElementsSet.has(r.id))
        : rowsWithIds

    if (sort.column != null && sort.direction != null && sort.valueType != null) {
      if (sort.column === '__sourceNodeName' || sort.column === '__targetNodeName') {
        result = orderBy(
          result,
          (o) => {
            if (sort.column === '__sourceNodeName') {
              const sourceId = (o as any).s?.toString()
              return sourceId ? nodeNameMap.get(sourceId) || `Node ${sourceId}` : ''
            } else if (sort.column === '__targetNodeName') {
              const targetId = (o as any).t?.toString()
              return targetId ? nodeNameMap.get(targetId) || `Node ${targetId}` : ''
            }
            return ''
          },
          sort.direction,
        )
      } else if (sort.column === ID_COLUMN_ID) {
        result = orderBy(result, (o) => getElementId(o), sort.direction)
      } else {
        result = orderBy(
          result,
          (o) => (o as Record<string, ValueType>)[sort.column as string] as ValueType,
          sort.direction,
        )
      }
    }

    return result
  }, [selectedElements, rowsWithIds, sort, nodeNameMap])


  const createUpdatedTableDisplayConfiguration = React.useCallback(
    (updates: {
      columnConfiguration?: ColumnConfiguration[]
      sortColumn?: string
      sortDirection?: 'ascending' | 'descending'
    }) => {
      const isNodeTable = currentTable === nodeTable
      // Temporary fix: create default config from table columns if tableDisplayConfiguration is missing
      const defaultNodeConfig = {
        columnConfiguration:
          nodeTable?.columns?.map((col) => ({
            attributeName: col.name,
            visible: true,
            columnWidth: undefined,
          })) ?? [],
        sortColumn: undefined,
        sortDirection: undefined,
      }
      const defaultEdgeConfig = {
        columnConfiguration:
          edgeTable?.columns?.map((col) => ({
            attributeName: col.name,
            visible: true,
            columnWidth: undefined,
          })) ?? [],
        sortColumn: undefined,
        sortDirection: undefined,
      }
      const currentConfig = isNodeTable
        ? (tableDisplayConfiguration?.nodeTable ?? defaultNodeConfig)
        : (tableDisplayConfiguration?.edgeTable ?? defaultEdgeConfig)
      const otherConfig = isNodeTable
        ? (tableDisplayConfiguration?.edgeTable ?? defaultEdgeConfig)
        : (tableDisplayConfiguration?.nodeTable ?? defaultNodeConfig)

      const updatedConfig = {
        ...currentConfig,
        ...updates,
      }

      return isNodeTable
        ? {
            nodeTable: updatedConfig as any,
            edgeTable: otherConfig as any,
          }
        : {
            nodeTable: otherConfig as any,
            edgeTable: updatedConfig as any,
          }
    },
    [tableDisplayConfiguration, currentTable, nodeTable, edgeTable],
  )

  return {
    currentTable,
    createUpdatedTableDisplayConfiguration,
    sort,
    setSort,
    allColumns,
    columns,
    idColumn,
    virtualColumns,
    rows,
    selectedElements,
  }
}
