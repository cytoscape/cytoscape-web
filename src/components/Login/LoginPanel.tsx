import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { red } from '@mui/material/colors'
import FavoriteIcon from '@mui/icons-material/Favorite'
import ShareIcon from '@mui/icons-material/Share'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { ReactElement, useEffect } from 'react'
import { useKeycloak } from '../../auth/useKeycloak'

interface LoginPanelProps {
  open: boolean
  handleClose: () => void
}

export const LoginPanel = (props: LoginPanelProps): ReactElement => {
  const keycloakClient = useKeycloak()

  useEffect(() => {
    console.log('Button is ready', keycloakClient.client)
  }, [keycloakClient])

  const handleLogin = (): void => {
    if (keycloakClient?.client !== undefined) {
      const { client } = keycloakClient

      if (client.authenticated === true) {
        console.log('=========== Already Authed', client.tokenParsed)
      } else {
        client
          .login()
          .then(() => {
            console.log('=========== Login & Authed', client.tokenParsed)
          })
          .catch((error) => {
            console.log('===========Error', error)
          })
      }
    }
  }

  if (!props.open) {
    return <></>
  }

  return (
    <Card
      sx={{
        zIndex: 1000,
        maxWidth: 345,
        position: 'fixed',
        top: 10,
        right: 10,
        backgroundColor: 'red',
      }}
    >
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: red[500] }} aria-label="recipe">
            R
          </Avatar>
        }
        action={
          <IconButton aria-label="settings">
            <MoreVertIcon />
          </IconButton>
        }
        title="Shrimp and Chorizo Paella"
        subheader="September 14, 2016"
      />
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          This impressive paella is a perfect party dish and a fun meal to cook
          together with your guests. Add 1 cup of frozen peas along with the
          mussels, if you like.
        </Typography>
      </CardContent>
      <CardActions disableSpacing>
        <IconButton aria-label="add to favorites" onClick={props.handleClose}>
          <FavoriteIcon />
        </IconButton>
        <IconButton aria-label="share" onClick={handleLogin}>
          <ShareIcon />
        </IconButton>
      </CardActions>
    </Card>
  )
}
