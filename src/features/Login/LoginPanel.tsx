import CloseIcon from '@mui/icons-material/Close'
import LogoutIcon from '@mui/icons-material/Logout'
import { Button } from '@mui/material'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import { deepOrange } from '@mui/material/colors'
import Typography from '@mui/material/Typography'
import { KeycloakTokenParsed } from 'keycloak-js'
import { ReactElement } from 'react'

interface LoginPanelProps {
  token?: KeycloakTokenParsed
  open: boolean
  handleClose: () => void
  handleLogout: () => void
}

export const LoginPanel = (props: LoginPanelProps): ReactElement => {
  const { token, open } = props

  if (!open) {
    return <></>
  }

  const name: string = token?.name
  const userId: string = token?.preferred_username ?? name

  return (
    <Card
      sx={{
        zIndex: 1000,
        maxWidth: 345,
        position: 'fixed',
        top: 40,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <CardHeader
        disableSpacing
        avatar={
          <Avatar
            aria-label="user"
            sx={{
              bgcolor: deepOrange[300],
              width: 56,
              height: 56,
              marginBottom: 0,
              paddingBottom: 0,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Avatar>
        }
      />
      <CardContent sx={{ marginTop: 0, paddingTop: 0, alignItems: 'center' }}>
        <Typography variant="h5" color="text.primary">
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {`You are logged in as ${userId}`}
        </Typography>
      </CardContent>
      <CardActions disableSpacing>
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={props.handleLogout}
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
