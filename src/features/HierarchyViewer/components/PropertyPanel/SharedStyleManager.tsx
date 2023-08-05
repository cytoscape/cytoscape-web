import {
  Box,
  FormControlLabel,
  FormGroup,
  Switch,
  Theme,
  useTheme,
} from '@mui/material'
import { useEffect, useState } from 'react'
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
  const visualStyles: Record<string, VisualStyle> = useVisualStyleSelectorStore(
    (state) => state.sharedVisualStyles,
  )
  const addSharedStyle = useVisualStyleSelectorStore((state) => state.add)

  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const individualStyles: Record<string, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  const individualStyle: VisualStyle = individualStyles[networkId]

  const theme: Theme = useTheme()
  const [enable, setEnable] = useState<boolean>(true)

  const handleChange = (e: any): void => {
    setEnable(e.target.checked)
  }

  useEffect(() => {
    console.log('Next network---------------------', networkId)

    // Apply original style if enabled
    if (enable) {
      applySharedStyle()
    }
  }, [networkId])

  // useEffect(() => {
  //   console.log(
  //     '@@@@@@@@@@@@@@@ init Apply original style',
  //     networkId,
  //     rootNetworkId,
  //   )
  //   if (enable) {
  //     applySharedStyle()
  //   }
  // }, [])

  useEffect(() => {
    if (individualStyle === undefined) {
      return
    }

    if (enable) {
      console.log('Visual style edited: ', individualStyle)
      // Update style if necessary

      addSharedStyle(rootNetworkId, { ...individualStyle })
    }
  }, [individualStyle])

  const applySharedStyle = (): void => {
    const rootStyle: VisualStyle = visualStyles[rootNetworkId]
    if (rootStyle === undefined) {
      return
    }

    addVisualStyle(networkId, rootStyle)
    console.log('*******************Shared Style applied: ', rootStyle)
  }

  return (
    <Box sx={{ padding: theme.spacing(1) }}>
      <FormGroup>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Use shared style"
          onChange={handleChange}
          checked={enable}
        />
      </FormGroup>
    </Box>
  )
}
