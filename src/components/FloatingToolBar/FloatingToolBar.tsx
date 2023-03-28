import { Divider, Toolbar } from '@mui/material'
import { ApplyLayoutButton } from './ApplyLayoutButton'
import { FitButton } from './FitButton'

export const FloatingToolBar = (): JSX.Element => {
  return (
    <Toolbar
      sx={{
        zIndex: 900,
        left: '1em',
        bottom: '5em',
        height: '4em',
        width: '30em',
        background: 'rgba(250, 250, 250, 0.8)',
        borderRadius: '0.5em',
        // border: '4px solid blue',
      }}
    >
      <FitButton />
      <ApplyLayoutButton />
      <Divider orientation="vertical" flexItem />
    </Toolbar>
  )
}
