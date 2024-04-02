import {
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Container,
  Box,
} from '@mui/material'
import { DisplayMode } from '../../../../models/FilterModel/DisplayMode'

interface AttributeSelectorProps {
  enableFilter: boolean
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
}

export const ModeSelector = ({
  enableFilter,
  displayMode,
  setDisplayMode,
}: AttributeSelectorProps) => {
  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayMode((event.target as HTMLInputElement).value as DisplayMode)
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
          <RadioGroup row value={displayMode} onChange={handleModeChange}>
            <FormControlLabel
              value={DisplayMode.SELECT}
              control={<Radio />}
              label={'Selection'}
            />
            <FormControlLabel
              value={DisplayMode.SHOW_HIDE}
              control={<Radio />}
              label={'Show / Hide'}
            />
          </RadioGroup>
        </FormControl>
      </Box>
    </Container>
  )
}
