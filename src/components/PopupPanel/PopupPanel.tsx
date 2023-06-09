import {
  Box,
  CardContent,
  Typography,
  CardActions,
  Button,
  Card,
} from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

const card = (
  <>
    <CardContent>
      <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
        Object Prop
      </Typography>
      <Typography sx={{ mb: 1.5 }} color="text.secondary">
        adjective
      </Typography>
      <Typography variant="body2">
        well meaning and kindly.
        <br />
        {'"a benevolent smile"'}
      </Typography>
    </CardContent>
    <CardActions>
      <Button size="small">Learn More</Button>
    </CardActions>
  </>
)

export const PopupPanel = (): ReactElement => {
  const [mousePos, setMousePos] = useState<any>({})

  useEffect(() => {
    const handleMouseClick = (event: MouseEvent): void => {
      console.log(event)
      setMousePos({ x: event.offsetX, y: event.offsetY })
    }

    window.addEventListener('click', handleMouseClick)

    return () => {
      window.removeEventListener('click', handleMouseClick)
    }
  }, [])
  return (
    <Box
      sx={{
        position: 'absolute',
        alignItems: 'center',
        top: mousePos.y,
        left: mousePos.x,
        zIndex: 2000,
        borderRadius: '0.5em',
        backgroundColor: 'rgba(250, 0, 0, 0.8)',
        border: '1px solid #AAAAAA',
      }}
    >
      <Card variant="outlined">
        <Typography sx={{ fontSize: 14 }} color="text.secondary">
          {mousePos.x}, {mousePos.y}
        </Typography>
        {card}
      </Card>
    </Box>
  )
}
