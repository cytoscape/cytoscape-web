import FormLabel from '@mui/material/FormLabel'
import FormControl from '@mui/material/FormControl'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import { GraphObjectType } from '../../../models/NetworkModel'

interface SearchTargetSelectorProps {
  searchTargets: Record<GraphObjectType, boolean>
  setSearchTargets: (searchTargets: Record<GraphObjectType, boolean>) => void
}
export const SearchTargetSelector = ({
  searchTargets,
  setSearchTargets,
}: SearchTargetSelectorProps): JSX.Element => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTargets({
      ...searchTargets,
      [event.target.name]: event.target.checked,
    })
  }

  return (
    <FormControl component="fieldset" variant="standard">
      <FormLabel component="legend" style={{ fontSize: '0.875rem' }}>
        Search Target
      </FormLabel>
      <FormGroup row>
        <FormControlLabel
          control={
            <Checkbox
              checked={searchTargets[GraphObjectType.NODE]}
              onChange={handleChange}
              name={GraphObjectType.NODE}
            />
          }
          label="Nodes"
          style={{ fontSize: '0.875rem' }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={searchTargets[GraphObjectType.EDGE]}
              onChange={handleChange}
              name={GraphObjectType.EDGE}
            />
          }
          label="Edges"
          style={{ fontSize: '0.875rem' }}
        />
      </FormGroup>
    </FormControl>
  )
}
