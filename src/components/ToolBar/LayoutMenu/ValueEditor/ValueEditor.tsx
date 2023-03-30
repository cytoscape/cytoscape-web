import {
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  TextField,
} from '@mui/material'
import { ValueType, ValueTypeName } from '../../../../models/TableModel'
import { BooleanEditor } from './BooleanEditor'
import { NumberEditor } from './NumberEditor'

interface ValueEditorProps {
  optionName: string
  valueType: ValueTypeName
  value: ValueType
  setValue: (optionName: string, value: ValueType) => void
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
    setValue(optionName, value)
  }

  if (
    valueType === ValueTypeName.Integer ||
    valueType === ValueTypeName.Double ||
    valueType === ValueTypeName.Long
  ) {
    return (
      <NumberEditor
        optionName={optionName}
        value={value as number}
        setValue={setValue}
      />
    )
  } else if (valueType === ValueTypeName.Boolean) {
    // Return ListItem with Checkbox
    return (
      <BooleanEditor
        optionName={optionName}
        value={value as boolean}
        setValue={setValue}
      />
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
            onChange={handleChange}
          />
        }
        disablePadding
      >
        <ListItemButton>
          <ListItemAvatar>
            <Avatar />
          </ListItemAvatar>
          <ListItemText id={optionName} primary={optionName} />
        </ListItemButton>
      </ListItem>
    )
  }
}
