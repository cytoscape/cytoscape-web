import {
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
} from '@mui/material'
import { ChangeEvent } from 'react'

interface StringEditorProps {
  optionName: string
  description?: string
  value: string
  setValue: (optionName: string, value: string) => void
}

export const StringEditor = ({
  optionName,
  description,
  value,
  setValue,
}: StringEditorProps): JSX.Element => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const newValue: any = event.target.value
    setValue(optionName, newValue as string)
  }
  return (
    <ListItem
      key={optionName}
      secondaryAction={
        <Tooltip arrow placement={'right'} title={description} key={optionName}>
          <TextField
            id="standard-basic"
            variant="standard"
            sx={{ maxWidth: '4em', justifyContent: 'right' }}
            defaultValue={value}
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
