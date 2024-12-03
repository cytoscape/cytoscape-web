import { Box, IconButton, Tooltip } from '@mui/material'
import { ZoomOutMap } from '@mui/icons-material'
import { useRendererFunctionStore } from '../../store/RendererFunctionStore'
import { IdType } from 'src/models'
import { useWorkspaceStore } from '../../store/WorkspaceStore'

interface FitButtonProps {
  rendererId: string
  targetNetworkId?: IdType
  disabled?: boolean
}

export const FIT_FUNCTION_NAME: string = 'fit'

export const FitButton = ({
  rendererId,
  targetNetworkId,
  disabled = false,
}: FitButtonProps): JSX.Element => {
  const getRendererFunction = useRendererFunctionStore(
    (state) => state.getFunction,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const networkId: IdType = targetNetworkId ?? currentNetworkId

  const handleClick = (): void => {
    const fitFunctionByRenderer = getRendererFunction(
      rendererId,
      FIT_FUNCTION_NAME,
    )
    const fitFunctionByNetworkId = getRendererFunction(
      rendererId,
      FIT_FUNCTION_NAME,
      networkId,
    )
    const fitFunction = fitFunctionByNetworkId ?? fitFunctionByRenderer // network id functions given priority
    if (fitFunction !== undefined) {
      fitFunction()
      console.log('Fit function called for:', rendererId)
    } else {
      console.log('Fit function not available')
    }
  }

  const innerButton = (
    <IconButton
      onClick={handleClick}
      aria-label={FIT_FUNCTION_NAME}
      size="small"
      disableFocusRipple={true}
    >
      <ZoomOutMap fontSize="inherit" />
    </IconButton>
  )

  const innerButtonDisabled = (
    <IconButton
      onClick={handleClick}
      aria-label={FIT_FUNCTION_NAME}
      size="small"
      disableFocusRipple={true}
      disabled={disabled}
    >
      <ZoomOutMap fontSize="inherit" />
    </IconButton>
  )
  if (disabled) {
    return (
      <Tooltip
        title={'Fit function cannot be applied to the current network view.'}
      >
        <Box>{innerButtonDisabled}</Box>
      </Tooltip>
    )
  } else {
    return (
      <Tooltip title={`Fit network to the window`} placement="top" arrow>
        {innerButton}
      </Tooltip>
    )
  }
}
