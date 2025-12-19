import * as React from 'react'
import { Box, Typography, Alert } from '@mui/material'
import PieChartIcon from '@mui/icons-material/PieChart'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

export type CustomGraphicKind =
  | typeof CustomGraphicsNameType.PieChart
  | typeof CustomGraphicsNameType.RingChart

interface SelectTypeStepProps {
  selectedKind: CustomGraphicKind
  onKindChange: (kind: CustomGraphicKind) => void
  hasNumericProperties?: boolean
}

export const SelectTypeStep: React.FC<SelectTypeStepProps> = ({
  selectedKind,
  onKindChange,
  hasNumericProperties = true,
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
          opacity: hasNumericProperties ? 1 : 0.5,
          pointerEvents: hasNumericProperties ? 'auto' : 'none',
        }}
      >
        {(
          [
            CustomGraphicsNameType.PieChart,
            CustomGraphicsNameType.RingChart,
          ] as const
        ).map((k) => {
          const selected = selectedKind === k
          const Icon =
            k === CustomGraphicsNameType.PieChart
              ? PieChartIcon
              : DonutLargeIcon
          return (
            <Box
              key={k}
              onClick={() => hasNumericProperties && onKindChange(k)}
              sx={{
                cursor: hasNumericProperties ? 'pointer' : 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 1,
                borderRadius: 2,
                border: selected ? 2 : 1,
                borderColor: selected ? 'primary.main' : 'grey.300',
                bgcolor: selected ? 'action.selected' : 'transparent',
                '&:hover': hasNumericProperties ? { opacity: 0.8 } : {},
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
                  : 'Donut Chart'}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
