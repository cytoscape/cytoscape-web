import * as React from 'react'
import Box from '@mui/material/Box'
import Cytoscape from 'cytoscape'

// import { AppContext } from '../states/AppStateProvider'

export default function NetworkView(): React.ReactElement {
  const [cy, setCy] = React.useState(null as any)
  const cyContainer = React.useRef(null)

  // import appcontext to acccess the global state
  //   const appContext = React.useContext(AppContext)
  //   console.log(appContext)

  if (cy != null) {
    cy.data('_init', true)
  }

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
