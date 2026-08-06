import {
  Box,
  Button,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import Papa from 'papaparse'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { putNetworkSummaryToDb } from '../../../../data/db'
import { useUrlNavigation } from '../../../../data/hooks/navigation/useUrlNavigation'
import { useNetworkStore } from '../../../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { ValueTypeName } from '../../../../models/TableModel'
import { BaseMenuItemProps } from '../../../ToolBar/BaseMenuItemProps'
import { ColumnAssignmentState } from '../../model/ColumnAssignmentState'
import { ColumnAssignmentType } from '../../model/ColumnAssignmentType'
import { DelimiterType } from '../../model/DelimiterType'
import {
  createNetworkFromTableData,
  DEFAULT_COLUMN_DATA_TYPE,
  DEFAULT_COLUMN_MEANING,
  selectAllColumns,
  unselectAllColumns,
  updateColumnAssignment,
  updateColumnType,
  validColumnAssignmentTypes,
  validValueTypes,
} from '../../model/impl/CreateNetworkFromTable'
import { valueTypeNameLabel as valueTypeName2Label } from '../../../../models/TableModel/impl/valueTypeNameDisplay'
import {
  convertFileDelimiterToEffective,
  convertFileDelimiterToStorageValue,
} from '../../model/impl/DelimiterUtils'
import {
  generateInferredColumnAssignment,
  validateColumnValues,
} from '../../model/impl/ParseValues'
import { useCreateNetworkFromTableStore } from '../../store/createNetworkFromTableStore'
import {
  AdvancedParseSettings,
  ColumnHeaderEditor,
  InfoAlert,
  ParsedRow,
  PreviewDataTable,
} from '../previewTableParts'
import { ValueTypeForm, ValueTypeNameRender } from '../ValueTypeNameForm'
import {
  ColumnAssignmentTypeForm,
  ColumnAssignmentTypeRender,
} from './ColumnMeaningForm'
import { NetworkNameInput } from './NetworkNameInput'

export function TableColumnAssignmentForm(props: BaseMenuItemProps) {
  const text = useCreateNetworkFromTableStore((state) => state.rawText)
  const setShow = useCreateNetworkFromTableStore((state) => state.setShow)
  const setRawText = useCreateNetworkFromTableStore((state) => state.setRawText)
  const reset = useCreateNetworkFromTableStore((state) => state.reset)
  const name = useCreateNetworkFromTableStore((state) => state.name)
  const options = useCreateNetworkFromTableStore((state) => state.options)
  const setOptions = useCreateNetworkFromTableStore((state) => state.setOptions)
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

  // File delimiter state
  const [fileDelimiter, setFileDelimiter] = useState<string>(() => {
    const delim = options.delimiter
    if (!delim || delim === ',') return 'auto'
    if (delim === '\t') return 'tab'
    if (delim === ' ') return 'space'
    return delim
  })
  const [customFileDelimiter, setCustomFileDelimiter] = useState<string>('')
  const effectiveFileDelimiter = convertFileDelimiterToEffective(
    fileDelimiter,
    customFileDelimiter,
  )

  const [rows, setRows] = useState<ParsedRow[]>(() => {
    const result = Papa.parse(text, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
      delimiter: effectiveFileDelimiter,
    })
    return (result.data as ParsedRow[]).map((row) => {
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
    const nextColumns = generateInferredColumnAssignment(rows as ParsedRow[])

    return nextColumns
  })

  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

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

  // Re-parse only when parse options change, merging the user's existing column
  // assignments. `columns` must stay out of the deps: the effect calls setColumns
  // with fresh identities, so adding it would loop and clobber user edits.
  useEffect(() => {
    const result = Papa.parse(text, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
      delimiter: effectiveFileDelimiter,
    })
    // A blank-lines-only file parses to zero rows; the headerless branch
    // below would then call Object.keys(result.data[0]) on undefined.
    if (result.data.length === 0) {
      setRows([])
      setColumns([])
      return
    }
    const rows = result.data.slice(skipNLines)
    let headers: string[]
    if (useFirstRowAsColumns) {
      headers = result.meta.fields as string[]
      const transformedRows = (rows as ParsedRow[]).map((row) => {
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
      setRows(transformedRows)

      const nextColumns = headers.map((c, i) => {
        const existingColumn = columns[i] ?? {}
        return {
          ...existingColumn,
          name: headers[i],
          dataType: existingColumn.dataType ?? DEFAULT_COLUMN_DATA_TYPE,
          meaning: existingColumn.meaning ?? DEFAULT_COLUMN_MEANING,
          invalidValues: existingColumn.invalidValues ?? [],
        }
      })

      // Validate columns after updating to populate invalidValues
      const validatedColumns = nextColumns.map((col) => ({
        ...col,
        invalidValues: validateColumnValues(col, transformedRows),
      }))

      setColumns(validatedColumns)
    } else {
      headers = Object.keys(result.data[0] as { [s: string]: string }).map(
        (h, i) => `Column ${i + 1}`,
      )
      const nextColumns = headers.map((c, i) => {
        const existingColumn = columns[i] ?? {}
        return {
          ...existingColumn,
          name: headers[i],
          dataType: existingColumn.dataType ?? DEFAULT_COLUMN_DATA_TYPE,
          meaning: existingColumn.meaning ?? DEFAULT_COLUMN_MEANING,
          invalidValues: existingColumn.invalidValues ?? [],
        }
      })

      setColumns(nextColumns)
      const nextRows = (rows as string[][]).map((r: string[]): ParsedRow => {
        const rowData: Record<string, string> = {}
        headers.forEach((h: string, j: number) => {
          rowData[h] = r[j]
        })
        return rowData as ParsedRow
      })
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

      // Validate columns after rows are updated
      const validatedColumns = nextColumns.map((col) => ({
        ...col,
        invalidValues: validateColumnValues(col, nextRows),
      }))

      setColumns(validatedColumns)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-parse on option change only; adding columns would loop
  }, [
    skipNLines,
    useFirstRowAsColumns,
    decimalDelimiter,
    customDecimalDelimiter,
    effectiveFileDelimiter,
    text,
  ])

  // Update store when delimiter changes
  useEffect(() => {
    const delimiterValue = convertFileDelimiterToStorageValue(
      fileDelimiter,
      customFileDelimiter,
    )
    setOptions({ delimiter: delimiterValue })
  }, [fileDelimiter, customFileDelimiter, setOptions])

  const onColumnAssignmentTypeChange = useCallback(
    (index: number, value: ColumnAssignmentType) => {
      const nextValidVtns = validValueTypes(value)
      setValidValueTypeNames(nextValidVtns)
      const nextColumns = updateColumnAssignment(value, index, columns)

      setColumns(nextColumns)
    },
    [columns],
  )

  const onValueTypeChange = useCallback(
    (index: number, value: ValueTypeName, delimiter?: DelimiterType) => {
      const nextValidCats = validColumnAssignmentTypes(value)
      setValidColumnAssignmentTypes(nextValidCats)
      const nextColumns = updateColumnType(value, index, columns, delimiter)

      nextColumns[index].invalidValues = validateColumnValues(
        nextColumns[index],
        rows,
      )

      setColumns(nextColumns)
    },
    [columns, rows],
  )

  const handleConfirm = useCallback(async () => {
    const res = createNetworkFromTableData(rows, columns, undefined, name)

    const { cyNetwork, summary } = res
    const {
      network,
      nodeTable,
      edgeTable,
      visualStyle,
      networkViews,
      visualStyleOptions,
    } = cyNetwork
    const networkView = networkViews[0]
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
    props.onClick()
  }, [
    rows,
    columns,
    name,
    addSummary,
    setVisualStyleOptions,
    addNewNetwork,
    setVisualStyle,
    setTables,
    setViewModel,
    addNetworkToWorkspace,
    setCurrentNetworkId,
    navigateToNetwork,
    workspace.id,
    reset,
    props,
  ])

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

  const handleColumnClick = useCallback((column: ColumnAssignmentState) => {
    const { meaning, dataType } = column
    setValidColumnAssignmentTypes(validColumnAssignmentTypes(dataType))
    setValidValueTypeNames(validValueTypes(meaning))
  }, [])

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
      <PreviewDataTable
        rows={rows}
        columnNames={columns.map((c) => c.name)}
        height={400}
        renderHeader={(i) => {
          const h = columns[i]
          return (
            <ColumnHeaderEditor
              name={h.name}
              invalidValueCount={h.invalidValues?.length ?? 0}
              invalidValueMessage={`Column '${h.name}' has ${h.invalidValues?.length} values that cannot be parsed as type ${valueTypeName2Label(h.dataType)}`}
              summary={
                <>
                  <ValueTypeNameRender value={h.dataType} />
                  <ColumnAssignmentTypeRender value={h.meaning} />
                </>
              }
              onOpen={() => handleColumnClick(h)}
            >
              <Box>
                <Typography variant="caption">Meaning</Typography>
                <Box sx={{ mt: 1 }}>
                  <ColumnAssignmentTypeForm
                    value={h.meaning}
                    onChange={(value) => onColumnAssignmentTypeChange(i, value)}
                    validValues={validColumnTypes}
                  />
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption">Data Type</Typography>
                <Box sx={{ mt: 1 }}>
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
            </ColumnHeaderEditor>
          )
        }}
        renderCell={(i, row, rowIndex) => {
          const h = columns[i]
          const valueIsInvalid = h.invalidValues?.includes(rowIndex) ?? false
          return (
            <Typography
              variant="caption"
              sx={{ color: valueIsInvalid ? 'red' : '#a39c9c' }}
            >
              {row[h.name]}
            </Typography>
          )
        }}
      />
    ),
    [
      columns,
      rows,
      validColumnTypes,
      validValueTypeNames,
      onColumnAssignmentTypeChange,
      onValueTypeChange,
      handleColumnClick,
    ],
  )

  return (
    <Box sx={{ zIndex: 2001 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <NetworkNameInput />
        <Stack direction="row" spacing={1}>
          <Button
            data-testid="table-column-assignment-select-all-button"
            size="small"
            variant="outlined"
            disabled={columns.every(
              (c) => c.meaning !== ColumnAssignmentType.NotImported,
            )}
            onClick={() => handleSelectAllClick()}
          >
            Select All
          </Button>

          <Button
            data-testid="table-column-assignment-select-none-button"
            size="small"
            variant="outlined"
            disabled={columns.every(
              (c) => c.meaning === ColumnAssignmentType.NotImported,
            )}
            onClick={() => handleSelectNoneClick()}
          >
            Select None
          </Button>
        </Stack>
      </Stack>
      <Box sx={{ height: 20 }} />
      {table}
      <Box sx={{ height: 20 }} />
      {srcNodeCol === undefined && tgtNodeCol === undefined ? (
        <InfoAlert>
          One column must be assigned as a source or target node
        </InfoAlert>
      ) : null}
      {columnsToImport.some((c) => c.invalidValues?.length > 0) ? (
        <InfoAlert>
          {`The following columns have values that cannot be parsed as their assigned data type: ${columns
            .filter((c) => c.invalidValues?.length > 0)
            .map((c) => `'${c.name}'`)
            .join(', ')}`}
        </InfoAlert>
      ) : null}
      {loading ? (
        <InfoAlert>
          Creating network. Large networks may take up to a few minutes...
        </InfoAlert>
      ) : null}
      <Stack direction="row" justifyContent="space-between">
        <AdvancedParseSettings
          testId="table-column-assignment-advanced-settings-button"
          state={{
            fileDelimiter,
            setFileDelimiter,
            customFileDelimiter,
            setCustomFileDelimiter,
            decimalDelimiter,
            setDecimalDelimiter,
            customDecimalDelimiter,
            setCustomDecimalDelimiter,
            useFirstRowAsColumns,
            setUseFirstRowAsColumns,
            skipNLines,
            setSkipNLines,
          }}
        />
        <Stack direction="row" spacing={2}>
          <Button
            data-testid="table-column-assignment-cancel-button"
            disabled={loading}
            variant="outlined"
            onClick={() => handleCancel()}
          >
            Cancel
          </Button>
          <Tooltip
            title={
              submitDisabled
                ? 'All row values must be valid for their corresponding data type. One column must be assigned as a source or target node.'
                : ''
            }
          >
            <span>
              <Button
                data-testid="table-column-assignment-confirm-button"
                variant="contained"
                disabled={submitDisabled || loading}
                onClick={() => handleConfirm()}
              >
                Confirm
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  )
}
