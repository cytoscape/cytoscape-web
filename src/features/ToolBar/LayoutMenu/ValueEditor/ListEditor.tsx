import EditIcon from '@mui/icons-material/Edit'
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  ListItem,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { ValueType, ValueTypeName } from '../../../../models/TableModel'
import { ListValueEditorDialog } from '../../../TableBrowser/ListValueEditorDialog'

interface ListEditorProps {
  optionName: string
  description: string
  valueType: ValueTypeName
  value: ValueType
  setValue: (optionName: string, value: ValueType) => void
  typeLabel?: string
  typeColor:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
  tableLayout?: boolean
  error?: boolean
}

// Human-readable one-line summary of the current list, shown in the read-only
// trigger field. The actual editing happens in ListValueEditorDialog (CW-563).
const summarizeList = (value: ValueType): string => {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((v) => String(v)).join(', ')
  }
  return ''
}

/**
 * Editor for list-typed values (CW-563).
 *
 * Previously this rendered a single comma-separated TextField, which could not
 * represent strings containing commas and silently dropped invalid elements.
 * It now shows a read-only summary that opens the shared
 * {@link ListValueEditorDialog} — the same row-by-row + paste editor used by the
 * TableBrowser — so list editing is consistent everywhere ValueEditor is used
 * (Node/Edge creation dialogs, layout options, etc.).
 */
export const ListEditor = ({
  optionName,
  description,
  valueType,
  value,
  setValue,
  typeLabel,
  typeColor,
  tableLayout = false,
  error = false,
}: ListEditorProps): JSX.Element => {
  const [open, setOpen] = useState(false)
  const summary = summarizeList(value)

  const handleSave = (next: ValueType): void => {
    setValue(optionName, next)
    setOpen(false)
  }

  const trigger = (helperText?: string): JSX.Element => (
    <Tooltip arrow placement={'top'} title={description} key={optionName}>
      <TextField
        data-testid={`layout-value-editor-list-${optionName}`}
        variant="outlined"
        size="small"
        fullWidth
        value={summary}
        placeholder="Click to edit list…"
        onClick={() => setOpen(true)}
        error={error}
        helperText={helperText}
        FormHelperTextProps={{
          sx: { fontSize: '0.75rem', marginTop: 0.5 },
        }}
        InputProps={{
          readOnly: true,
          sx: { cursor: 'pointer' },
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                aria-label={`edit list ${optionName}`}
                onClick={() => setOpen(true)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </Tooltip>
  )

  const dialog = (
    <ListValueEditorDialog
      open={open}
      columnName={optionName}
      listType={valueType}
      value={value}
      onCancel={() => setOpen(false)}
      onSave={handleSave}
    />
  )

  if (tableLayout) {
    return (
      <Box component="tr">
        <Box
          component="td"
          sx={{
            py: 1.5,
            px: 2,
            verticalAlign: 'top',
            maxWidth: 0,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={optionName}
          >
            {optionName}
          </Typography>
        </Box>
        <Box
          component="td"
          sx={{
            py: 1.5,
            px: 2,
            verticalAlign: 'top',
          }}
        >
          {typeLabel && (
            <Chip
              label={typeLabel}
              size="small"
              color={typeColor}
              sx={{ fontSize: '0.7rem', height: '22px' }}
            />
          )}
        </Box>
        <Box
          component="td"
          sx={{
            py: 1.5,
            px: 2,
            verticalAlign: 'top',
          }}
        >
          {trigger()}
        </Box>
        {dialog}
      </Box>
    )
  }

  return (
    <ListItem
      key={optionName}
      sx={{
        flexDirection: 'column',
        alignItems: 'stretch',
        py: 1.5,
        px: 2,
      }}
      disablePadding
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ListItemText
          id={optionName}
          primary={optionName}
          sx={{ m: 0, flex: '0 0 auto' }}
        />
        {typeLabel && (
          <Chip
            label={typeLabel}
            size="small"
            color={typeColor}
            sx={{ fontSize: '0.7rem', height: '22px' }}
          />
        )}
      </Box>
      {trigger('Click to edit list items')}
      {dialog}
    </ListItem>
  )
}
