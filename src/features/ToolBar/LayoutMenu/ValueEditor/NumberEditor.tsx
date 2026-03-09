import {
  Box,
  Chip,
  ListItem,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ChangeEvent } from 'react'

interface NumberEditorProps {
  optionName: string
  description: string
  value: number
  setValue: (optionName: string, value: number) => void
  typeLabel?: string
  typeColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  tableLayout?: boolean
  error?: boolean
}

export const NumberEditor = ({
  optionName,
  description,
  value,
  setValue,
  typeLabel,
  typeColor = 'success',
  tableLayout = false,
  error = false,
}: NumberEditorProps): JSX.Element => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const newValue: any = event.target.value
    setValue(optionName, Number(newValue))
  }

  if (tableLayout) {
    return (
      <Box component="tr">
        <Box
          component="td"
          sx={{
            py: 1.5,
            px: 2,
            verticalAlign: 'middle',
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
            verticalAlign: 'middle',
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
            verticalAlign: 'middle',
          }}
        >
          <Tooltip arrow placement={'top'} title={description} key={optionName}>
            <TextField
              data-testid={`layout-value-editor-number-${optionName}`}
              variant="outlined"
              size="small"
              fullWidth
              defaultValue={value}
              onChange={handleChange}
              type="number"
              placeholder="0"
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
        display: 'flex',
        alignItems: 'center',
        py: 1,
        px: 2,
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: '200px', justifyContent: 'flex-end' }}>
          {typeLabel && (
            <Chip 
              label={typeLabel} 
              size="small" 
              color={typeColor}
              sx={{ fontSize: '0.7rem', height: '22px', flexShrink: 0 }}
            />
          )}
          <Tooltip arrow placement={'top'} title={description} key={optionName}>
            <TextField
              data-testid={`layout-value-editor-number-${optionName}`}
              variant="outlined"
              size="small"
              sx={{ width: '120px', flexShrink: 0 }}
              defaultValue={value}
              onChange={handleChange}
              type="number"
              placeholder="0"
              error={error}
            />
          </Tooltip>
        </Box>
      }
      disablePadding
    >
      <ListItemText 
        id={optionName} 
        primary={optionName}
        sx={{ flex: '1 1 auto', minWidth: 0 }}
      />
    </ListItem>
  )
}
