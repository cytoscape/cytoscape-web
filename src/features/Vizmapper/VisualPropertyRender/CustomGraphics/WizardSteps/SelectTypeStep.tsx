import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import ImageIcon from '@mui/icons-material/Image'
import PieChartIcon from '@mui/icons-material/PieChart'
import { Alert, Box, Typography } from '@mui/material'
import * as React from 'react'

import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { AUTHORABLE_CUSTOM_GRAPHIC_KINDS } from '../utils/constants'

export type CustomGraphicKind =
  | typeof CustomGraphicsNameType.PieChart
  | typeof CustomGraphicsNameType.RingChart
  | typeof CustomGraphicsNameType.Image

interface SelectTypeStepProps {
  selectedKind: CustomGraphicKind
  onKindChange: (kind: CustomGraphicKind) => void
  hasNumericProperties?: boolean
  /**
   * Kinds to offer. Defaults to the authorable set, which excludes Image —
   * callers editing a value that is already an image must pass it explicitly.
   */
  availableKinds?: readonly CustomGraphicKind[]
}

export const SelectTypeStep: React.FC<SelectTypeStepProps> = ({
  selectedKind,
  onKindChange,
  hasNumericProperties = true,
  availableKinds = AUTHORABLE_CUSTOM_GRAPHIC_KINDS,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!hasNumericProperties && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            This network does not have any numeric properties in the node table.
            Custom graphics (pie charts and ring charts) require numeric data to
            display values. Please add numeric attributes to your nodes to use
            custom graphics.
          </Typography>
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          py: 4,
        }}
      >
        {availableKinds.map((k) => {
          const selected = selectedKind === k
          const Icon =
            k === CustomGraphicsNameType.PieChart
              ? PieChartIcon
              : k === CustomGraphicsNameType.RingChart
                ? DonutLargeIcon
                : ImageIcon

          const isDisabled =
            k !== CustomGraphicsNameType.Image && !hasNumericProperties

          return (
            <Box
              key={k}
              onClick={() => !isDisabled && onKindChange(k)}
              sx={{
                cursor: !isDisabled ? 'pointer' : 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 1,
                borderRadius: 2,
                border: selected ? 2 : 1,
                borderColor: selected ? 'primary.main' : 'grey.300',
                bgcolor: selected ? 'action.selected' : 'transparent',
                opacity: isDisabled ? 0.5 : 1,
                '&:hover': !isDisabled ? { opacity: 0.8 } : {},
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <Icon sx={{ fontSize: 64 }} />
              </Box>
              <Typography fontSize="1rem">
                {k === CustomGraphicsNameType.PieChart
                  ? 'Pie Chart'
                  : k === CustomGraphicsNameType.RingChart
                    ? 'Donut Chart'
                    : 'Image URL'}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
