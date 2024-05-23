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
} from '@mantine/core'

import Papa from 'papaparse'

import 'primereact/resources/themes/md-light-indigo/theme.css'
import { DataTable, DataTableValue } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { useContext, useEffect, useState } from 'react'

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
import { validateColumnValues } from '../../model/impl/ParseValues'
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

export function TableColumnAssignmentForm(props: BaseMenuProps) {
  const text = useCreateNetworkFromTableStore((state) => state.rawText)
  const setShow = useCreateNetworkFromTableStore((state) => state.setShow)
  const setRawText = useCreateNetworkFromTableStore((state) => state.setRawText)
  const reset = useCreateNetworkFromTableStore((state) => state.reset)

  const [loading, setLoading] = useState(false)

  const [validColumnTypes, setValidColumnAssignmentTypes] = useState<
    ColumnAssignmentType[]
  >(Object.values(ColumnAssignmentType))
  const [validValueTypeNames, setValidValueTypeNames] = useState<
    ValueTypeName[]
  >(Object.values(ValueTypeName))

  const [skipNLines, setSkipNLines] = useState(0)
  const [useFirstRowAsColumns, setUseFirstRowAsColumns] = useState(true)

  const [rows, setRows] = useState<DataTableValue[]>([])
  const [columns, setColumns] = useState<ColumnAssignmentState[]>([])

  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
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

    // setRows(result.data as DataTableValue[]);
    // const headers = result.meta.fields ?? Object.keys(result.data[0] as { [s: string]: string });
    let headers: string[]
    if (useFirstRowAsColumns) {
      headers = result.meta.fields as string[]
      setRows(rows as DataTableValue[])
      const nextColumns = headers.map((c, i) => {
        return {
          ...{
            meaning: ColumnAssignmentType.EdgeAttribute,
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
  }, [skipNLines, useFirstRowAsColumns])

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

  const handleConfirm = async () => {
    const res = createNetworkFromTableData(rows, columns)

    const { network, nodeTable, edgeTable, visualStyle, summary, networkView } =
      res
    const newNetworkId = network.id

    setLoading(true)

    await putNetworkSummaryToDb(summary)

    // TODO the db syncing logic in various stores assumes the updated network is the current network
    // therefore, as a temporary fix, the first operation that should be done is to set the
    // current network to be the new network id
    setCurrentNetworkId(newNetworkId)
    addNewNetwork(network)
    setVisualStyle(newNetworkId, visualStyle)
    setTables(newNetworkId, nodeTable, edgeTable)
    setViewModel(newNetworkId, networkView)
    addNetworkToWorkspace(newNetworkId)
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
    (c) => c.invalidValues.length === 0,
  )

  const submitDisabled = !(
    rowValuesAreValid &&
    (tgtNodeCol !== undefined || srcNodeCol !== undefined)
  )

  return (
    <Box style={{ zIndex: 2001 }}>
      <Group justify="flex-end">
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
      <Space h="lg" />

      <DataTable
        value={rows as DataTableValue[]}
        stripedRows
        showGridlines
        size="small"
        tableStyle={{ minWidth: '50rem' }}
        scrollable
        scrollHeight="400px"
        height={450}
        virtualScrollerOptions={{ itemSize: 10, delay: 50 }}
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
                        {h.invalidValues.length > 0 ? (
                          <Tooltip
                            zIndex={2001}
                            label={`Column '${h.name}' has ${h.invalidValues.length} values that cannot be parsed as type ${valueTypeName2Label[h.dataType]}`}
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
      <Space h="lg" />
      {srcNodeCol === undefined && tgtNodeCol === undefined ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          One column must be assigned as a source or target node
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
      {loading ? (
        <Alert mb="lg" variant="light" color="blue" icon={<IconInfoCircle />}>
          Creating network. Large networks may take up to a few minutes...
        </Alert>
      ) : null}
      <Group justify="space-between">
        <Popover
          withinPortal={false}
          zIndex={2001}
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
            color="red"
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
