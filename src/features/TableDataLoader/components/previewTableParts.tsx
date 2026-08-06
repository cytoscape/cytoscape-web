import { IconAlertCircle, IconSettings } from '@tabler/icons-react'
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Popover,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { KeyboardEvent, MouseEvent, ReactNode, useState } from 'react'

/** Row shape produced by Papa.parse with headers. */
export type ParsedRow = Record<string, any>

// The import preview renders a plain MUI table (the former primereact
// DataTable brought a virtual scroller); capping the rendered rows keeps
// large files fast while every row still participates in validation/join
// logic, which runs on the full data set.
export const PREVIEW_ROW_LIMIT = 500

export const InfoAlert = ({ children }: { children: ReactNode }) => (
  <Alert severity="info" sx={{ mb: 2 }}>
    {children}
  </Alert>
)

/**
 * Column header for the preview table: column name, an invalid-values
 * warning, and the current type/meaning summary; clicking opens a popover
 * with the column editors.
 */
export function ColumnHeaderEditor(props: {
  name: string
  invalidValueCount: number
  invalidValueMessage: string
  summary: ReactNode
  onOpen: () => void
  children: ReactNode
}) {
  const {
    name,
    invalidValueCount,
    invalidValueMessage,
    summary,
    onOpen,
    children,
  } = props
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        aria-label={`Edit column ${name}`}
        sx={{ minWidth: 200, cursor: 'pointer' }}
        onClick={(event: MouseEvent<HTMLElement>) => {
          onOpen()
          setAnchorEl(event.currentTarget)
        }}
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen()
            setAnchorEl(event.currentTarget)
          }
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: 'text.secondary' }}
          >
            {name}
          </Typography>
          {invalidValueCount > 0 ? (
            <Tooltip title={invalidValueMessage}>
              <IconAlertCircle size={20} color="red" />
            </Tooltip>
          ) : null}
        </Stack>
        <Stack sx={{ mt: 1, alignItems: 'flex-start' }}>{summary}</Stack>
      </Box>
      <Popover
        open={anchorEl !== null}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ zIndex: 2001 }}
      >
        <Box sx={{ p: 2 }}>{children}</Box>
      </Popover>
    </>
  )
}

/** The tabular data preview, replacing the primereact DataTable. */
export function PreviewDataTable(props: {
  rows: ParsedRow[]
  columnNames: string[]
  height: number
  renderHeader: (columnIndex: number) => ReactNode
  renderCell: (columnIndex: number, row: ParsedRow, rowIndex: number) => ReactNode
}) {
  const { rows, columnNames, height, renderHeader, renderCell } = props
  const visibleRows = rows.slice(0, PREVIEW_ROW_LIMIT)

  return (
    <>
      <TableContainer
        sx={{
          maxHeight: height,
          minWidth: '50rem',
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columnNames.map((name, i) => (
                <TableCell key={name} sx={{ verticalAlign: 'top' }}>
                  {renderHeader(i)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                sx={{
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                {columnNames.map((name, i) => (
                  <TableCell key={name} sx={{ py: 0.25 }}>
                    {renderCell(i, row, rowIndex)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length > PREVIEW_ROW_LIMIT ? (
        <Typography variant="caption" color="text.secondary">
          Showing the first {PREVIEW_ROW_LIMIT} of {rows.length} rows; all rows
          are imported.
        </Typography>
      ) : null}
    </>
  )
}

export interface ParseSettingsState {
  fileDelimiter: string
  setFileDelimiter: (value: string) => void
  customFileDelimiter: string
  setCustomFileDelimiter: (value: string) => void
  decimalDelimiter: string
  setDecimalDelimiter: (value: string) => void
  customDecimalDelimiter: string
  setCustomDecimalDelimiter: (value: string) => void
  useFirstRowAsColumns: boolean
  setUseFirstRowAsColumns: (value: boolean) => void
  skipNLines: number
  setSkipNLines: (value: number) => void
}

/** The shared "Advanced Settings" popover of the two table-import wizards. */
export function AdvancedParseSettings(props: {
  testId?: string
  state: ParseSettingsState
}) {
  const { testId, state } = props
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const radioRow = (value: string, label: string) => (
    <FormControlLabel
      key={value}
      value={value}
      control={<Radio size="small" />}
      label={label}
    />
  )

  return (
    <>
      <Button
        data-testid={testId}
        variant="outlined"
        startIcon={<IconSettings />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        Advanced Settings
      </Button>
      <Popover
        open={anchorEl !== null}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ zIndex: 2001 }}
      >
        <Box sx={{ p: 2, width: 450 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              File Delimiter
            </Typography>
            <RadioGroup
              row
              value={state.fileDelimiter}
              onChange={(event) => {
                state.setFileDelimiter(event.target.value)
                if (event.target.value !== 'custom') {
                  state.setCustomFileDelimiter('')
                }
              }}
            >
              {radioRow('auto', 'Auto-detect')}
              {radioRow(',', 'Comma (,)')}
              {radioRow(';', 'Semicolon (;)')}
              {radioRow('|', 'Pipe (|)')}
              {radioRow('tab', 'Tab')}
              {radioRow('space', 'Space')}
              {radioRow('custom', 'Custom')}
            </RadioGroup>
            {state.fileDelimiter === 'custom' && (
              <TextField
                label="Custom File Delimiter"
                value={state.customFileDelimiter}
                onChange={(event) => {
                  const val = event.currentTarget.value
                  if (val.length <= 1) state.setCustomFileDelimiter(val)
                }}
                placeholder="Enter a single character"
                size="small"
                sx={{ mt: 1 }}
                error={state.customFileDelimiter.length !== 1}
                helperText={
                  state.customFileDelimiter.length !== 1
                    ? 'Please enter a single character.'
                    : undefined
                }
              />
            )}
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              Decimal Delimiter
            </Typography>
            <RadioGroup
              row
              value={state.decimalDelimiter}
              onChange={(event) =>
                state.setDecimalDelimiter(event.target.value)
              }
            >
              {radioRow('.', 'Dot (e.g. 1.23)')}
              {radioRow(',', 'Comma (e.g. 1,23)')}
              {radioRow('custom', 'Custom')}
            </RadioGroup>
            {state.decimalDelimiter === 'custom' && (
              <TextField
                label="Custom Decimal Delimiter"
                value={state.customDecimalDelimiter}
                onChange={(event) => {
                  const val = event.currentTarget.value
                  if (val.length <= 1) state.setCustomDecimalDelimiter(val)
                }}
                placeholder="Enter a single character"
                size="small"
                sx={{ mt: 1 }}
                error={state.customDecimalDelimiter.length !== 1}
                helperText={
                  state.customDecimalDelimiter.length !== 1
                    ? 'Please enter a single character.'
                    : undefined
                }
              />
            )}
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              Table Structure
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={state.useFirstRowAsColumns}
                  onChange={(event) =>
                    state.setUseFirstRowAsColumns(event.target.checked)
                  }
                />
              }
              label="Use first row as column names"
            />
            <TextField
              type="number"
              inputProps={{ min: 0 }}
              size="small"
              label="Skip first N lines"
              value={state.skipNLines}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10)
                // Clamp: a negative skip would make slice() take rows from
                // the END of the file instead of skipping none.
                state.setSkipNLines(
                  Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
                )
              }}
              sx={{ mt: 1, display: 'block' }}
            />
          </Box>
        </Box>
      </Popover>
    </>
  )
}
