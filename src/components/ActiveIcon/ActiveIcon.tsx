import DoneIcon from '@mui/icons-material/Done'
import { Avatar } from '@mui/material'

export const ActiveIcon = (): JSX.Element => (
  <Avatar
    sx={{
      display: 'flex',
      position: 'absolute',
      alignItems: 'center',
      bottom: '1em',
      right: '1em',
      zIndex: 3000,
      borderRadius: '0.5em',
      backgroundColor: 'rgba(250, 250, 250, 0.8)',
      border: '1px solid #AAAAAA',
    }}
    variant="rounded"
  >
    <DoneIcon />
  </Avatar>
)
