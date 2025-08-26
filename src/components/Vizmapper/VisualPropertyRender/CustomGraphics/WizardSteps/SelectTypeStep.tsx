import * as React from 'react'
import { Box, Typography } from '@mui/material'
import PieChartIcon from '@mui/icons-material/PieChart'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'

export type ChartKind =
  | typeof CustomGraphicsNameType.PieChart
  | typeof CustomGraphicsNameType.RingChart

interface SelectTypeStepProps {
  selectedKind: ChartKind
  onKindChange: (kind: ChartKind) => void
}

export const SelectTypeStep: React.FC<SelectTypeStepProps> = ({
  selectedKind,
  onKindChange,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        py: 4,
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
          k === CustomGraphicsNameType.PieChart ? PieChartIcon : DonutLargeIcon
        return (
          <Box
            key={k}
            onClick={() => onKindChange(k)}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 1,
              borderRadius: 2,
              border: selected ? 2 : 1,
              borderColor: selected ? 'primary.main' : 'grey.300',
              bgcolor: selected ? 'action.selected' : 'transparent',
              '&:hover': { opacity: 0.8 },
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
                : 'Ring Chart'}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
