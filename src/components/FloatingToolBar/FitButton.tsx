import { IconButton, Tooltip } from '@mui/material'
import { ZoomOutMap } from '@mui/icons-material'
import { useRendererFunctionStore } from '../../store/RendererFunctionStore'
import { useUiStateStore } from '../../store/UiStateStore'
import { IdType } from 'src/models'

interface FitButtonProps {
  rendererId: string
}

export const FIT_FUNCTION_NAME: string = 'fit'

export const FitButton = ({ rendererId }: FitButtonProps): JSX.Element => {
  const getRendererFunction = useRendererFunctionStore(
    (state) => state.getFunction,
  )

  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const handleClick = (): void => {
    const fitFunction = getRendererFunction(
      rendererId,
      FIT_FUNCTION_NAME,
      activeNetworkId,
    )
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
