import { Button, ButtonGroup, Tooltip } from '@mui/material'
import {
  IconBan,
  IconCircle,
  IconFileText,
  IconPlayerPlay,
  IconTarget,
} from '@tabler/icons-react'

import { compactButtonSx } from '@/features/TableDataLoader/components/compactButtonSx'
import { ColumnAssignmentType } from '../../model/ColumnAssignmentType'
import { columnAssingmentType2Label } from '../../model/impl/CreateNetworkFromTable'

export interface ColumnMeaningFormProps {
  value: ColumnAssignmentType
  onChange: (nextValue: ColumnAssignmentType) => void
  validValues: ColumnAssignmentType[]
}

export const columnMeaningIconMap = {
  [ColumnAssignmentType.EdgeAttribute]: (
    <IconFileText height={20} width={30} color="purple" />
  ),
  [ColumnAssignmentType.SourceNode]: (
    <IconCircle height={20} width={30} color="green" />
  ),
  [ColumnAssignmentType.TargetNode]: <IconTarget size={20} color="orange" />,
  [ColumnAssignmentType.TargetNodeAttribute]: (
    <IconFileText size={20} color="orange" />
  ),
  [ColumnAssignmentType.SourceNodeAttribute]: (
    <IconFileText size={20} color="green" />
  ),
  [ColumnAssignmentType.InteractionType]: (
    <IconPlayerPlay size={20} color="green" />
  ),
  [ColumnAssignmentType.NotImported]: <IconBan size={20} color="gray" />,
}

export function ColumnAssignmentTypeRenderCompact(props: {
  value: ColumnAssignmentType
}) {
  return (
    <Tooltip title={columnAssingmentType2Label[props.value]}>
      <Button size="small" variant="outlined" sx={compactButtonSx}>
        {columnMeaningIconMap[props.value]}
      </Button>
    </Tooltip>
  )
}

export function ColumnAssignmentTypeForm(props: ColumnMeaningFormProps) {
  const { value, onChange, validValues } = props

  return (
    <ButtonGroup size="small" variant="outlined">
      {Object.values(ColumnAssignmentType).map((v) => {
        return (
          <Tooltip key={v} title={columnAssingmentType2Label[v]}>
            <span>
              <Button
                sx={{
                  ...compactButtonSx,
                  opacity: !validValues.includes(v) ? 0.2 : 1,
                  backgroundColor: v === value ? 'action.selected' : 'transparent',
                }}
                disabled={!validValues.includes(v)}
                onClick={() => onChange(v)}
                variant="outlined"
                size="small"
              >
                {columnMeaningIconMap[v]}
              </Button>
            </span>
          </Tooltip>
        )
      })}
    </ButtonGroup>
  )
}

export function ColumnAssignmentTypeRender(props: {
  value: ColumnAssignmentType
}) {
  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={columnMeaningIconMap[props.value]}
      sx={{ ...compactButtonSx, justifyContent: 'flex-start' }}
    >
      {columnAssingmentType2Label[props.value]}
    </Button>
  )
}
