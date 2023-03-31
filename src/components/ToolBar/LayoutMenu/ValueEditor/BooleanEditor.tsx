import {
  ListItem,
  Checkbox,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { ChangeEvent, useState } from 'react'

interface BooleanEditorProps {
  optionName: string
  description: string
  value: boolean
  setValue: (optionName: string, value: boolean) => void
}

export const BooleanEditor = ({
  optionName,
  description,
  value,
  setValue,
}: BooleanEditorProps): JSX.Element => {
  const [checked, setChecked] = useState<boolean>(value)

  const handleToggle = (event: ChangeEvent<HTMLInputElement>): void => {
    const newValue: boolean = event.target.checked
    setChecked(newValue)
    setValue(optionName, newValue)
  }

  return (
    <ListItem
      key={optionName}
      disablePadding
      secondaryAction={
        <Tooltip arrow placement={'right'} title={description} key={optionName}>
          <Checkbox edge="end" onChange={handleToggle} checked={checked} />
        </Tooltip>
      }
    >
      <ListItemButton>
        <ListItemText
          id={optionName}
          primary={optionName}
          sx={{ maxWidth: 'sm' }}
        />
      </ListItemButton>
    </ListItem>
  )
}
