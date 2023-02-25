import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import LogoutIcon from '@mui/icons-material/Logout'
import CloseIcon from '@mui/icons-material/Close'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { ReactElement } from 'react'
import { Button } from '@mui/material'
import { KeycloakTokenParsed } from 'keycloak-js'

interface LoginPanelProps {
  token?: KeycloakTokenParsed
  open: boolean
  handleClose: () => void
}

export const LoginPanel = (props: LoginPanelProps): ReactElement => {
  const { token, open } = props

  if (!open) {
    return <></>
  }

  return (
    <Card
      sx={{
        zIndex: 1000,
        maxWidth: 345,
        position: 'fixed',
        top: 40,
        right: 10,
      }}
    >
      <CardHeader
        avatar={<Avatar aria-label="user" />}
        action={
          <IconButton aria-label="settings">
            <MoreVertIcon />
          </IconButton>
        }
        title={token?.name}
        subheader={token?.email}
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </Typography>
      </CardContent>
      <CardActions disableSpacing>
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={props.handleClose}
        >
          Logout
        </Button>
        <Button
          sx={{ marginLeft: '0.5em' }}
          variant="outlined"
          startIcon={<CloseIcon />}
          onClick={props.handleClose}
        >
          Close
        </Button>
      </CardActions>
    </Card>
  )
}
