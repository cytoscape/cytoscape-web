import {
  Box,
  Checkbox,
  Chip,
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import { ChangeEvent, useState } from 'react'

interface BooleanEditorProps {
  optionName: string
  description: string
  value: boolean
  setValue: (optionName: string, value: boolean) => void
  typeLabel?: string
  typeColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  tableLayout?: boolean
}

export const BooleanEditor = ({
  optionName,
  description,
  value,
  setValue,
  typeLabel,
  typeColor = 'secondary',
  tableLayout = false,
}: BooleanEditorProps): JSX.Element => {
  const [checked, setChecked] = useState<boolean>(value)

  const handleToggle = (event: ChangeEvent<HTMLInputElement>): void => {
    const newValue: boolean = event.target.checked
    setChecked(newValue)
    setValue(optionName, newValue)
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
            <Checkbox
              data-testid={`layout-value-editor-boolean-${optionName}`}
              onChange={handleToggle}
              checked={checked}
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
      disablePadding
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
            <Checkbox
              data-testid={`layout-value-editor-boolean-${optionName}`}
              edge="end"
              onChange={handleToggle}
              checked={checked}
            />
          </Tooltip>
        </Box>
      }
    >
      <ListItemText
        id={optionName}
        primary={optionName}
        sx={{ flex: '1 1 auto', minWidth: 0 }}
      />
    </ListItem>
  )
}
