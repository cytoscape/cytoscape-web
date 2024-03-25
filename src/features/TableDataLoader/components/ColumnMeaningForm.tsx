import { Button, Tooltip } from '@mantine/core'
import {
  IconBan,
  IconCircle,
  IconFileText,
  IconPlayerPlay,
  IconTarget,
} from '@tabler/icons-react'
import { ColumnAssignmentType } from '../model/ColumnAssignmentType'
import { columnAssingmentType2Label } from '../model/impl/CreateNetworkFromTable'

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
    <Tooltip label={columnAssingmentType2Label[props.value]}>
      <Button
        justify="flex-start"
        size="compact-xs"
        leftSection={columnMeaningIconMap[props.value]}
        variant="default"
      ></Button>
    </Tooltip>
  )
}

export function ColumnAssignmentTypeForm(props: ColumnMeaningFormProps) {
  const { value, onChange, validValues } = props

  return (
    <Button.Group>
      {Object.values(ColumnAssignmentType).map((v) => {
        return (
          <Tooltip key={v} label={columnAssingmentType2Label[v]}>
            <Button
              style={{ opacity: !validValues.includes(v) ? 0.2 : 1 }}
              disabled={!validValues.includes(v)}
              onClick={() => onChange(v)}
              bg={v === value ? '#D6D6D6' : 'white'}
              justify="flex-start"
              size="compact-xs"
              leftSection={columnMeaningIconMap[v]}
              variant="default"
            ></Button>
          </Tooltip>
        )
      })}
    </Button.Group>
  )
}

export function ColumnAssignmentTypeRender(props: {
  value: ColumnAssignmentType
}) {
  return (
    <Button
      justify="flex-start"
      size="compact-xs"
      leftSection={columnMeaningIconMap[props.value]}
      variant="default"
    >
      {columnAssingmentType2Label[props.value]}
    </Button>
  )
}
