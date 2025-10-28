import {
  Center,
  Button,
  Title,
  Text,
  Space,
  Box,
  Popover,
  Divider,
  Group,
  Tooltip,
  Alert,
  Switch,
  NumberInput,
  Select,
  TextInput,
  Radio,
  Group as MantineGroup,
} from '@mantine/core'

import Papa from 'papaparse'

import 'primereact/resources/themes/md-light-indigo/theme.css'
import { DataTable, DataTableValue } from 'primereact/datatable'
import { Column } from 'primereact/column'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { ValueTypeForm, ValueTypeNameRender } from '../ValueTypeNameForm'
import {
  ColumnAssignmentTypeForm,
  ColumnAssignmentTypeRender,
} from './ColumnMeaningForm'
import {
  IconAlertCircle,
  IconInfoCircle,
  IconSettings,
} from '@tabler/icons-react'
import { ValueTypeName } from '../../../../models/TableModel'
import { ColumnAssignmentState } from '../../model/ColumnAssignmentState'
import { ColumnAssignmentType } from '../../model/ColumnAssignmentType'
import { DelimiterType } from '../../model/DelimiterType'
import {
  validValueTypes,
  updateColumnAssignment,
  validColumnAssignmentTypes,
  updateColumnType,
  createNetworkFromTableData,
  unselectAllColumns,
  selectAllColumns,
  valueTypeName2Label,
} from '../../model/impl/CreateNetworkFromTable'
import {
  generateInferredColumnAssignment,
  validateColumnValues,
} from '../../model/impl/ParseValues'
import {
  CreateNetworkFromTableStep,
  useCreateNetworkFromTableStore,
} from '../../store/createNetworkFromTableStore'
import { putNetworkSummaryToDb } from '../../../../store/persist/db'
import { useNetworkStore } from '../../../../store/NetworkStore'
import { useTableStore } from '../../../../store/TableStore'
import { useViewModelStore } from '../../../../store/ViewModelStore'
import { useVisualStyleStore } from '../../../../store/VisualStyleStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'
import { AppConfigContext } from '../../../../AppConfigContext'
import { NetworkNameInput } from './NetworkNameInput'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { useNetworkSummaryStore } from '../../../../store/NetworkSummaryStore'
import { useUrlNavigation } from '../../../../store/hooks/useUrlNavigation/useUrlNavigation'

export function TableColumnAssignmentForm(props: BaseMenuProps) {
  const text = useCreateNetworkFromTableStore((state) => state.rawText)
  const setShow = useCreateNetworkFromTableStore((state) => state.setShow)
  const setRawText = useCreateNetworkFromTableStore((state) => state.setRawText)
  const reset = useCreateNetworkFromTableStore((state) => state.reset)
  const name = useCreateNetworkFromTableStore((state) => state.name)
  const addSummary = useNetworkSummaryStore((state) => state.add)
  const [loading, setLoading] = useState(false)
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)

  const [validColumnTypes, setValidColumnAssignmentTypes] = useState<
    ColumnAssignmentType[]
  >(Object.values(ColumnAssignmentType))
  const [validValueTypeNames, setValidValueTypeNames] = useState<
    ValueTypeName[]
  >(Object.values(ValueTypeName))

  const [skipNLines, setSkipNLines] = useState(0)
  const [useFirstRowAsColumns, setUseFirstRowAsColumns] = useState(true)
  const [decimalDelimiter, setDecimalDelimiter] = useState<string>('.')
  const [customDecimalDelimiter, setCustomDecimalDelimiter] =
    useState<string>('')
  const effectiveDecimalDelimiter =
    decimalDelimiter === 'custom' && customDecimalDelimiter
      ? customDecimalDelimiter
      : decimalDelimiter

  const [rows, setRows] = useState<DataTableValue[]>(() => {
    const result = Papa.parse(text, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
    })
    let headers: string[] = []
    headers = result.meta.fields as string[]
    return (result.data as DataTableValue[]).map((row) => {
      if (effectiveDecimalDelimiter && effectiveDecimalDelimiter !== '.') {
        const newRow: Record<string, any> = {}
        for (const key in row) {
          if (
            typeof row[key] === 'string' &&
            row[key].includes(effectiveDecimalDelimiter)
          ) {
            newRow[key] = row[key].replace(effectiveDecimalDelimiter, '.')
          } else {
            newRow[key] = row[key]
          }
        }
        return newRow
      }
      return row
    })
  })
  const [columns, setColumns] = useState<ColumnAssignmentState[]>(() => {
    const result = Papa.parse(text, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
    })
    let headers: string[] = []
    headers = result.meta.fields as string[]
    const nextColumns = generateInferredColumnAssignment(
      rows as DataTableValue[],
    )

    return nextColumns
  })

  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const ui = useUiStateStore((state) => state.ui)
  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )

  const addNewNetwork = useNetworkStore((state) => state.add)

  const setVisualStyle = useVisualStyleStore((state) => state.add)

  const setViewModel = useViewModelStore((state) => state.add)

  const setTables = useTableStore((state) => state.add)

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const { maxNetworkElementsThreshold } = useContext(AppConfigContext)

  useEffect(() => {
    const result = Papa.parse(text, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
    })
    const rows = result.data.slice(skipNLines + (useFirstRowAsColumns ? 0 : 1))
    let headers: string[]
    if (useFirstRowAsColumns) {
      headers = result.meta.fields as string[]
      setRows(
        (rows as DataTableValue[]).map((row) => {
          if (effectiveDecimalDelimiter && effectiveDecimalDelimiter !== '.') {
            const newRow: Record<string, any> = {}
            for (const key in row) {
              if (
                typeof row[key] === 'string' &&
                row[key].includes(effectiveDecimalDelimiter)
              ) {
                newRow[key] = row[key].replace(effectiveDecimalDelimiter, '.')
              } else {
                newRow[key] = row[key]
              }
            }
            return newRow
          }
          return row
        }),
      )
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
      setRows(
        nextRows.map((row) => {
          if (effectiveDecimalDelimiter && effectiveDecimalDelimiter !== '.') {
            const newRow: Record<string, any> = {}
            for (const key in row) {
              if (
                typeof row[key] === 'string' &&
                row[key].includes(effectiveDecimalDelimiter)
              ) {
                newRow[key] = row[key].replace(effectiveDecimalDelimiter, '.')
              } else {
                newRow[key] = row[key]
              }
            }
            return newRow
          }
          return row
        }),
      )
    }
  }, [
    skipNLines,
    useFirstRowAsColumns,
    decimalDelimiter,
    customDecimalDelimiter,
  ])

  const onColumnAssignmentTypeChange = (
    index: number,
    value: ColumnAssignmentType,
  ) => {
    const nextValidVtns = validValueTypes(value)
    setValidValueTypeNames(nextValidVtns)
    const nextColumns = updateColumnAssignment(value, index, columns)

    setColumns(nextColumns)
  }

  const onValueTypeChange = (
    index: number,
    value: ValueTypeName,
    delimiter?: DelimiterType,
  ) => {
    const nextValidCats = validColumnAssignmentTypes(value)
    setValidColumnAssignmentTypes(nextValidCats)
    const nextColumns = updateColumnType(value, index, columns, delimiter)

    nextColumns[index].invalidValues = validateColumnValues(
      nextColumns[index],
      rows,
    )

    setColumns(nextColumns)
  }

  const handleConfirm = useCallback(async () => {
    const res = createNetworkFromTableData(rows, columns, undefined, name)

    const {
      network,
      nodeTable,
      edgeTable,
      visualStyle,
      summary,
      networkView,
      visualStyleOptions,
    } = res
    const newNetworkId = network.id

    setLoading(true)

    await putNetworkSummaryToDb(summary)

    addSummary(newNetworkId, summary)
    setVisualStyleOptions(newNetworkId, visualStyleOptions)
    addNewNetwork(network)
    setVisualStyle(newNetworkId, visualStyle)
    setTables(newNetworkId, nodeTable, edgeTable)
    setViewModel(newNetworkId, networkView)
    addNetworkToWorkspace(newNetworkId)

    setCurrentNetworkId(newNetworkId)

    navigateToNetwork({
      workspaceId: workspace.id,
      networkId: newNetworkId,
      searchParams: new URLSearchParams(location.search),
      replace: false,
    })

    setLoading(false)
    reset()
    props.handleClose()
  }, [rows, columns, name])

  const handleSelectNoneClick = () => {
    const newColumns = unselectAllColumns(columns)

    setColumns(newColumns)
  }

  const handleSelectAllClick = () => {
    const newColumns = selectAllColumns(columns)

    setColumns(newColumns)
  }

  const handleCancel = () => {
    setShow(false)
    setRawText('')
  }

  const handleColumnClick = (column: ColumnAssignmentState) => {
    const { meaning, dataType } = column
    setValidColumnAssignmentTypes(validColumnAssignmentTypes(dataType))
    setValidValueTypeNames(validValueTypes(meaning))
  }

  const tgtNodeCol = columns.find(
    (c) => c.meaning === ColumnAssignmentType.TargetNode,
  )
  const srcNodeCol = columns.find(
    (c) => c.meaning === ColumnAssignmentType.SourceNode,
  )

  const columnsToImport = columns.filter(
    (c) => c.meaning !== ColumnAssignmentType.NotImported,
  )

  const rowValuesAreValid = columnsToImport.every(
    (c) => c.invalidValues?.length === 0,
  )

  const submitDisabled = !(
    rowValuesAreValid &&
    (tgtNodeCol !== undefined || srcNodeCol !== undefined)
  )

  const table = useMemo(
    () => (
      <DataTable
        value={rows as DataTableValue[]}
        stripedRows
        showGridlines
        size="small"
        tableStyle={{ minWidth: '50rem' }}
        scrollable
        scrollHeight="400px"
        virtualScrollerOptions={{
          itemSize: 10,
        }}
      >
        {columns.map((h, i) => {
          return (
            <Column
              key={h.name}
              field={h.name}
              body={(value, opts) => {
                const { rowIndex } = opts
                const valueIsInvalid =
                  columns[i].invalidValues.includes(rowIndex)
                return (
                  <Text size="xs" c={valueIsInvalid ? 'red' : '#a39c9c'}>
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
                        {h.invalidValues?.length > 0 ? (
                          <Tooltip
                            zIndex={2001}
                            label={`Column '${h.name}' has ${h.invalidValues?.length} values that cannot be parsed as type ${valueTypeName2Label[h.dataType]}`}
                          >
                            <IconAlertCircle size={20} color="red" />
                          </Tooltip>
                        ) : null}
                      </Group>
                      <Space h="sm" />
                      <Box onClick={() => handleColumnClick(h)}>
                        <Button.Group ml={1} orientation="vertical">
                          <ValueTypeNameRender value={h.dataType} />
                          <ColumnAssignmentTypeRender value={h.meaning} />
                        </Button.Group>
                      </Box>
                    </Box>
                  </Popover.Target>
                  <Popover.Dropdown bg="var(--mantine-color-body)">
                    <Box>
                      <Box>
                        <Text size={'xs'}>Meaning</Text>
                        <Space h="xs" />
                        <ColumnAssignmentTypeForm
                          value={h.meaning}
                          onChange={(value) =>
                            onColumnAssignmentTypeChange(i, value)
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
    ),
    [columns, rows],
  )

  return (
    <Box style={{ zIndex: 2001 }}>
      <Group justify="space-between">
        <NetworkNameInput />
        <Group>
          <Button
            size="compact-xs"
            variant="default"
            disabled={columns.every(
              (c) => c.meaning !== ColumnAssignmentType.NotImported,
            )}
            onClick={() => handleSelectAllClick()}
          >
            Select All
          </Button>

          <Button
            size="compact-xs"
            variant="default"
            disabled={columns.every(
              (c) => c.meaning === ColumnAssignmentType.NotImported,
            )}
            onClick={() => handleSelectNoneClick()}
          >
            Select None
          </Button>
        </Group>
      </Group>
      <Space h="lg" />
      {table}
      <Space h="lg" />
      {srcNodeCol === undefined && tgtNodeCol === undefined ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          One column must be assigned as a source or target node
        </Alert>
      ) : null}
      {columnsToImport.some((c) => c.invalidValues?.length > 0) ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          {`The following columns have values that cannot be parsed as their assigned data type: ${columns
            .filter((c) => c.invalidValues?.length > 0)
            .map((c) => `'${c.name}'`)
            .join(', ')}`}
        </Alert>
      ) : null}
      {loading ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          Creating network. Large networks may take up to a few minutes...
        </Alert>
      ) : null}
      <Group justify="space-between">
        <Popover
          withinPortal={false}
          zIndex={2001}
          width={450}
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
            <Box mb="md">
              <Text fw={500} size="sm" mb={4}>
                Decimal Delimiter
              </Text>
              <Radio.Group
                value={decimalDelimiter}
                onChange={setDecimalDelimiter}
                size="sm"
              >
                <MantineGroup gap="xs">
                  <Radio value="." label="Dot (e.g. 1.23)" />
                  <Radio value="," label="Comma (e.g. 1,23)" />
                  <Radio value="custom" label="Custom" />
                </MantineGroup>
              </Radio.Group>
              {decimalDelimiter === 'custom' && (
                <TextInput
                  label="Custom Decimal Delimiter"
                  value={customDecimalDelimiter}
                  onChange={(event) => {
                    const val = event.currentTarget.value
                    if (val.length <= 1) setCustomDecimalDelimiter(val)
                  }}
                  placeholder="Enter a single character"
                  size="sm"
                  mt="xs"
                  error={
                    decimalDelimiter === 'custom' &&
                    customDecimalDelimiter.length !== 1
                      ? 'Please enter a single character.'
                      : undefined
                  }
                />
              )}
            </Box>
            <Divider my="sm" />
            <Box mb="md">
              <Text fw={500} size="sm" mb={4}>
                Table Structure
              </Text>
              <Switch
                label="Use first row as column names"
                checked={useFirstRowAsColumns}
                onChange={(event) =>
                  setUseFirstRowAsColumns(event.currentTarget.checked)
                }
                mb="xs"
              />
              <NumberInput
                min={0}
                size="sm"
                label="Skip first N lines"
                value={skipNLines}
                onChange={(value) => setSkipNLines(Number(value))}
                mt="xs"
              />
            </Box>
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
            zIndex={2001}
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
