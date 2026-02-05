import {
  Box,
  Chip,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ChangeEvent, useEffect, useState } from 'react'

import { ValueType, ValueTypeName } from '../../../../models/TableModel'

interface ListEditorProps {
  optionName: string
  description: string
  valueType: ValueTypeName
  value: ValueType
  setValue: (optionName: string, value: ValueType) => void
  typeLabel?: string
  typeColor: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  tableLayout?: boolean
  error?: boolean
}

const getPlaceholder = (type: ValueTypeName): string => {
  switch (type) {
    case ValueTypeName.ListString:
      return 'value1, value2'
    case ValueTypeName.ListInteger:
    case ValueTypeName.ListLong:
      return '1, 2, 3'
    case ValueTypeName.ListDouble:
      return '1.5, 2.7, 3.9'
    case ValueTypeName.ListBoolean:
      return 'true, false, true'
    default:
      return ''
  }
}

const parseListValue = (type: ValueTypeName, value: string): ValueType => {
  if (!value.trim()) {
    return []
  }
  
  // Split by comma (with or without space), then trim each part
  // This handles both "1, 2, 3" and "1,2,3" formats
  const parts = value.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
  
  if (parts.length === 0) {
    return []
  }
  
  switch (type) {
    case ValueTypeName.ListString:
      return parts
    case ValueTypeName.ListInteger:
    case ValueTypeName.ListLong:
      return parts.map((v) => parseInt(v, 10)).filter((v) => !isNaN(v))
    case ValueTypeName.ListDouble:
      return parts.map((v) => parseFloat(v)).filter((v) => !isNaN(v))
    case ValueTypeName.ListBoolean:
      return parts.map((v) => v.toLowerCase() === 'true')
    default:
      return parts
  }
}

const formatListValue = (value: ValueType): string => {
  if (Array.isArray(value) && value.length > 0) {
    // Use ", " separator to match the expected format
    return value.map((v) => String(v)).join(', ')
  }
  return ''
}

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
  const [inputValue, setInputValue] = useState<string>(formatListValue(value))

  // Update input value when prop value changes (e.g., when defaults are set)
  // Only update if the formatted value would be different
  useEffect(() => {
    const formatted = formatListValue(value)
    setInputValue((prev) => {
      // Only update if the formatted value is different from current input
      // This prevents clearing user input while they're typing
      if (Array.isArray(value) && value.length === 0 && prev !== '') {
        // Keep user input if they're typing and value is empty array
        return prev
      }
      return formatted
    })
  }, [value])

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const newInputValue = event.target.value
    setInputValue(newInputValue)
    const parsedValue = parseListValue(valueType, newInputValue)
    setValue(optionName, parsedValue)
  }

  const placeholder = getPlaceholder(valueType)

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
          <Tooltip arrow placement={'top'} title={description} key={optionName}>
            <TextField
              data-testid={`layout-value-editor-list-${optionName}`}
              variant="outlined"
              size="small"
              fullWidth
              value={inputValue}
              onChange={handleChange}
              placeholder={placeholder}
              error={error}
            />
          </Tooltip>
        </Box>
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
      <Tooltip arrow placement={'top'} title={description} key={optionName}>
        <TextField
          data-testid={`layout-value-editor-list-${optionName}`}
          variant="outlined"
          size="small"
          fullWidth
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          helperText={`Comma-separated values (e.g., "${placeholder}")`}
          FormHelperTextProps={{
            sx: { fontSize: '0.75rem', marginTop: 0.5 },
          }}
        />
      </Tooltip>
    </ListItem>
  )
}

