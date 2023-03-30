import {
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
} from '@mui/material'
import { ChangeEvent } from 'react'

interface NumberEditorProps {
  optionName: string
  value: number
  setValue: (optionName: string, value: number) => void
}

export const NumberEditor = ({
  optionName,
  value,
  setValue,
}: NumberEditorProps): JSX.Element => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const newValue: any = event.target.value
    setValue(optionName, Number.parseInt(newValue))
  }
  return (
    <ListItem
      key={optionName}
      secondaryAction={
        <TextField
          id="standard-basic"
          variant="standard"
          defaultValue={value}
          sx={{ maxWidth: '4em', justifyContent: 'right' }}
          onChange={handleChange}
        />
      }
      disablePadding
    >
      <ListItemButton>
        <ListItemText id={optionName} primary={optionName} />
      </ListItemButton>
    </ListItem>
  )
}
