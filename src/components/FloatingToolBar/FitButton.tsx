import { IconButton, Tooltip } from '@mui/material'
import { ZoomOutMap } from '@mui/icons-material'
import { useRendererFunctionStore } from '../../store/RendererFunctionStore'

export const FitButton = (): JSX.Element => {
  const getRendererFunction = useRendererFunctionStore(
    (state) => state.getFunction,
  )

  const handleClick = (): void => {
    const fitFunction = getRendererFunction('cyjs', 'fit')
    if (fitFunction !== undefined) {
      fitFunction()
    } else {
      console.log('Fit function not available')
    }
  }

  return (
    <Tooltip title={`Fit network to the window`} placement="top" arrow>
      <IconButton
        onClick={handleClick}
        aria-label="fit"
        size="large"
        disableFocusRipple={true}
      >
        <ZoomOutMap fontSize="inherit" />
      </IconButton>
    </Tooltip>
  )
}
