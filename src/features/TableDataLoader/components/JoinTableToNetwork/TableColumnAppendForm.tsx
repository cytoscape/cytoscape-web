import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import Papa from 'papaparse'
import { useEffect, useState } from 'react'

import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import {
  Column as CyWebColumn,
  ValueTypeName,
} from '../../../../models/TableModel'
import { BaseMenuItemProps } from '../../../ToolBar/BaseMenuItemProps'
import { ColumnAppendState } from '../../model/ColumnAppendState'
import { ColumnAppendType } from '../../model/ColumnAppendType'
import { DelimiterType } from '../../model/DelimiterType'
import { valueTypeNameLabel as valueTypeName2Label } from '../../../../models/TableModel/impl/valueTypeNameDisplay'
import {
  convertFileDelimiterToEffective,
  convertFileDelimiterToStorageValue,
} from '../../model/impl/DelimiterUtils'
import {
  findValidRowsToJoin,
  joinRowsToTable,
  selectAllColumns,
  unselectAllColumns,
  updateColumnAppend,
  updateColumnAppendType,
  validColumnAppendTypes,
  validNetworkKeyColumns,
  validValueTypesCapt,
} from '../../model/impl/JoinTableToNetwork'
import {
  generateInferredColumnAppend,
  validateColumnValues,
} from '../../model/impl/ParseValues'
import { useJoinTableToNetworkStore } from '../../store/joinTableToNetworkStore'
import {
  AdvancedParseSettings,
  ColumnHeaderEditor,
  InfoAlert,
  ParsedRow,
  PreviewDataTable,
} from '../previewTableParts'
import { ValueTypeForm, ValueTypeNameRender } from '../ValueTypeNameForm'
import { ColumnAppendForm, ColumnAppendTypeRender } from './ColumnAppendForm'

export function TableColumnAppendForm(props: BaseMenuItemProps) {
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
  const options = useJoinTableToNetworkStore((state) => state.options)
  const setOptions = useJoinTableToNetworkStore((state) => state.setOptions)

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
    const result = Papa.parse(rawText, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
      delimiter: effectiveFileDelimiter,
    })
    // Transform decimal delimiter if needed
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
  const [columns, setColumns] = useState<ColumnAppendState[]>(() => {
    const nextColumns = generateInferredColumnAppend(rows as ParsedRow[])

    return nextColumns
  })

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
        rows as ParsedRow[],
        columns,
        networkKeyColumn,
      )
      setTable(currentNetworkId, tableToAppend, nextTable)
    }
    setNetworkModified(currentNetworkId, true)
    setLoading(false)
    reset()
    props.onClick()
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
    props.onClick()
  }

  const handleColumnClick = (column: ColumnAppendState) => {
    const { meaning, dataType } = column
    setValidColumnAppendTypes(validColumnAppendTypes(dataType))
    setValidValueTypeNames(validValueTypesCapt(meaning))
  }

  const keyCol = columns.find((c) => c.meaning === ColumnAppendType.Key)

  const selectedTable = tableToAppend === 'node' ? nodeTable : edgeTable

  // Re-derive the default key column only when the node/edge target toggles.
  // Including nodeTable/edgeTable would overwrite the user's manually selected
  // key column whenever the tables mutate.
  useEffect(() => {
    const table = tableToAppend === 'node' ? nodeTable : edgeTable

    const nextKeyColumn = validNetworkKeyColumns(table.columns)[0] ?? null
    setNetworkKeyColumn(nextKeyColumn)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on node/edge toggle; tables would reset user's key choice
  }, [tableToAppend])

  // Re-parse only when parse options change, merging the user's existing column
  // choices. `columns` must stay out of the deps: the effect calls setColumns
  // with fresh identities, so adding it would loop.
  useEffect(() => {
    if (rawText === '') {
      return
    }
    const result = Papa.parse(rawText, {
      header: useFirstRowAsColumns,
      skipEmptyLines: true,
      delimiter: effectiveFileDelimiter,
    })
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
          dataType: existingColumn.dataType ?? ValueTypeName.String,
          meaning: existingColumn.meaning ?? ColumnAppendType.Attribute,
          invalidValues: existingColumn.invalidValues ?? [],
          rowsToJoin: existingColumn.rowsToJoin ?? [],
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
          dataType: existingColumn.dataType ?? ValueTypeName.String,
          meaning: existingColumn.meaning ?? ColumnAppendType.Attribute,
          invalidValues: existingColumn.invalidValues ?? [],
          rowsToJoin: existingColumn.rowsToJoin ?? [],
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
    rawText,
    skipNLines,
    useFirstRowAsColumns,
    decimalDelimiter,
    customDecimalDelimiter,
    effectiveFileDelimiter,
  ])

  // Update store when delimiter changes
  useEffect(() => {
    const delimiterValue = convertFileDelimiterToStorageValue(
      fileDelimiter,
      customFileDelimiter,
    )
    setOptions({ delimiter: delimiterValue })
  }, [fileDelimiter, customFileDelimiter, setOptions])

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
    <Box sx={{ zIndex: 2001 }}>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center">
          <Typography sx={{ width: 200 }}>Import data as</Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={tableToAppend}
            onChange={(_, value) => {
              if (value !== null) {
                setTableToAppend(value as 'node' | 'edge')
              }
            }}
          >
            <ToggleButton value="node">Node table columns</ToggleButton>
            <ToggleButton value="edge">Edge table columns</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Stack direction="row" alignItems="center">
          <Typography sx={{ width: 200 }}>Key Column for Network</Typography>
          <Select
            size="small"
            sx={{ minWidth: 200 }}
            value={networkKeyColumn?.name ?? ''}
            onChange={(event) =>
              setNetworkKeyColumn(
                selectedTable?.columns.find(
                  (c) => c.name === event.target.value,
                ) ?? undefined,
              )
            }
          >
            {validNetworkKeyColumns(selectedTable?.columns).map((c) => (
              <MenuItem key={c.name} value={c.name}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </Stack>
        <Stack direction="row" alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={caseSensitiveKeyValues}
                onChange={(event) =>
                  setCaseSensitiveKeyValues(event.target.checked)
                }
              />
            }
            label="Case sensitive key values"
            labelPlacement="start"
            sx={{ ml: 0, '& .MuiFormControlLabel-label': { width: 200 } }}
          />
        </Stack>
      </Stack>
      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button
          data-testid="table-column-append-select-all-button"
          size="small"
          variant="outlined"
          disabled={columns.every(
            (c) => c.meaning !== ColumnAppendType.NotImported,
          )}
          onClick={() => handleSelectAllClick()}
        >
          Select All
        </Button>

        <Button
          data-testid="table-column-append-select-none-button"
          size="small"
          variant="outlined"
          disabled={columns.every(
            (c) => c.meaning === ColumnAppendType.NotImported,
          )}
          onClick={() => handleSelectNoneClick()}
        >
          Select None
        </Button>
      </Stack>
      <Box sx={{ height: 20 }} />

      <PreviewDataTable
        rows={rows}
        columnNames={columns.map((c) => c.name)}
        height={350}
        renderHeader={(i) => {
          const h = columns[i]
          return (
            <ColumnHeaderEditor
              name={h.name}
              invalidValueCount={h.invalidValues.length}
              invalidValueMessage={`Column '${h.name}' has ${h.invalidValues.length} values that cannot be parsed as type ${valueTypeName2Label(h.dataType)}`}
              summary={
                <>
                  <ValueTypeNameRender value={h.dataType} />
                  <ColumnAppendTypeRender value={h.meaning} />
                </>
              }
              onOpen={() => handleColumnClick(h)}
            >
              <Box>
                <Typography variant="caption">Meaning</Typography>
                <Box sx={{ mt: 1 }}>
                  <ColumnAppendForm
                    value={h.meaning}
                    onChange={(value) => onColumnAppendTypeChange(i, value)}
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
          const c = columns[i]
          const valueIsInvalid = c.invalidValues?.includes(rowIndex) ?? false
          const willBeJoined = rowsToJoin.includes(rowIndex)
          return (
            <Typography
              variant="caption"
              sx={{
                fontWeight: willBeJoined ? 900 : 500,
                color: valueIsInvalid
                  ? 'red'
                  : willBeJoined
                    ? '#4f4949'
                    : '#a39c9c',
              }}
            >
              {row[c.name]}
            </Typography>
          )
        }}
      />
      <Box sx={{ height: 20 }} />
      {keyCol === undefined ? (
        <InfoAlert>
          One column must be assigned as the key column to join the data onto
          the table
        </InfoAlert>
      ) : null}
      {columnsToImport.some((c) => c.invalidValues.length > 0) ? (
        <InfoAlert>
          {`The following columns have values that cannot be parsed as their assigned data type: ${columns
            .filter((c) => c.invalidValues.length > 0)
            .map((c) => `'${c.name}'`)
            .join(', ')}`}
        </InfoAlert>
      ) : null}
      {!networkHasKeyColumns ? (
        <InfoAlert>
          {`The network doesn't have any columns that can be used as a key column to join the data onto the table.  Please select a column to use as the key column`}
        </InfoAlert>
      ) : null}

      {rowsToJoin.length > 0 ? (
        <InfoAlert>
          {`${rowsToJoin.length} / ${rows.length} rows will be joined to the table`}
        </InfoAlert>
      ) : null}

      {loading ? (
        <InfoAlert>
          Joining table data. Large tables may take up to a few minutes...
        </InfoAlert>
      ) : null}

      <Stack direction="row" justifyContent="space-between">
        <AdvancedParseSettings
          testId="table-column-append-advanced-settings-button"
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
            data-testid="table-column-append-cancel-button"
            disabled={loading}
            variant="outlined"
            onClick={() => handleCancel()}
          >
            Cancel
          </Button>
          <Tooltip
            title={
              submitDisabled
                ? 'All row values must be valid for their corresponding data type. One column must be assigned as the key column.'
                : ''
            }
          >
            <span>
              <Button
                data-testid="table-column-append-confirm-button"
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
