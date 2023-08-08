import {
  Box,
  FormControlLabel,
  FormGroup,
  Switch,
  Theme,
  useTheme,
} from '@mui/material'
import { useEffect } from 'react'
import { useVisualStyleSelectorStore } from '../../store/VisualStyleSelectorStore'
import { VisualStyle } from '../../../../models/VisualStyleModel'
import { useVisualStyleStore } from '../../../../store/VisualStyleStore'

interface SharedStyleManagerProps {
  networkId: string

  // This is the parent network ID and style's key
  rootNetworkId: string
}

export const SharedStyleManager = ({
  networkId,
  rootNetworkId,
}: SharedStyleManagerProps): JSX.Element => {
  const theme: Theme = useTheme()
  const enable = useVisualStyleSelectorStore((state) => state.enable)
  const setEnable: (enable: boolean) => void = useVisualStyleSelectorStore(
    (state) => state.enableSharedVisualStyle,
  )

  const individualStyles: Record<string, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )
  const addIndividualStyle = useVisualStyleStore((state) => state.add)
  // const rootNetworkStyle: VisualStyle = individualStyles[rootNetworkId]

  const handleChange = (e: any): void => {
    setEnable(e.target.checked)
  }

  // Initialization. Check and apply shared style
  useEffect(() => {
    if (enable) {
      applySharedStyle()
    }
  }, [])

  useEffect(() => {
    if (enable) {
      applySharedStyle()
    }
  }, [networkId, rootNetworkId])

  useEffect(() => {
    if (enable) {
      const editedStyle = individualStyles[networkId]
      if (editedStyle === undefined) {
        return
      }
      addIndividualStyle(rootNetworkId, editedStyle)
    }
  }, [individualStyles[networkId]])

  const applySharedStyle = (): void => {
    const rootNetworkStyle = individualStyles[rootNetworkId]
    if (rootNetworkStyle === undefined) {
      return
    }
    // Assign the root network style to the individual network
    addIndividualStyle(networkId, rootNetworkStyle)
  }

  return (
    <Box sx={{ padding: theme.spacing(1) }}>
      <FormGroup>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Use shared style"
          onChange={handleChange}
          checked={enable}
          disabled={true}
        />
      </FormGroup>
    </Box>
  )
}
