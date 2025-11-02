import { Box, IconButton, Tooltip } from '@mui/material'
import { ZoomOutMap } from '@mui/icons-material'
import { useRendererFunctionStore } from '../../hooks/stores/RendererFunctionStore'
import { IdType } from '../../models'
import { useWorkspaceStore } from '../../hooks/stores/WorkspaceStore'
import { useUiStateStore } from '../../hooks/stores/UiStateStore'
import { logUi } from '../../debug'

interface FitButtonProps {
  rendererId: string
  disabled?: boolean
}

export const FIT_FUNCTION_NAME: string = 'fit'

export const FitButton = ({
  rendererId,
  disabled = false,
}: FitButtonProps): JSX.Element => {
  const getRendererFunction = useRendererFunctionStore(
    (state) => state.getFunction,
  )

  // This is the ID of network in the selected viewport.
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const networkId: IdType = activeNetworkId ?? currentNetworkId

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

    // If there are two or more renderers, the active window has higher priority.
    const fitFunction = fitFunctionByNetworkId ?? fitFunctionByRenderer
    if (fitFunction !== undefined) {
      fitFunction()
    } else {
      logUi.warn(
        `[${FitButton.name}]:[${handleClick.name}]: Fit function not available`,
      )
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
