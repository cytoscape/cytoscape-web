import {
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  TextField,
  Checkbox,
} from '@mui/material'
import { ValueType, ValueTypeName } from '../../../models/TableModel'

interface ValueEditorProps {
  optionName: string
  valueType: ValueTypeName
  value: ValueType
  setValue: (value: ValueType) => void
}

export const ValueEditor = ({
  optionName,
  valueType,
  value,
  setValue,
}: ValueEditorProps): JSX.Element => {
  const handleChange = (event: any): void => {
    // Extract value from event
    const value = event.target.value
    setValue(value)
  }

  const handleToggle = (value: boolean) => (): void => {
    setValue(!value)
  }

  if (
    valueType === ValueTypeName.Integer ||
    valueType === ValueTypeName.Double ||
    valueType === ValueTypeName.Long
  ) {
    return (
      <ListItem
        key={optionName}
        secondaryAction={
          <TextField
            id="standard-basic"
            variant="standard"
            defaultValue={value}
            sx={{ maxWidth: '4em', justifyContent: 'right' }}
          />
        }
        disablePadding
      >
        <ListItemButton>
          <ListItemText
            id={optionName}
            primary={optionName}
            onChange={handleChange}
          />
        </ListItemButton>
      </ListItem>
    )
  } else if (valueType === ValueTypeName.Boolean) {
    // Return ListItem with Checkbox
    return (
      <ListItem
        key={optionName}
        disablePadding
        secondaryAction={
          <Checkbox
            edge="end"
            onChange={handleToggle(value as boolean)}
            checked={value as boolean}
          />
        }
      >
        <ListItemButton>
          <ListItemText
            id={optionName}
            primary={optionName}
            onChange={handleChange}
            sx={{ maxWidth: 'sm' }}
          />
        </ListItemButton>
      </ListItem>
    )
  } else {
    // Handle as string
    return (
      <ListItem
        key={optionName}
        secondaryAction={
          <TextField
            id="standard-basic"
            variant="standard"
            defaultValue={value}
          />
        }
        disablePadding
      >
        <ListItemButton>
          <ListItemAvatar>
            <Avatar />
          </ListItemAvatar>
          <ListItemText
            id={optionName}
            primary={optionName}
            onChange={handleChange}
          />
        </ListItemButton>
      </ListItem>
    )
  }
}
