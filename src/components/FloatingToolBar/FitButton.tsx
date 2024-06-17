import { IconButton, Tooltip } from '@mui/material'
import { ZoomOutMap } from '@mui/icons-material'
import { useRendererFunctionStore } from '../../store/RendererFunctionStore'

interface FitButtonProps {
  rendererId: string
}

export const FIT_FUNCTION_NAME: string = 'fit'

export const FitButton = ({ rendererId }: FitButtonProps): JSX.Element => {
  const getRendererFunction = useRendererFunctionStore(
    (state) => state.getFunction,
  )

  const handleClick = (): void => {
    const fitFunction = getRendererFunction(rendererId, FIT_FUNCTION_NAME)
    if (fitFunction !== undefined) {
      fitFunction()
      console.log('Fit function called for:', rendererId)
    } else {
      console.log('Fit function not available')
    }
  }

  return (
    <Tooltip title={`Fit network to the window`} placement="top" arrow>
      <IconButton
        onClick={handleClick}
        aria-label={FIT_FUNCTION_NAME}
        size="small"
        disableFocusRipple={true}
      >
        <ZoomOutMap fontSize="inherit" />
      </IconButton>
    </Tooltip>
  )
}
