import FormLabel from '@mui/material/FormLabel'
import FormControl from '@mui/material/FormControl'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import { useState } from 'react'
import { GraphObjectType } from '../../../models/NetworkModel'

export const SearchTargetSelector = (): JSX.Element => {
  const [state, setState] = useState({
    [GraphObjectType.NODE]: true,
    [GraphObjectType.EDGE]: false,
  })

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setState({
      ...state,
      [event.target.name]: event.target.checked,
    })
  }

  return (
    <FormControl component="fieldset" variant="standard">
      <FormLabel component="legend">Search Target</FormLabel>
      <FormGroup row>
        <FormControlLabel
          control={
            <Checkbox
              checked={state[GraphObjectType.NODE]}
              onChange={handleChange}
              name={GraphObjectType.NODE}
            />
          }
          label="Nodes"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={state[GraphObjectType.EDGE]}
              onChange={handleChange}
              name={GraphObjectType.EDGE}
            />
          }
          label="Edges"
        />
      </FormGroup>
    </FormControl>
  )
}
