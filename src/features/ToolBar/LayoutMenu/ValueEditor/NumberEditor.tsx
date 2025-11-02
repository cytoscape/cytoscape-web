import {
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
} from '@mui/material'
import { ChangeEvent } from 'react'

interface NumberEditorProps {
  optionName: string
  description: string
  value: number
  setValue: (optionName: string, value: number) => void
}

export const NumberEditor = ({
  optionName,
  description,
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
        <Tooltip arrow placement={'right'} title={description} key={optionName}>
          <TextField
            id="standard-basic"
            variant="standard"
            defaultValue={value}
            sx={{ maxWidth: '4em', justifyContent: 'right' }}
            onChange={handleChange}
          />
        </Tooltip>
      }
      disablePadding
    >
      <ListItemButton>
        <ListItemText id={optionName} primary={optionName} />
      </ListItemButton>
    </ListItem>
  )
}
