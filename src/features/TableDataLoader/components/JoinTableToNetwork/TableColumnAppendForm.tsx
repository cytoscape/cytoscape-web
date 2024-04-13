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
import { validateColumnValues } from '../../model/impl/ParseValues'
import { ValueTypeNameRender, ValueTypeForm } from '../ValueTypeNameForm'
import { ColumnAppendTypeRender, ColumnAppendForm } from './ColumnAppendForm'
import { useJoinTableToNetworkStore } from '../../store/joinTableToNetworkStore'
import { valueTypeName2Label } from '../../model/impl/CreateNetworkFromTable'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import { useTableStore } from '../../../../store/TableStore'
import { useUiStateStore } from '../../../../store/UiStateStore'

export function TableColumnAppendForm(props: BaseMenuProps) {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const activeTableIndex = useUiStateStore(
    (state) => state.ui.tableUi.activeTabIndex,
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

  const [rows, setRows] = useState<DataTableValue[]>([])
  const [columns, setColumns] = useState<ColumnAppendState[]>([])

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
    const table = tableToAppend === 'node' ? nodeTable : edgeTable
    if (networkKeyColumn != null) {
      const nextTable = joinRowsToTable(
        table,
        rows as DataTableValue[],
        columns,
        networkKeyColumn,
      )
      setTable(currentNetworkId, tableToAppend, nextTable)
      reset()
      props.handleClose()
    }
    // join table
    // table = joinTable(...)
    // setTable(table)
    // close modal
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
    const result = Papa.parse(rawText, { header: useFirstRowAsColumns })
    const rows = result.data.slice(skipNLines + (useFirstRowAsColumns ? 0 : 1))

    // setRows(result.data as DataTableValue[]);
    // const headers = result.meta.fields ?? Object.keys(result.data[0] as { [s: string]: string });
    let headers: string[]
    if (useFirstRowAsColumns) {
      headers = result.meta.fields as string[]
      setRows(rows as DataTableValue[])
      const nextColumns = headers.map((c, i) => {
        return {
          ...{
            meaning: ColumnAppendType.Attribute,
            dataType: ValueTypeName.String,
            invalidValues: [],
          },
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

  const rowValuesAreValid = columns
    .filter((c) => c.meaning !== ColumnAppendType.NotImported)
    .every((c) => c.invalidValues.length === 0)
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
        <Text>Import data as</Text>
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
        <Text>Case sensitive key values</Text>
        <Checkbox
          checked={caseSensitiveKeyValues}
          onChange={(event) =>
            setCaseSensitiveKeyValues(event.currentTarget.checked)
          }
        />
      </Group>
      <Group>
        <Text>Network Key Column</Text>
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
        scrollHeight="300px"
        height={300}
        virtualScrollerOptions={{ itemSize: 10, delay: 50 }}
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
                  zIndex={2001}
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
                        {h.invalidValues.length > 1 ? (
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
      {columns.some((c) => c.invalidValues.length > 1) ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          {`The following columns have values that cannot be parsed as their assigned data type: ${columns
            .filter((c) => c.invalidValues.length > 1)
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
          <Button variant="default" color="red" onClick={() => handleCancel()}>
            Cancel
          </Button>
          <Tooltip
            disabled={!submitDisabled}
            label="All row values must be valid for it's corrensponding data type.  One column must be assigned as a source or target node"
          >
            <Button disabled={submitDisabled} onClick={() => handleConfirm()}>
              Confirm
            </Button>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  )
}
