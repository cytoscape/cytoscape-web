import {
  Text,
  Group,
  SegmentedControl,
  Space,
  NumberInput,
  List,
  Box,
  Checkbox,
  Select,
  Button,
  Popover,
  Tooltip,
  Divider,
  Alert,
  Switch,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconInfoCircle,
  IconSettings,
} from '@tabler/icons-react'
import Papa from 'papaparse'
import { Column } from 'primereact/column'
import { Column as CyWebColumn } from '../../../../models/TableModel'
import { DataTableValue, DataTable } from 'primereact/datatable'
import { useState, useEffect } from 'react'
import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'
import { ValueTypeName } from '../../../../models/TableModel'
import { ColumnAppendState } from '../../model/ColumnAppendState'
import { ColumnAppendType } from '../../model/ColumnAppendType'
import { DelimiterType } from '../../model/DelimiterType'
import {
  unselectAllColumns,
  selectAllColumns,
  validValueTypesCapt,
  updateColumnAppend,
  validColumnAppendTypes,
  updateColumnAppendType,
  joinRowsToTable,
  validNetworkKeyColumns,
  findValidRowsToJoin,
} from '../../model/impl/JoinTableToNetwork'
import {
  generateInferredColumnAppend,
  validateColumnValues,
} from '../../model/impl/ParseValues'
import { ValueTypeNameRender, ValueTypeForm } from '../ValueTypeNameForm'
import { ColumnAppendTypeRender, ColumnAppendForm } from './ColumnAppendForm'
import { useJoinTableToNetworkStore } from '../../store/joinTableToNetworkStore'
import { valueTypeName2Label } from '../../model/impl/CreateNetworkFromTable'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import { useTableStore } from '../../../../store/TableStore'
import { useUiStateStore } from '../../../../store/UiStateStore'

export function TableColumnAppendForm(props: BaseMenuProps) {
  const [loading, setLoading] = useState(false)
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const activeTableIndex = useUiStateStore(
    (state) => state.ui.tableUi.activeTabIndex,
  )
  const setNetworkModified = useWorkspaceStore(
    (state) => state.setNetworkModified,
  )
  const table = useTableStore((state) => state.tables[currentNetworkId])
  const setTable = useTableStore((state) => state.setTable)
  const nodeTable = table?.nodeTable
  const edgeTable = table?.edgeTable

  const rawText = useJoinTableToNetworkStore((state) => state.rawText)
  const reset = useJoinTableToNetworkStore((state) => state.reset)

  const [tableToAppend, setTableToAppend] = useState<'node' | 'edge'>(
    activeTableIndex === 0 || activeTableIndex === 2 ? 'node' : 'edge',
  )
  const [caseSensitiveKeyValues, setCaseSensitiveKeyValues] = useState(true)
  const [networkKeyColumn, setNetworkKeyColumn] = useState<
    CyWebColumn | undefined
  >(undefined)

  const [validColumnTypes, setValidColumnAppendTypes] = useState<
    ColumnAppendType[]
  >(Object.values(ColumnAppendType))
  const [validValueTypeNames, setValidValueTypeNames] = useState<
    ValueTypeName[]
  >(Object.values(ValueTypeName))

  const [skipNLines, setSkipNLines] = useState(0)
  const [useFirstRowAsColumns, setUseFirstRowAsColumns] = useState(true)

  const [rows, setRows] = useState<DataTableValue[]>(() => {
    const result = Papa.parse(rawText, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
    })
    let headers: string[] = []
    headers = result.meta.fields as string[]
    return result.data as DataTableValue[]
  })
  const [columns, setColumns] = useState<ColumnAppendState[]>(() => {
    const result = Papa.parse(rawText, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
    })
    let headers: string[] = []
    headers = result.meta.fields as string[]
    const nextColumns = generateInferredColumnAppend(rows as DataTableValue[])

    return nextColumns
  })

  // const setTables = useJoinTableToNetworkStore((state) => state.setTables)

  const onColumnAppendTypeChange = (index: number, value: ColumnAppendType) => {
    const nextValidVtns = validValueTypesCapt(value)
    setValidValueTypeNames(nextValidVtns)
    const nextColumns = updateColumnAppend(value, index, columns)

    setColumns(nextColumns)
  }

  const onValueTypeChange = (
    index: number,
    value: ValueTypeName,
    delimiter?: DelimiterType,
  ) => {
    const nextValidCats = validColumnAppendTypes(value)
    setValidColumnAppendTypes(nextValidCats)
    const nextColumns = updateColumnAppendType(value, index, columns, delimiter)

    nextColumns[index].invalidValues = validateColumnValues(
      nextColumns[index],
      rows,
    )

    setColumns(nextColumns)
  }

  const handleConfirm = () => {
    setLoading(true)
    const table = tableToAppend === 'node' ? nodeTable : edgeTable
    if (networkKeyColumn != null) {
      const nextTable = joinRowsToTable(
        table,
        rows as DataTableValue[],
        columns,
        networkKeyColumn,
      )
      setTable(currentNetworkId, tableToAppend, nextTable)
    }
    setNetworkModified(currentNetworkId, true)
    setLoading(false)
    reset()
    props.handleClose()
  }

  const handleSelectNoneClick = () => {
    const newColumns = unselectAllColumns(columns)

    setColumns(newColumns)
  }

  const handleSelectAllClick = () => {
    const newColumns = selectAllColumns(columns)

    setColumns(newColumns)
  }

  const handleCancel = () => {
    reset()
    props.handleClose()
  }

  const handleColumnClick = (column: ColumnAppendState) => {
    const { meaning, dataType } = column
    setValidColumnAppendTypes(validColumnAppendTypes(dataType))
    setValidValueTypeNames(validValueTypesCapt(meaning))
  }

  const keyCol = columns.find((c) => c.meaning === ColumnAppendType.Key)

  const selectedTable = tableToAppend === 'node' ? nodeTable : edgeTable

  useEffect(() => {
    const table = tableToAppend === 'node' ? nodeTable : edgeTable

    const nextKeyColumn = validNetworkKeyColumns(table.columns)[0] ?? null
    setNetworkKeyColumn(nextKeyColumn)
  }, [tableToAppend])

  useEffect(() => {
    if (rawText === '') {
      return
    }
    const result = Papa.parse(rawText, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
    })
    const rows = result.data.slice(skipNLines + (useFirstRowAsColumns ? 0 : 1))

    let headers: string[]
    if (useFirstRowAsColumns) {
      headers = result.meta.fields as string[]
      setRows(rows as DataTableValue[])
      const nextColumns = headers.map((c, i) => {
        return {
          ...(columns[i] ?? {}),
          name: headers[i],
        }
      })

      setColumns(nextColumns)
    } else {
      headers = Object.keys(result.data[0] as { [s: string]: string }).map(
        (h, i) => `Column ${i + 1}`,
      )
      const nextColumns = headers.map((c, i) => {
        return {
          ...(columns[i] ?? {}),
          name: headers[i],
        }
      })

      setColumns(nextColumns)
      const nextRows = (rows as string[][]).map(
        (r: string[]): DataTableValue => {
          const rowData: Record<string, string> = {}
          headers.forEach((h: string, j: number) => {
            rowData[h] = r[j]
          })
          return rowData as DataTableValue
        },
      )

      setRows(nextRows)
    }
  }, [rawText, skipNLines, useFirstRowAsColumns])

  const columnsToImport = columns.filter(
    (c) => c.meaning !== ColumnAppendType.NotImported,
  )

  const rowValuesAreValid = columnsToImport.every(
    (c) => c.invalidValues.length === 0,
  )
  const networkHasKeyColumns =
    validNetworkKeyColumns(selectedTable?.columns).length > 0
  const submitDisabled = !(
    rowValuesAreValid &&
    keyCol !== undefined &&
    networkHasKeyColumns
  )

  const rowsToJoin = findValidRowsToJoin(
    tableToAppend === 'node' ? nodeTable : edgeTable,
    rows,
    keyCol,
    networkKeyColumn,
  )

  return (
    <Box style={{ zIndex: 2001 }}>
      <Group>
        <Text w={200}>Import data as</Text>
        <SegmentedControl
          value={tableToAppend}
          onChange={(e) => setTableToAppend(e as 'node' | 'edge')}
          data={[
            { label: 'Node table columns', value: 'node' },
            { label: 'Edge table columns', value: 'edge' },
          ]}
        />
      </Group>
      <Group>
        <Text w={200}>Key Column for Network</Text>
        <Select
          comboboxProps={{ zIndex: 2002, withinPortal: false }}
          allowDeselect={false}
          data={validNetworkKeyColumns(selectedTable?.columns).map(
            (c) => c.name,
          )}
          value={networkKeyColumn?.name ?? null}
          onChange={(value) =>
            setNetworkKeyColumn(
              selectedTable?.columns.find((c) => c.name === value) ?? undefined,
            )
          }
        ></Select>
      </Group>
      <Group>
        <Text w={200}>Case sensitive key values</Text>
        <Checkbox
          checked={caseSensitiveKeyValues}
          onChange={(event) =>
            setCaseSensitiveKeyValues(event.currentTarget.checked)
          }
        />
      </Group>
      <Group justify="flex-end">
        <Button
          size="compact-xs"
          variant="default"
          disabled={columns.every(
            (c) => c.meaning !== ColumnAppendType.NotImported,
          )}
          onClick={() => handleSelectAllClick()}
        >
          Select All
        </Button>

        <Button
          size="compact-xs"
          variant="default"
          disabled={columns.every(
            (c) => c.meaning === ColumnAppendType.NotImported,
          )}
          onClick={() => handleSelectNoneClick()}
        >
          Select None
        </Button>
      </Group>
      <Space h="lg" />

      <DataTable
        value={rows as DataTableValue[]}
        stripedRows
        showGridlines
        size="small"
        tableStyle={{ minWidth: '50rem' }}
        scrollable
        scrollHeight="350px"
        virtualScrollerOptions={{ itemSize: 10 }}
      >
        {columns.map((h, i) => {
          return (
            <Column
              key={h.name}
              field={h.name}
              body={(value, opts) => {
                const { rowIndex } = opts
                const c = columns[i]
                const valueIsInvalid = c.invalidValues.includes(rowIndex)
                const willBeJoined = rowsToJoin.includes(rowIndex)
                return (
                  <Text
                    size="xs"
                    fw={willBeJoined ? 900 : 500}
                    c={
                      valueIsInvalid
                        ? 'red'
                        : willBeJoined
                          ? '#4f4949'
                          : '#a39c9c'
                    }
                  >
                    {value[h.name]}
                  </Text>
                )
              }}
              header={
                <Popover
                  zIndex={999999}
                  position="bottom"
                  withArrow
                  arrowSize={20}
                  shadow="md"
                >
                  <Popover.Target>
                    <Box style={{ minWidth: 200 }}>
                      <Group>
                        <Text size="sm" c="gray" fw={500}>
                          {h.name}
                        </Text>
                        {h.invalidValues.length > 0 ? (
                          <Tooltip
                            label={`Column '${h.name}' has ${
                              h.invalidValues.length
                            } values that cannot be parsed as type ${
                              valueTypeName2Label[h.dataType]
                            }`}
                          >
                            <IconAlertCircle size={20} color="red" />
                          </Tooltip>
                        ) : null}
                      </Group>
                      <Space h="sm" />
                      <Box onClick={() => handleColumnClick(h)}>
                        <Button.Group ml={1} orientation="vertical">
                          <ValueTypeNameRender value={h.dataType} />
                          <ColumnAppendTypeRender value={h.meaning} />
                        </Button.Group>
                      </Box>
                    </Box>
                  </Popover.Target>
                  <Popover.Dropdown bg="var(--mantine-color-body)">
                    <Box>
                      <Box>
                        <Text size={'xs'}>Meaning</Text>
                        <Space h="xs" />
                        <ColumnAppendForm
                          value={h.meaning}
                          onChange={(value) =>
                            onColumnAppendTypeChange(i, value)
                          }
                          validValues={validColumnTypes}
                        />
                      </Box>
                      <Divider my="md" />
                      <Box>
                        <Text size={'xs'}>Data Type</Text>
                        <Space h="xs" />
                        <ValueTypeForm
                          value={h.dataType}
                          delimiter={h.delimiter}
                          onChange={(value, delimiter) =>
                            onValueTypeChange(i, value, delimiter)
                          }
                          validValues={validValueTypeNames}
                        />
                      </Box>
                    </Box>
                  </Popover.Dropdown>
                </Popover>
              }
            ></Column>
          )
        })}
      </DataTable>
      <Space h="lg" />
      {keyCol === undefined ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          One column must be assigned as the key column to join the data onto
          the table
        </Alert>
      ) : null}
      {columnsToImport.some((c) => c.invalidValues.length > 0) ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          {`The following columns have values that cannot be parsed as their assigned data type: ${columns
            .filter((c) => c.invalidValues.length > 0)
            .map((c) => `'${c.name}'`)
            .join(', ')}`}
        </Alert>
      ) : null}
      {!networkHasKeyColumns ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          {`The network doesn't have any columns that can be used as a key column to join the data onto the table.  Please select a column to use as the key column`}
        </Alert>
      ) : null}

      {rowsToJoin.length > 0 ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          {`${rowsToJoin.length} / ${rows.length} rows will be joined to the table`}
        </Alert>
      ) : null}

      {loading ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          Creating network. Large networks may take up to a few minutes...
        </Alert>
      ) : null}

      <Group justify="space-between">
        <Popover
          zIndex={2001}
          withinPortal={false}
          width={300}
          position="right"
          withArrow
          shadow="lg"
        >
          <Popover.Target>
            <Button variant="default" leftSection={<IconSettings />}>
              Advanced Settings
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Switch
              label="Use first row as column names"
              checked={useFirstRowAsColumns}
              onChange={(event) =>
                setUseFirstRowAsColumns(event.currentTarget.checked)
              }
            />
            <NumberInput
              min={0}
              size="sm"
              label="Skip first N lines"
              value={skipNLines}
              onChange={(value) => setSkipNLines(Number(value))}
            />
          </Popover.Dropdown>
        </Popover>
        <Group justify="space-between" gap="lg">
          <Button
            disabled={loading}
            variant="default"
            color="primary"
            onClick={() => handleCancel()}
          >
            Cancel
          </Button>
          <Tooltip
            disabled={!submitDisabled}
            label="All row values must be valid for it's corrensponding data type.  One column must be assigned as a source or target node"
          >
            <Button
              styles={(theme) => ({
                root: {
                  color: '#FFFFFF',
                  backgroundColor: '#337ab7',
                  '&:hover': {
                    backgroundColor: '#285a9b',
                  },
                },
              })}
              loading={loading}
              disabled={submitDisabled}
              onClick={() => handleConfirm()}
            >
              Confirm
            </Button>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  )
}
