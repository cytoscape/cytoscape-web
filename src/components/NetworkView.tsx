import * as React from 'react'
import Box from '@mui/material/Box'
import Cytoscape from 'cytoscape'

export default function NetworkView(): React.ReactElement {
  const [cy, setCy] = React.useState(null)
  const cyContainer = React.useRef(null)

  console.log(cy)
  React.useEffect(() => {
    const cy = new Cytoscape({
      container: cyContainer.current,
    })
    cy.resize()
    setCy(cy)
  }, [])

  return (
    <Box
      sx={{ width: '100%', height: '100%' }}
      id="cy-container"
      ref={cyContainer}
    ></Box>
  )
}
