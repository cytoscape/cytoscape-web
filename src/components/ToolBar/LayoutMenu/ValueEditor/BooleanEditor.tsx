import { ListItem, Checkbox, ListItemButton, ListItemText } from '@mui/material'
import { ChangeEvent, useState } from 'react'

interface BooleanEditorProps {
  optionName: string
  value: boolean
  setValue: (optionName: string, value: boolean) => void
}

export const BooleanEditor = ({
  optionName,
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
        <Checkbox edge="end" onChange={handleToggle} checked={checked} />
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
