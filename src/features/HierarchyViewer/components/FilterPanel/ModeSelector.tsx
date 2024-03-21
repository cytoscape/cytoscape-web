import {
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Container,
  Box,
} from '@mui/material'
import { FilteringMode } from '../../../../models/FilterModel/FilterUiProps'

interface AttributeSelectorProps {
  enableFilter: boolean
  selectedMode: FilteringMode
  setSelectedMode: (mode: FilteringMode) => void
}

export const ModeSelector = ({
  enableFilter,
  selectedMode,
  setSelectedMode,
}: AttributeSelectorProps) => {
  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMode((event.target as HTMLInputElement).value as FilteringMode)
  }

  return (
    <Container
      disableGutters={true}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingBottom: '0.5em',
      }}
    >
      <Box sx={{ flex: 1 }}>
        <FormControl
          disabled={!enableFilter}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <FormLabel sx={{ paddingRight: '0.5em' }}>Filter Mode:</FormLabel>
          <RadioGroup row value={selectedMode} onChange={handleModeChange}>
            <FormControlLabel
              value={FilteringMode.SELECTION}
              control={<Radio />}
              label={'Selection'}
            />
            <FormControlLabel
              value={FilteringMode.SHOW_HIDE}
              control={<Radio />}
              label={'Show / Hide'}
            />
          </RadioGroup>
        </FormControl>
      </Box>
    </Container>
  )
}
